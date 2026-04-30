
"use client";

import React, { useState } from 'react';
import { Customer, MilkEntry } from '@/lib/types';

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

  return (
    <div className="space-y-6">
      <div className="dashboard-summary">
        <div className="summary-card"><h3>Total Customers</h3><p>{customers.length}</p></div>
        <div className="summary-card"><h3>Total Due (All)</h3><p>₹{totalDue.toFixed(2)}</p></div>
        <div className="summary-card"><h3>Milk This Month</h3><p>{monthlyMilk.toFixed(2)} L</p></div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
        <form onSubmit={(e) => { e.preventDefault(); if(name) { onAddCustomer(name); setName(''); } }} className="form-grid">
          <div className="form-group grid-full-width">
            <input
              type="text"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3 rounded-lg font-bold">Save Customer</button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Your Customers</h2>
        <div className="space-y-3">
          {customers.length === 0 ? (
            <p className="text-center text-muted-foreground">No customers yet.</p>
          ) : (
            customers.map(c => (
              <div key={c.id} className="flex gap-2">
                <button
                  className="btn-secondary flex-grow text-left py-3 px-4"
                  onClick={() => onSelectCustomer(c)}
                >
                  {c.name}
                </button>
                <button
                  className="btn-danger w-12 flex items-center justify-center text-xl"
                  onClick={() => confirm(`Delete ${c.name}?`) && onDeleteCustomer(c.id!, c.name)}
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
