'use client';

import React, { useState, useMemo } from 'react';
import { doc, deleteDoc, Firestore } from 'firebase/firestore';
import { MilkEntry } from '@/lib/types';
import { Trash2, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MilkChart from './MilkChart';

interface HistoryTableProps {
  entries: MilkEntry[];
  db: Firestore;
  userId: string;
  customerName: string;
}

export default function HistoryTable({ entries, db, userId }: HistoryTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const months = useMemo(() => {
    const mSet = new Set(entries.map(e => e.date.substring(0, 7)));
    return Array.from(mSet).sort().reverse();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => 
      (!search || e.date.includes(search)) &&
      (statusFilter === 'all' || (statusFilter === 'paid' && e.paid) || (statusFilter === 'unpaid' && !e.paid)) &&
      (monthFilter === 'all' || e.date.startsWith(monthFilter))
    );
  }, [entries, search, statusFilter, monthFilter]);

  const totalDue = useMemo(() => {
    return filtered.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (confirm("Delete this entry?")) {
      deleteDoc(doc(db, 'users', userId, 'entries', id));
    }
  };

  return (
    <div className="card space-y-6">
      <div className="history-controls no-print">
        <div className="form-group flex-1">
          <label>Search by Date</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-10" 
              placeholder="YYYY-MM-DD" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>
        <div className="form-group flex-1">
          <label>Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="form-group flex-1">
          <label>Month</label>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(m => (
                <SelectItem key={m} value={m}>
                  {new Date(m + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="table-container border rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[var(--table-header-bg)]">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Time</th>
              <th className="p-4">Milk (L)</th>
              <th className="p-4">Total (₹)</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">No entries found.</td>
              </tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">{e.date}</td>
                  <td className="p-4">{e.timeOfDay}</td>
                  <td className="p-4">{e.milkQuantity.toFixed(2)}</td>
                  <td className="p-4">₹{e.total.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`status-${e.paid ? 'paid' : 'unpaid'}`}>
                      {e.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="p-4 text-right no-print">
                    <button onClick={() => handleDelete(e.id!)} className="text-destructive hover:scale-110 transition-transform">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="summary-box">
        <div className="summary-display">Current Due: ₹{totalDue.toFixed(2)}</div>
      </div>

      <div className="pt-6 border-t no-print">
        <h3 className="text-lg font-bold mb-4 text-center">Consumption Trend</h3>
        <div className="h-[300px]">
          <MilkChart entries={entries} />
        </div>
      </div>
    </div>
  );
}
