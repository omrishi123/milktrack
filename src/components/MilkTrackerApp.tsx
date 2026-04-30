"use client";

import React, { useState, useEffect } from 'react';
import { Customer, MilkEntry, AppSettings } from '@/lib/types';
import Dashboard from '@/components/Dashboard';
import CustomerDetail from '@/components/CustomerDetail';
import SettingsView from '@/components/SettingsView';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Moon, Sun, Settings, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MilkTrackerApp() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [milkEntries, setMilkEntries] = useState<MilkEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    sellerName: '',
    defaultPrice: 0,
    darkMode: false,
  });
  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-detail' | 'settings'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  // Initialization & Persistence
  useEffect(() => {
    const savedCustomers = localStorage.getItem('mt_customers');
    const savedEntries = localStorage.getItem('mt_entries');
    const savedSettings = localStorage.getItem('mt_settings');

    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
    if (savedEntries) setMilkEntries(JSON.parse(savedEntries));
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      if (parsed.darkMode) document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mt_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('mt_entries', JSON.stringify(milkEntries));
  }, [milkEntries]);

  useEffect(() => {
    localStorage.setItem('mt_settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const addCustomer = (name: string) => {
    if (customers.find((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Error", description: "Customer already exists.", variant: "destructive" });
      return;
    }
    const newCustomer = { id: crypto.randomUUID(), name };
    setCustomers([...customers, newCustomer]);
    toast({ title: "Success", description: `Customer ${name} added.` });
  };

  const deleteCustomer = (id: string) => {
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;
    setCustomers(customers.filter((c) => c.id !== id));
    setMilkEntries(milkEntries.filter((e) => e.customerName !== customer.name));
    toast({ title: "Success", description: "Customer deleted." });
  };

  const addEntry = (entry: Omit<MilkEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now() };
    setMilkEntries([...milkEntries, newEntry]);
    toast({ title: "Entry Added", description: `${entry.milkQuantity}L for ${entry.customerName}` });
  };

  const deleteEntry = (id: number) => {
    setMilkEntries(milkEntries.filter((e) => e.id !== id));
    toast({ title: "Entry Deleted" });
  };

  const updateEntry = (updated: MilkEntry) => {
    setMilkEntries(milkEntries.map((e) => (e.id === updated.id ? updated : e)));
    toast({ title: "Entry Updated" });
  };

  const markAsPaid = (customerName: string, fromDate: string, toDate: string) => {
    setMilkEntries(milkEntries.map((e) => {
      if (e.customerName === customerName && e.date >= fromDate && e.date <= toDate) {
        return { ...e, paid: true };
      }
      return e;
    }));
    toast({ title: "Payments Updated", description: "Entries in range marked as paid." });
  };

  const toggleDarkMode = () => {
    setSettings({ ...settings, darkMode: !settings.darkMode });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-[1000px]">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <Package2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary tracking-tight">Milk Tracker Pro</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('settings')}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Content Rendering */}
        {currentView === 'dashboard' && (
          <Dashboard
            customers={customers}
            milkEntries={milkEntries}
            onAddCustomer={addCustomer}
            onDeleteCustomer={deleteCustomer}
            onSelectCustomer={(c) => {
              setSelectedCustomer(c);
              setCurrentView('customer-detail');
            }}
          />
        )}

        {currentView === 'customer-detail' && selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            entries={milkEntries.filter((e) => e.customerName === selectedCustomer.name)}
            settings={settings}
            onBack={() => setCurrentView('dashboard')}
            onAddEntry={addEntry}
            onDeleteEntry={deleteEntry}
            onUpdateEntry={updateEntry}
            onMarkAsPaid={markAsPaid}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            settings={settings}
            onSave={(newSettings) => {
              setSettings(newSettings);
              setCurrentView('dashboard');
              toast({ title: "Settings Saved" });
            }}
            onCancel={() => setCurrentView('dashboard')}
            onResetData={() => {
              setCustomers([]);
              setMilkEntries([]);
              localStorage.clear();
              toast({ title: "All Data Reset" });
            }}
          />
        )}
      </div>
      <Toaster />
    </div>
  );
}