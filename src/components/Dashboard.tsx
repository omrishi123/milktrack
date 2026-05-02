'use client';

import React, { useState, useEffect } from 'react';
import { Customer, MilkEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, Users, Search, TrendingUp, DollarSign, Droplets, MapPin, Phone, Edit2, Save, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface DashboardProps {
  customers: Customer[];
  milkEntries: MilkEntry[];
  onAddCustomer: (data: Omit<Customer, 'ownerId'>) => void;
  onUpdateCustomer: (id: string, data: Partial<Customer>) => void;
  onDeleteCustomer: (id: string, name: string) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export default function Dashboard({ customers, milkEntries, onAddCustomer, onUpdateCustomer, onDeleteCustomer, onSelectCustomer }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (customers.length === 0) {
      setActiveTab('add');
    } else {
      setActiveTab('list');
    }
  }, [customers.length]);

  const formatPhoneNumber = (num: string) => {
    const clean = num.trim();
    if (!clean) return undefined;
    // If it already has a country code, return as is
    if (clean.startsWith('+')) return clean;
    // Otherwise prepend +91 for Indian numbers
    return `+91${clean.replace(/\s+/g, '')}`;
  };

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const totalDue = milkEntries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
  const monthlyMilk = milkEntries.filter(e => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.milkQuantity, 0);
  const monthlyRevenue = milkEntries.filter(e => e.date.startsWith(monthKey) && e.paid).reduce((sum, e) => sum + e.total, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddCustomer({ 
        name: name.trim(), 
        phoneNumber: formatPhoneNumber(phoneNumber), 
        address: address.trim() || undefined 
      });
      setName('');
      setPhoneNumber('');
      setAddress('');
      setActiveTab('list');
    }
  };

  const handleEditClick = (c: Customer) => {
    setEditingCustomer({ ...c });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingCustomer && editingCustomer.id) {
      onUpdateCustomer(editingCustomer.id, {
        name: editingCustomer.name,
        phoneNumber: editingCustomer.phoneNumber ? formatPhoneNumber(editingCustomer.phoneNumber) : undefined,
        address: editingCustomer.address
      });
      setIsEditOpen(false);
      setEditingCustomer(null);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phoneNumber && c.phoneNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <Users className="h-5 w-5 text-primary mb-2" />
          <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Total Customers</h3>
          <p className="text-2xl font-black text-primary">{customers.length}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <DollarSign className="h-5 w-5 text-red-600 mb-2" />
          <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Total Due</h3>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">₹{totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <Droplets className="h-5 w-5 text-blue-600 mb-2" />
          <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Monthly Milk</h3>
          <p className="text-2xl font-black text-blue-600 dark:text-red-400">{monthlyMilk.toFixed(1)} L</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <TrendingUp className="h-5 w-5 text-emerald-600 mb-2" />
          <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Monthly Cash</h3>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{monthlyRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex p-1 bg-muted rounded-xl gap-1 no-print">
        <button 
          onClick={() => setActiveTab('list')} 
          className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all", activeTab === 'list' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          <Users className="h-4 w-4" /> Your Customers
        </button>
        <button 
          onClick={() => setActiveTab('add')} 
          className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all", activeTab === 'add' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          <UserPlus className="h-4 w-4" /> Add New Customer
        </button>
      </div>

      {activeTab === 'list' && (
        <Card className="border shadow-md overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Active Clients</CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search name or phone..." className="pl-9 h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredCustomers.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto"><Users className="h-8 w-8 text-muted-foreground" /></div>
                  <p className="text-muted-foreground font-medium">{searchTerm ? "No customers match your search." : "No customers found. Add your first customer!"}</p>
                </div>
              ) : (
                filteredCustomers.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                    <button className="flex-grow text-left flex flex-col" onClick={() => onSelectCustomer(c)}>
                      <span className="font-bold text-lg group-hover:text-primary transition-colors">{c.name}</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        {c.phoneNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phoneNumber}</span>}
                        {c.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.address}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 no-print" onClick={(e) => { e.stopPropagation(); handleEditClick(c); }}>
                        <Edit2 className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 no-print" onClick={(e) => { e.stopPropagation(); onDeleteCustomer(c.id!, c.name); }}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => onSelectCustomer(c)}>View Bills</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'add' && (
        <Card className="border shadow-md bg-card">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Register New Customer</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customer-name" className="text-sm font-bold">Full Name *</Label>
                <Input id="customer-name" placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-lg" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone" className="text-sm font-bold">Phone Number</Label>
                <Input id="customer-phone" placeholder="e.g. 9876543210 (Country code +91 added automatically)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-address" className="text-sm font-bold">Full Address (For Invoices)</Label>
                <Input id="customer-address" placeholder="Street, House No., City" value={address} onChange={(e) => setAddress(e.target.value)} className="h-12" />
              </div>
              <div className="md:col-span-2 pt-4">
                <Button type="submit" className="w-full h-14 text-xl font-black shadow-lg shadow-primary/20">
                  Register & Create Customer Profile
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4 italic">
                  * Name is required. Phone and Address recommended for professional billing.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Customer Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Customer Details</DialogTitle>
            <DialogDescription>Update the contact information for this client.</DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingCustomer.name}
                  onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  placeholder="e.g. 9876543210"
                  value={editingCustomer.phoneNumber || ''}
                  onChange={e => setEditingCustomer({...editingCustomer, phoneNumber: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editingCustomer.address || ''}
                  onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-primary">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
