"use client";

import React, { useState } from 'react';
import { Customer, MilkEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Users, Wallet, Droplets, Trash2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DashboardProps {
  customers: Customer[];
  milkEntries: MilkEntry[];
  onAddCustomer: (name: string) => void;
  onDeleteCustomer: (id: string) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export default function Dashboard({
  customers,
  milkEntries,
  onAddCustomer,
  onDeleteCustomer,
  onSelectCustomer,
}: DashboardProps) {
  const [newCustomerName, setNewCustomerName] = useState('');

  const totalDue = milkEntries
    .filter((e) => !e.paid)
    .reduce((acc, curr) => acc + curr.total, 0);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyMilk = milkEntries
    .filter((e) => e.date.startsWith(currentMonthKey))
    .reduce((acc, curr) => acc + curr.milkQuantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomerName.trim()) {
      onAddCustomer(newCustomerName.trim());
      setNewCustomerName('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Due (All)</CardTitle>
            <Wallet className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalDue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Milk This Month</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyMilk.toFixed(2)} L</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Customer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Customer</CardTitle>
          <CardDescription>Register a new client to start tracking their milk deliveries.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              placeholder="Enter full name"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" /> Save Customer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {customers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No customers yet. Add your first one above!</p>
            ) : (
              customers.map((customer) => {
                const customerDue = milkEntries
                  .filter((e) => e.customerName === customer.name && !e.paid)
                  .reduce((acc, curr) => acc + curr.total, 0);

                return (
                  <div key={customer.id} className="flex items-center justify-between py-4 group">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectCustomer(customer)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{customer.name}</span>
                        {customerDue > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            Due: ₹{customerDue.toFixed(0)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteCustomer(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onSelectCustomer(customer)}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}