
'use client';

import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, Firestore } from 'firebase/firestore';
import { Customer, MilkEntry, AppSettings } from '@/lib/types';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import HistoryTable from './HistoryTable';
import EntryForm from './EntryForm';
import PaymentForm from './PaymentForm';
import AiInsights from './AiInsights';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer, Download, Sparkles } from 'lucide-react';

interface CustomerDetailProps {
  customer: Customer;
  entries: MilkEntry[];
  settings: AppSettings;
  onBack: () => void;
  db: Firestore;
  userId: string;
}

export default function CustomerDetail({ customer, entries, settings, onBack, db, userId }: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState<'entry' | 'payment' | 'history' | 'ai'>('entry');

  const handleAddEntry = (entryData: Omit<MilkEntry, 'id' | 'ownerId'>) => {
    const ref = collection(db, 'users', userId, 'entries');
    const data = {
      ...entryData,
      ownerId: userId
    };
    addDoc(ref, data).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleMarkPaid = async (fromDate: string, toDate: string) => {
    const entriesToUpdate = entries.filter(e => e.date >= fromDate && e.date <= toDate && !e.paid);
    for (const entry of entriesToUpdate) {
      if (!entry.id) continue;
      const ref = doc(db, 'users', userId, 'entries', entry.id);
      updateDoc(ref, { paid: true }).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: { paid: true },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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
      <div className="flex flex-wrap justify-between items-center gap-4 no-print">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-center text-[var(--heading-color)]">{customer.name}</h2>

      <nav className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg no-print">
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'entry' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('entry')}
        >
          Add Entry
        </button>
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'payment' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('payment')}
        >
          Payments
        </button>
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'history' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-background shadow-sm text-amber-600' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('ai')}
        >
          <Sparkles className="h-4 w-4" /> AI Insights
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

      <div className={activeTab === 'ai' ? '' : 'hidden'}>
        <AiInsights 
          customerName={customer.name} 
          entries={entries} 
        />
      </div>

      <div id="print-area" className="hidden print:block">
        <div className="text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold">{settings.sellerName || 'Milk Tracker Pro'}</h1>
          <p className="text-lg">Customer: {customer.name}</p>
          <p>Date: {new Date().toLocaleDateString()}</p>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Time</th>
              <th className="border p-2 text-left">Qty (L)</th>
              <th className="border p-2 text-left">Total (₹)</th>
              <th className="border p-2 text-left">Status</th>
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
