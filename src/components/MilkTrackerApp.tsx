'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import CustomerDetail from '@/components/CustomerDetail';
import SettingsModal from '@/components/SettingsModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Settings as SettingsIcon, LogOut, Loader2 } from 'lucide-react';
import { Customer, MilkEntry, AppSettings } from '@/lib/types';

export default function MilkTrackerApp() {
  const { user, loading: authLoading, signOut } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-detail'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Firestore Queries - Stabilized with useMemo to prevent infinite loops
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

  const { data: customers = [], loading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: milkEntries = [], loading: entriesLoading } = useCollection<MilkEntry>(entriesQuery);
  const { data: settingsData, loading: settingsLoading } = useDoc<AppSettings>(settingsRef);

  const settings = settingsData || { sellerName: '', defaultPrice: 0, darkMode: false, ownerId: user?.uid || '' };

  // Handle Dark Mode Theme
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
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
    deleteDoc(customerRef);
    toast({ title: "Customer Deleted", description: `Removed ${name}.` });
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    if (!settingsRef) return;
    setDoc(settingsRef, { ...newSettings, ownerId: user.uid }, { merge: true });
    toast({ title: "Settings Saved", description: "Application preferences updated." });
  };

  return (
    <div className="container mx-auto px-4 pb-12">
      <header className="flex justify-between items-center mb-8 no-print pt-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-[var(--heading-color)] m-0">Milk Tracker</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
            <SettingsIcon className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
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
          onBack={() => { setCurrentView('dashboard'); setSelectedCustomer(null); }}
          db={db!}
          userId={user.uid}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
      <Toaster />
    </div>
  );
}
