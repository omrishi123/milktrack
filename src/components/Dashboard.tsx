'use client';

import React, { useState } from 'react';
import { Customer, MilkEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';

interface DashboardProps {
  customers: Customer[];
  milkEntries: MilkEntry[];
  onAddCustomer: (name: string) => void;
  onDeleteCustomer: (id: string, name: string) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export default function Dashboard({ customers, milkEntries, onAddCustomer, onDeleteCustomer, onSelectCustomer }: DashboardProps) {
  const [name, setName] = useState('');

  const totalDue = milkEntries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyMilk = milkEntries.filter(e => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.milkQuantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddCustomer(name.trim());
      setName('');
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

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group grid-full-width">
            <label htmlFor="customer-name">Customer Name</label>
            <Input
              id="customer-name"
              type="text"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid-full-width">
            <Button type="submit" className="w-full btn-primary py-6 text-lg font-bold">
              Save Customer
            </Button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Your Customers</h2>
        <div className="space-y-3" id="customer-dashboard-list">
          {customers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No customers yet.</p>
          ) : (
            customers.map(c => (
              <div key={c.id} className="flex gap-2 group">
                <Button
                  variant="secondary"
                  className="flex-grow text-left justify-start h-auto py-4 px-6 text-lg"
                  onClick={() => onSelectCustomer(c)}
                >
                  {c.name}
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
      </div>
    </div>
  );
}
