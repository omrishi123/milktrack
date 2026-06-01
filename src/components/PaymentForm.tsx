"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    <Card>
      <CardHeader>
        <CardTitle>Update Payment Status</CardTitle>
        <CardDescription>
          Mark all entries for <strong>{customerName}</strong> within this range as paid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 flex flex-col">
            <Label>From Date (Kab se)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-black h-12",
                    !from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {from ? format(parseISO(from), "dd/MM/yyyy") : <span>Select Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(from)}
                  onSelect={(d) => d && setFrom(d.toISOString().split('T')[0])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2 flex flex-col">
            <Label>To Date (Kab tak)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-black h-12",
                    !to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {to ? format(parseISO(to), "dd/MM/yyyy") : <span>Select End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(to)}
                  onSelect={(d) => d && setTo(d.toISOString().split('T')[0])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button type="submit" variant="default" className="md:col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-xl font-black shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="mr-2 h-6 w-6" /> Mark as Paid
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
