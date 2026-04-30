
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import CustomerDetail from '@/components/CustomerDetail';
import SettingsModal from '@/components/SettingsModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Settings as SettingsIcon, LogOut } from 'lucide-react';
import { Customer, MilkEntry, AppSettings } from '@/lib/types';

export default function MilkTrackerApp() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-detail'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Firestore Queries
  const customersQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'customers'), orderBy('name'));
  }, [db, user]);

  const entriesQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'entries'), orderBy('date', 'desc'));
  }, [db, user]);

  const settingsRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'settings', 'config');
  }, [db, user]);

  const { data: customers = [] } = useCollection<Customer>(customersQuery);
  const { data: milkEntries = [] } = useCollection<MilkEntry>(entriesQuery);
  const { data: settingsData } = useDoc<AppSettings>(settingsRef);

  const settings = settingsData || { sellerName: '', defaultPrice: 0, darkMode: false, ownerId: user?.uid || '' };

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  if (authLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <AuthPage />;

  const handleAddCustomer = (name: string) => {
    if (customers.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Error", description: "Customer already exists.", variant: "destructive" });
      return;
    }
    const ref = collection(db!, 'users', user.uid, 'customers');
    addDoc(ref, { name, ownerId: user.uid });
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    const customerRef = doc(db!, 'users', user.uid, 'customers', id);
    await deleteDoc(customerRef);
    // Also delete associated entries
    const entriesToDelete = milkEntries.filter(e => e.customerName === name);
    for (const entry of entriesToDelete) {
      await deleteDoc(doc(db!, 'users', user.uid, 'entries', entry.id!));
    }
    toast({ title: "Customer Deleted", description: `Removed ${name} and all data.` });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto">
        <header className="flex justify-between items-center mb-8 no-print">
          <h1 className="text-2xl font-bold text-[var(--heading-color)]">Milk Tracker</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => useUser().signOut()}>
              <LogOut className="h-6 w-6" />
            </Button>
          </div>
        </header>

        {currentView === 'dashboard' ? (
          <Dashboard
            customers={customers}
            milkEntries={milkEntries}
            onAddCustomer={handleAddCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onSelectCustomer={(c) => { setSelectedCustomer(c); setCurrentView('customer-detail'); }}
          />
        ) : selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            entries={milkEntries.filter(e => e.customerName === selectedCustomer.name)}
            settings={settings}
            onBack={() => setCurrentView('dashboard')}
            db={db!}
            userId={user.uid}
          />
        )}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={(s) => setDoc(settingsRef!, { ...s, ownerId: user.uid }, { merge: true })}
        />
      </div>
      <Toaster />
    </div>
  );
}
