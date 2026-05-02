"use client";

import React, { useState } from 'react';
import { MilkEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EntryFormProps {
  customerName: string;
  defaultPrice: number;
  onAdd: (entry: Omit<MilkEntry, 'id'>) => void;
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
    
    // Reset defaults but keep price and date for convenience
    setQuantity('1');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Daily Milk Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time of Day</Label>
            <Select value={timeOfDay} onValueChange={(val: any) => setTimeOfDay(val)}>
              <SelectTrigger id="time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning">Morning</SelectItem>
                <SelectItem value="Evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Milk Quantity (Liters)</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 2.25"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price per Liter (₹)</Label>
            <Input
              id="price"
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="md:col-span-2 w-full h-12 text-lg">
            Record Delivery
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
