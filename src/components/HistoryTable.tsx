'use client';

import React, { useState, useMemo } from 'react';
import { doc, deleteDoc, updateDoc, Firestore } from 'firebase/firestore';
import { MilkEntry } from '@/lib/types';
import { Trash2, Search, Edit2, Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MilkChart from './MilkChart';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

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
  
  // Edit state
  const [editingEntry, setEditingEntry] = useState<MilkEntry | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      const entryRef = doc(db, 'users', userId, 'entries', id);
      deleteDoc(entryRef).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: entryRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    }
  };

  const handleEditClick = (entry: MilkEntry) => {
    setEditingEntry({ ...entry });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry || !editingEntry.id) return;
    
    setIsSaving(true);
    const entryRef = doc(db, 'users', userId, 'entries', editingEntry.id);
    const total = editingEntry.milkQuantity * editingEntry.price;
    const updatedData = {
      ...editingEntry,
      total
    };

    updateDoc(entryRef, updatedData)
      .then(() => {
        setIsEditOpen(false);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: entryRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
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
                    <td className="p-4 text-right no-print space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-primary hover:bg-primary/10"
                        onClick={() => handleEditClick(e)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
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

      {/* Edit Entry Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Milk Entry</DialogTitle>
            <DialogDescription>Modify the delivery details below. Totals will update automatically.</DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  className="col-span-3"
                  value={editingEntry.date}
                  onChange={e => setEditingEntry({...editingEntry, date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-time" className="text-right">Session</Label>
                <Select 
                  value={editingEntry.timeOfDay} 
                  onValueChange={(val: any) => setEditingEntry({...editingEntry, timeOfDay: val})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-qty" className="text-right">Liters</Label>
                <Input
                  id="edit-qty"
                  type="number"
                  step="any"
                  className="col-span-3"
                  value={editingEntry.milkQuantity}
                  onChange={e => setEditingEntry({...editingEntry, milkQuantity: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">Price/L</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="any"
                  className="col-span-3"
                  value={editingEntry.price}
                  onChange={e => setEditingEntry({...editingEntry, price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
