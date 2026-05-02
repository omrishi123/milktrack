
'use client';

import React, { useState } from 'react';
import { Customer, MilkEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface DashboardProps {
  customers: Customer[];
  milkEntries: MilkEntry[];
  onAddCustomer: (data: Omit<Customer, 'ownerId'>) => void;
  onDeleteCustomer: (id: string, name: string) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export default function Dashboard({ customers, milkEntries, onAddCustomer, onDeleteCustomer, onSelectCustomer }: DashboardProps) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  const totalDue = milkEntries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyMilk = milkEntries.filter(e => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.milkQuantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddCustomer({ 
        name: name.trim(), 
        phoneNumber: phoneNumber.trim() || undefined, 
        address: address.trim() || undefined 
      });
      setName('');
      setPhoneNumber('');
      setAddress('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Total Customers</h3>
          <p>{customers.length}</p>
        </div>
        <div className="summary-card">
          <h3>Total Due (All)</h3>
          <p>₹{totalDue.toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h3>Milk This Month</h3>
          <p>{monthlyMilk.toFixed(2)} L</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customer-name">Full Name *</Label>
              <Input
                id="customer-name"
                placeholder="Enter customer full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone Number (Optional)</Label>
              <Input
                id="customer-phone"
                placeholder="Mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">Address (Optional)</Label>
              <Input
                id="customer-address"
                placeholder="Customer home address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 pt-2">
              <Button type="submit" className="w-full h-12 text-lg font-bold">
                Save Customer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Your Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3" id="customer-dashboard-list">
            {customers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No customers yet.</p>
            ) : (
              customers.map(c => (
                <div key={c.id} className="flex gap-2 group">
                  <Button
                    variant="outline"
                    className="flex-grow text-left justify-between h-auto py-4 px-6 text-lg border-primary/20 hover:border-primary"
                    onClick={() => onSelectCustomer(c)}
                  >
                    <span>{c.name}</span>
                    {c.phoneNumber && <span className="text-xs text-muted-foreground ml-2">{c.phoneNumber}</span>}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-auto w-14 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${c.name} and all data?`)) {
                        onDeleteCustomer(c.id!, c.name);
                      }
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
