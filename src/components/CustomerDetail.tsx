"use client";

import React, { useState, useMemo } from 'react';
import { Customer, MilkEntry, AppSettings } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, Printer, Sparkles, TrendingUp } from 'lucide-react';
import EntryForm from '@/components/EntryForm';
import PaymentForm from '@/components/PaymentForm';
import HistoryTable from '@/components/HistoryTable';
import MilkChart from '@/components/MilkChart';
import AiInsights from '@/components/AiInsights';

interface CustomerDetailProps {
  customer: Customer;
  entries: MilkEntry[];
  settings: AppSettings;
  onBack: () => void;
  onAddEntry: (entry: Omit<MilkEntry, 'id'>) => void;
  onDeleteEntry: (id: number) => void;
  onUpdateEntry: (updated: MilkEntry) => void;
  onMarkAsPaid: (customerName: string, fromDate: string, toDate: string) => void;
}

export default function CustomerDetail({
  customer,
  entries,
  settings,
  onBack,
  onAddEntry,
  onDeleteEntry,
  onUpdateEntry,
  onMarkAsPaid,
}: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState('entry');

  const totalDue = useMemo(() => 
    entries.filter((e) => !e.paid).reduce((acc, curr) => acc + curr.total, 0),
  [entries]);

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    const csvContent = [
      "Date,Time,Quantity(L),Price,Total,Status",
      ...entries.map(e => `${e.date},${e.timeOfDay},${e.milkQuantity},${e.price},${e.total},${e.paid ? 'Paid' : 'Unpaid'}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customer.name}_milk_report.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <FileDown className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-primary">{customer.name}</h2>
        <p className="text-lg font-medium text-muted-foreground">
          Outstanding Balance: <span className="text-destructive font-bold">₹{totalDue.toFixed(2)}</span>
        </p>
      </div>

      <Tabs defaultValue="entry" className="w-full no-print" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="entry">Add Entry</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="mr-2 h-3 w-3 text-amber-500" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry">
          <EntryForm
            customerName={customer.name}
            defaultPrice={settings.defaultPrice}
            onAdd={onAddEntry}
          />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentForm
            customerName={customer.name}
            onMarkPaid={(from, to) => {
              onMarkAsPaid(customer.name, from, to);
              setActiveTab('history');
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryTable
            entries={entries}
            onDelete={onDeleteEntry}
            onUpdate={onUpdateEntry}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
                Consumption Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <MilkChart entries={entries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <AiInsights customerName={customer.name} entries={entries} />
        </TabsContent>
      </Tabs>

      {/* Print-only section */}
      <div className="hidden print:block space-y-6 mt-8">
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold">{settings.sellerName || 'Milk Tracker Pro'}</h1>
          <p>Invoice / Usage Report</p>
        </div>
        <div className="flex justify-between">
          <div>
            <p><strong>To:</strong> {customer.name}</p>
            <p><strong>Date Issued:</strong> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">Total Due: ₹{totalDue.toFixed(2)}</p>
          </div>
        </div>
        <HistoryTable entries={entries} isPrintView />
      </div>
    </div>
  );
}