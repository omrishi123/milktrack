'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import CustomerDetail from '@/components/CustomerDetail';
import SettingsModal from '@/components/SettingsModal';
import ProfileModal from '@/components/ProfileModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Settings as SettingsIcon, User as UserIcon, Loader2 } from 'lucide-react';
import { Customer, MilkEntry, AppSettings, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MilkTrackerApp() {
  const { user, loading: authLoading, signOut } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-detail'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  const profileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'profile', 'data');
  }, [db, user]);

  const { data: customers = [] } = useCollection<Customer>(customersQuery);
  const { data: milkEntries = [] } = useCollection<MilkEntry>(entriesQuery);
  const { data: settingsData } = useDoc<AppSettings>(settingsRef);
  const { data: profileData } = useDoc<UserProfile>(profileRef);

  const settings = settingsData || { sellerName: '', defaultPrice: 0, darkMode: false, ownerId: user?.uid || '' };
  const profile = profileData || { email: user?.email || '', displayName: user?.displayName || '' };

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user) return <AuthPage />;

  const handleAddCustomer = (customerData: Omit<Customer, 'ownerId'>) => {
    if (customers.find(c => c.name.toLowerCase() === customerData.name.toLowerCase())) {
      toast({ title: "Error", description: "Customer already exists.", variant: "destructive" });
      return;
    }
    const ref = collection(db!, 'users', user.uid, 'customers');
    const data = { ...customerData, ownerId: user.uid };
    
    addDoc(ref, data).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    toast({ title: "Customer Added", description: `${customerData.name} saved successfully.` });
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    const customerRef = doc(db!, 'users', user.uid, 'customers', id);
    deleteDoc(customerRef).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: customerRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    toast({ title: "Customer Deleted", description: `Removed ${name}.` });
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    if (!settingsRef) return;
    const data = { ...newSettings, ownerId: user.uid };
    setDoc(settingsRef, data, { merge: true }).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: settingsRef.path,
        operation: 'write',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    toast({ title: "Settings Saved", description: "Application preferences updated." });
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    if (!profileRef) return;
    setDoc(profileRef, newProfile, { merge: true }).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: profileRef.path,
        operation: 'write',
        requestResourceData: newProfile,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    toast({ title: "Profile Saved", description: "Your profile has been updated." });
  };

  return (
    <div className="container mx-auto px-4 pb-12">
      <header className="flex justify-between items-center mb-8 no-print pt-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-[var(--heading-color)] m-0">Milk Tracker</h1>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="rounded-full">
            <SettingsIcon className="h-5 w-5" />
          </Button>
          <button 
            onClick={() => setIsProfileOpen(true)} 
            className="flex items-center gap-2 hover:bg-muted p-1 pr-3 rounded-full transition-colors border shadow-sm"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.photoBase64} />
              <AvatarFallback>
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline-block max-w-[100px] truncate">
              {profile.displayName || 'Profile'}
            </span>
          </button>
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
          profile={profile}
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
        customers={customers}
        milkEntries={milkEntries}
        db={db!}
        userId={user.uid}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
        onSignOut={() => {
          setIsProfileOpen(false);
          signOut();
        }}
      />
      <Toaster />
    </div>
  );
}
