'use client';

import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import { Customer, MilkEntry, AppSettings } from '@/lib/types';
import HistoryTable from './HistoryTable';
import EntryForm from './EntryForm';
import PaymentForm from './PaymentForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer, Download } from 'lucide-react';

interface CustomerDetailProps {
  customer: Customer;
  entries: MilkEntry[];
  settings: AppSettings;
  onBack: () => void;
  db: Firestore;
  userId: string;
}

export default function CustomerDetail({ customer, entries, settings, onBack, db, userId }: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState<'entry' | 'payment' | 'history'>('entry');

  const handleAddEntry = (entryData: Omit<MilkEntry, 'id' | 'ownerId'>) => {
    const ref = collection(db, 'users', userId, 'entries');
    addDoc(ref, {
      ...entryData,
      ownerId: userId
    });
  };

  const handleMarkPaid = async (fromDate: string, toDate: string) => {
    const entriesToUpdate = entries.filter(e => e.date >= fromDate && e.date <= toDate && !e.paid);
    for (const entry of entriesToUpdate) {
      const ref = doc(db, 'users', userId, 'entries', entry.id!);
      updateDoc(ref, { paid: true });
    }
    setActiveTab('history');
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    let csv = "Date,Time,Milk(L),Total,Status\n";
    entries.forEach(e => csv += `${e.date},${e.timeOfDay},${e.milkQuantity},${e.total.toFixed(2)},${e.paid ? 'Paid' : 'Unpaid'}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${customer.name}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="detail-toolbar no-print">
        <Button variant="secondary" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print Report
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-center text-[var(--heading-color)]">{customer.name}</h2>

      <nav className="detail-nav no-print">
        <button 
          className={`detail-nav-btn ${activeTab === 'entry' ? 'active' : ''}`} 
          onClick={() => setActiveTab('entry')}
        >
          Add Entry
        </button>
        <button 
          className={`detail-nav-btn ${activeTab === 'payment' ? 'active' : ''}`} 
          onClick={() => setActiveTab('payment')}
        >
          Mark Payments
        </button>
        <button 
          className={`detail-nav-btn ${activeTab === 'history' ? 'active' : ''}`} 
          onClick={() => setActiveTab('history')}
        >
          History & Report
        </button>
      </nav>

      <div className={activeTab === 'entry' ? '' : 'hidden'}>
        <EntryForm 
          customerName={customer.name} 
          defaultPrice={settings.defaultPrice} 
          onAdd={handleAddEntry} 
        />
      </div>

      <div className={activeTab === 'payment' ? '' : 'hidden'}>
        <PaymentForm 
          customerName={customer.name} 
          onMarkPaid={handleMarkPaid} 
        />
      </div>

      <div className={activeTab === 'history' ? '' : 'hidden'}>
        <HistoryTable 
          entries={entries} 
          db={db} 
          userId={userId} 
          customerName={customer.name} 
        />
      </div>

      {/* Hidden Print Area */}
      <div id="print-area" className="print-only">
        <div className="text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold">{settings.sellerName || 'Milk Tracker Pro'} - Invoice</h1>
          <p className="text-lg">Customer: {customer.name}</p>
          <p>Generated on: {new Date().toLocaleDateString()}</p>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Date</th>
              <th className="border p-2">Time</th>
              <th className="border p-2">Qty (L)</th>
              <th className="border p-2">Total (₹)</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td className="border p-2">{e.date}</td>
                <td className="border p-2">{e.timeOfDay}</td>
                <td className="border p-2">{e.milkQuantity.toFixed(2)}</td>
                <td className="border p-2">{e.total.toFixed(2)}</td>
                <td className="border p-2">{e.paid ? 'Paid' : 'Unpaid'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right mt-6">
          <p className="text-xl font-bold">Total Due: ₹{entries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
