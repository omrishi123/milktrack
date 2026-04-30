"use client";

import React, { useState } from 'react';
import { MilkEntry } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Search, Filter } from 'lucide-react';

interface HistoryTableProps {
  entries: MilkEntry[];
  onDelete?: (id: number) => void;
  onUpdate?: (updated: MilkEntry) => void;
  isPrintView?: boolean;
}

export default function HistoryTable({ entries, onDelete, onUpdate, isPrintView = false }: HistoryTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = entries
    .filter((e) => {
      const matchesSearch = e.date.includes(search);
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'paid' && e.paid) || 
        (statusFilter === 'unpaid' && !e.paid);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      {!isPrintView && (
        <div className="flex flex-col md:flex-row gap-4 no-print">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by date (YYYY-MM-DD)"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
                <SelectItem value="unpaid">Unpaid Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Qty (L)</TableHead>
              <TableHead>Total (₹)</TableHead>
              <TableHead>Status</TableHead>
              {!isPrintView && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isPrintView ? 5 : 6} className="text-center h-24 text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.date}</TableCell>
                  <TableCell>{entry.timeOfDay}</TableCell>
                  <TableCell>{entry.milkQuantity.toFixed(2)}</TableCell>
                  <TableCell>₹{entry.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.paid ? "default" : "destructive"}>
                      {entry.paid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </TableCell>
                  {!isPrintView && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => onDelete?.(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}