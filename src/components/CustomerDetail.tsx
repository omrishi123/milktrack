
"use client";

import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { Customer, MilkEntry, AppSettings } from '@/lib/types';
import HistoryTable from './HistoryTable';

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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<'Morning' | 'Evening'>('Morning');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState(settings.defaultPrice.toString() || '0');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty);
    const p = parseFloat(price);
    const ref = collection(db, 'users', userId, 'entries');
    await addDoc(ref, {
      customerName: customer.name,
      date,
      timeOfDay: time,
      milkQuantity: q,
      price: p,
      total: q * p,
      paid: false,
      ownerId: userId
    });
    setQty('1');
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    const entriesToUpdate = entries.filter(e => e.date >= fromDate && e.date <= toDate);
    for (const entry of entriesToUpdate) {
      const ref = doc(db, 'users', userId, 'entries', entry.id!);
      await updateDoc(ref, { paid: true });
    }
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      <div className="detail-toolbar no-print">
        <button className="btn-secondary" onClick={onBack}>&larr; Dashboard</button>
        <button className="btn-secondary" onClick={() => window.print()}>Print Report</button>
      </div>

      <h2 className="text-3xl font-bold text-center text-[var(--heading-color)]">{customer.name}</h2>

      <nav className="detail-nav no-print">
        <button className={`detail-nav-btn ${activeTab === 'entry' ? 'active' : ''}`} onClick={() => setActiveTab('entry')}>Add Entry</button>
        <button className={`detail-nav-btn ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>Mark Payments</button>
        <button className={`detail-nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
      </nav>

      <div className={activeTab === 'entry' ? '' : 'hidden'}>
        <div className="card">
          <form onSubmit={handleAddEntry} className="form-grid">
            <div className="form-group"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="form-group">
              <label>Time</label>
              <select value={time} onChange={e => setTime(e.target.value as any)} required>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>
            <div className="form-group"><label>Milk (L)</label><input type="number" step="0.1" value={qty} onChange={e => setQty(e.target.value)} required /></div>
            <div className="form-group"><label>Price/L</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} required /></div>
            <button type="submit" className="btn-success grid-full-width py-3">Add Entry</button>
          </form>
        </div>
      </div>

      <div className={activeTab === 'payment' ? '' : 'hidden'}>
        <div className="card">
          <form onSubmit={handleMarkPaid} className="form-grid">
            <div className="form-group"><label>From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required /></div>
            <div className="form-group"><label>To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} required /></div>
            <button type="submit" className="btn-warning grid-full-width py-3">Mark as Paid</button>
          </form>
        </div>
      </div>

      <div className={activeTab === 'history' ? '' : 'hidden'}>
        <HistoryTable entries={entries} db={db} userId={userId} customerName={customer.name} />
      </div>

      {/* Print Area */}
      <div className="print-only">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{settings.sellerName || 'Milk Tracker Pro'} Invoice</h1>
          <p>Customer: {customer.name}</p>
          <p>Generated on: {new Date().toLocaleDateString()}</p>
        </div>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Time</th>
              <th className="border border-gray-300 p-2">Qty (L)</th>
              <th className="border border-gray-300 p-2">Total (₹)</th>
              <th className="border border-gray-300 p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td className="border border-gray-300 p-2">{e.date}</td>
                <td className="border border-gray-300 p-2">{e.timeOfDay}</td>
                <td className="border border-gray-300 p-2">{e.milkQuantity}</td>
                <td className="border border-gray-300 p-2">{e.total.toFixed(2)}</td>
                <td className="border border-gray-300 p-2">{e.paid ? 'Paid' : 'Unpaid'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right mt-4 font-bold text-xl">
          Total Due: ₹{entries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
}
