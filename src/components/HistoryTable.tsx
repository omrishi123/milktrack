
"use client";

import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { MilkEntry } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface HistoryTableProps {
  entries: MilkEntry[];
  db: Firestore;
  userId: string;
  customerName: string;
}

export default function HistoryTable({ entries, db, userId }: HistoryTableProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = entries.filter(e => 
    (!search || e.date.includes(search)) &&
    (status === 'all' || (status === 'paid' && e.paid) || (status === 'unpaid' && !e.paid))
  );

  const totalDue = entries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);

  const handleDelete = async (id: string) => {
    if (confirm("Delete this entry?")) {
      await deleteDoc(doc(db, 'users', userId, 'entries', id));
    }
  };

  return (
    <div className="card">
      <div className="history-controls no-print mb-4 flex gap-4">
        <input className="p-2 border rounded" placeholder="Search Date (YYYY-MM-DD)" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="p-2 border rounded" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>
      <div className="table-container">
        <table className="w-full text-left">
          <thead className="bg-[var(--table-header-bg)]">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Time</th>
              <th className="p-3">Milk (L)</th>
              <th className="p-3">Total (₹)</th>
              <th className="p-3">Status</th>
              <th className="p-3 actions-col no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b">
                <td className="p-3">{e.date}</td>
                <td className="p-3">{e.timeOfDay}</td>
                <td className="p-3">{e.milkQuantity}</td>
                <td className="p-3">₹{e.total.toFixed(2)}</td>
                <td className="p-3"><span className={`status-${e.paid?'paid':'unpaid'}`}>{e.paid?'Paid':'Unpaid'}</span></td>
                <td className="p-3 actions-col no-print">
                   <button onClick={() => handleDelete(e.id!.toString())} className="text-destructive"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="summary-box mt-6">
         <div className="summary-display">Current Due: ₹{totalDue.toFixed(2)}</div>
      </div>
    </div>
  );
}
