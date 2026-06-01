"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface PaymentFormProps {
  customerName: string;
  onMarkPaid: (fromDate: string, toDate: string) => void;
}

export default function PaymentForm({ customerName, onMarkPaid }: PaymentFormProps) {
  const [from, setFrom] = useState(new Date().toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to) {
      onMarkPaid(from, to);
    }
  };

  return (
    <Card className="border shadow-md">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-lg font-black uppercase">Update Payment Status</CardTitle>
        <CardDescription className="font-medium">
          Mark all entries for <strong>{customerName}</strong> within this range as paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="from-date" className="font-bold">From Date (Kab se)</Label>
            <Input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="h-12 font-bold"
            />
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Start: {formatDate(from)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-date" className="font-bold">To Date (Kab tak)</Label>
            <Input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="h-12 font-bold"
            />
            <p className="text-[10px] text-muted-foreground font-bold uppercase">End: {formatDate(to)}</p>
          </div>
          <Button type="submit" variant="default" className="md:col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-xl font-black shadow-lg shadow-emerald-500/20 uppercase tracking-tight">
            <CheckCircle2 className="mr-2 h-6 w-6" /> Mark as Paid
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
