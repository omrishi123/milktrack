'use client';

import React, { useState, useMemo } from 'react';
import { doc, deleteDoc, updateDoc, Firestore } from 'firebase/firestore';
import { MilkEntry } from '@/lib/types';
import { Trash2, Search, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MilkChart from './MilkChart';
import { Button } from '@/components/ui/button';

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
    if (confirm("Delete this entry permanently from the cloud?")) {
      deleteDoc(doc(db, 'users', userId, 'entries', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Search Date</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9" 
              placeholder="YYYY-MM-DD" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="unpaid">Unpaid Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Month</label>
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

      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-4 text-left font-semibold">Date</th>
                <th className="p-4 text-left font-semibold">Time</th>
                <th className="p-4 text-left font-semibold">Liters</th>
                <th className="p-4 text-left font-semibold">Total</th>
                <th className="p-4 text-left font-semibold">Status</th>
                <th className="p-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground italic">
                    No entries found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{e.date}</td>
                    <td className="p-4">{e.timeOfDay}</td>
                    <td className="p-4">{e.milkQuantity.toFixed(2)} L</td>
                    <td className="p-4 font-semibold">₹{e.total.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {e.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="p-4 text-right no-print">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(e.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-center">
        <span className="text-muted-foreground text-sm block mb-1">Total Due (Filtered)</span>
        <span className="text-2xl font-bold text-primary">₹{totalDue.toFixed(2)}</span>
      </div>

      <div className="pt-8 no-print border-t">
        <h3 className="text-lg font-bold mb-6 text-center">Consumption Trends</h3>
        <div className="h-[350px]">
          <MilkChart entries={entries} />
        </div>
      </div>
    </div>
  );
}
