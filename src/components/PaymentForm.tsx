"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface PaymentFormProps {
  customerName: string;
  onMarkPaid: (fromDate: string, toDate: string) => void;
}

export default function PaymentForm({ customerName, onMarkPaid }: PaymentFormProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to) {
      onMarkPaid(from, to);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Payment Status</CardTitle>
        <CardDescription>
          Mark all entries for <strong>{customerName}</strong> within this date range as paid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="from">From Date</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To Date</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="default" className="md:col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg">
            <CheckCircle2 className="mr-2 h-5 w-5" /> Mark as Paid
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}