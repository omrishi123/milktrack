'use client';

import React, { useState, useEffect } from 'react';
import { Customer, MilkEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, Users, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardProps {
  customers: Customer[];
  milkEntries: MilkEntry[];
  onAddCustomer: (data: Omit<Customer, 'ownerId'>) => void;
  onDeleteCustomer: (id: string, name: string) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export default function Dashboard({ customers, milkEntries, onAddCustomer, onDeleteCustomer, onSelectCustomer }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (customers.length === 0) {
      setActiveTab('add');
    } else {
      setActiveTab('list');
    }
  }, [customers.length]);

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
      setActiveTab('list');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phoneNumber && c.phoneNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl text-center shadow-sm">
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Total Customers</h3>
          <p className="text-3xl font-black text-primary">{customers.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center shadow-sm">
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Total Due (All)</h3>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹{totalDue.toFixed(2)}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl text-center shadow-sm">
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Milk This Month</h3>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{monthlyMilk.toFixed(2)} L</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-muted rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all",
            activeTab === 'list' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/50"
          )}
        >
          <Users className="h-4 w-4" />
          Your Customers
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all",
            activeTab === 'add' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/50"
          )}
        >
          <UserPlus className="h-4 w-4" />
          Add New Customer
        </button>
      </div>

      {/* Tab Content: Customer List */}
      {activeTab === 'list' && (
        <Card className="border shadow-md overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Customer Directory
              </CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name or phone..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredCustomers.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {searchTerm ? "No customers match your search." : "No customers found. Add your first customer!"}
                  </p>
                </div>
              ) : (
                filteredCustomers.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                    <button
                      className="flex-grow text-left flex flex-col"
                      onClick={() => onSelectCustomer(c)}
                    >
                      <span className="font-bold text-lg group-hover:text-primary transition-colors">{c.name}</span>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {c.phoneNumber && <span>📞 {c.phoneNumber}</span>}
                        {c.address && <span className="truncate max-w-[200px]">📍 {c.address}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomer(c.id!, c.name);
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onSelectCustomer(c)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Content: Add Customer */}
      {activeTab === 'add' && (
        <Card className="border shadow-md bg-card">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Registration Form
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customer-name" className="text-sm font-bold">Full Name *</Label>
                <Input
                  id="customer-name"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone" className="text-sm font-bold">Phone Number (Optional)</Label>
                <Input
                  id="customer-phone"
                  placeholder="+91 00000 00000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-address" className="text-sm font-bold">Home Address (Optional)</Label>
                <Input
                  id="customer-address"
                  placeholder="Street name, House No."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="md:col-span-2 pt-4">
                <Button type="submit" className="w-full h-14 text-xl font-black shadow-lg shadow-primary/20">
                  Register & Save Customer
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4 italic">
                  * Fields marked with asterisk are mandatory.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}