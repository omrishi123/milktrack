"use client";

import React, { useState } from 'react';
import { MilkEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

interface EntryFormProps {
  customerName: string;
  defaultPrice: number;
  onAdd: (entry: Omit<MilkEntry, 'id' | 'ownerId'>) => void;
}

export default function EntryForm({ customerName, defaultPrice, onAdd }: EntryFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDay, setTimeOfDay] = useState<'Morning' | 'Evening'>('Morning');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState(defaultPrice.toString() || '0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const prc = parseFloat(price);
    
    if (isNaN(qty) || qty <= 0) return;

    onAdd({
      customerName,
      date,
      timeOfDay,
      milkQuantity: qty,
      price: prc,
      total: qty * prc,
      paid: false,
    });
    
    setQuantity('1');
  };

  return (
    <Card className="border shadow-md">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-lg font-black uppercase">Add Daily Milk Entry</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="date" className="font-bold">Date (Tareekh)</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-12 font-bold"
            />
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Format: {formatDate(date)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="font-bold">Time (Samay)</Label>
            <Select value={timeOfDay} onValueChange={(val: any) => setTimeOfDay(val)}>
              <SelectTrigger id="time" className="h-12 font-bold bg-background">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning">Morning (Subah)</SelectItem>
                <SelectItem value="Evening">Evening (Shaam)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity" className="font-bold">Milk Quantity (Liters)</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 2.25"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="h-12 text-lg font-black"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price" className="font-bold">Price per Liter (₹)</Label>
            <Input
              id="price"
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="h-12 text-lg font-black"
            />
          </div>
          <Button type="submit" className="md:col-span-2 w-full h-14 text-xl font-black shadow-lg shadow-primary/20 uppercase tracking-tight">
            Record Delivery
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
