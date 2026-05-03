
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import CustomerDetail from '@/components/CustomerDetail';
import SettingsPage from '@/components/SettingsPage';
import ProfilePage from '@/components/ProfilePage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Settings as SettingsIcon, User as UserIcon, Loader2, Home, Droplets } from 'lucide-react';
import { Customer, MilkEntry, AppSettings, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MilkTrackerApp() {
  const { user, loading: authLoading, signOut } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-detail' | 'profile' | 'settings'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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
  
  // Merge Firestore profile with base user info to ensure email is always present
  const profile = useMemo(() => {
    return {
      email: user?.email || '',
      displayName: user?.displayName || '',
      ...profileData
    };
  }, [user, profileData]);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading Your Dashboard...</p>
      </div>
    );
  }

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

  const handleUpdateCustomer = (id: string, customerData: Partial<Customer>) => {
    const ref = doc(db!, 'users', user.uid, 'customers', id);
    updateDoc(ref, customerData).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'update',
        requestResourceData: customerData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    toast({ title: "Customer Updated", description: "Details updated successfully." });
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
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setCurrentView('dashboard')}
        >
          {profile.businessLogoBase64 ? (
            <div className="h-10 w-10 overflow-hidden rounded-lg shadow-md border-2 border-primary/20 bg-white p-1">
               <img src={profile.businessLogoBase64} alt="Brand Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Droplets className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--heading-color)] m-0">
              {settings.sellerName || 'Milk Tracker'}
            </h1>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest -mt-1">Professional Edition</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentView !== 'dashboard' && (
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('dashboard')} className="rounded-full">
              <Home className="h-5 w-5" />
            </Button>
          )}
          <Button 
            variant={currentView === 'settings' ? 'secondary' : 'ghost'} 
            size="icon" 
            onClick={() => setCurrentView('settings')} 
            className="rounded-full"
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
          <button 
            onClick={() => setCurrentView('profile')} 
            className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-colors border shadow-sm ${currentView === 'profile' ? 'bg-secondary' : 'hover:bg-muted'}`}
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

      <main className="min-h-[60vh]">
        {currentView === 'dashboard' && (
          <Dashboard
            customers={customers}
            milkEntries={milkEntries}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onSelectCustomer={(c) => { setSelectedCustomer(c); setCurrentView('customer-detail'); }}
          />
        )}

        {currentView === 'customer-detail' && selectedCustomer && (
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

        {currentView === 'profile' && (
          <ProfilePage
            profile={profile}
            onSave={handleSaveProfile}
            onSignOut={() => signOut()}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'settings' && (
          <SettingsPage
            settings={settings}
            onSave={handleSaveSettings}
            customers={customers}
            milkEntries={milkEntries}
            db={db!}
            userId={user.uid}
            onBack={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      <Toaster />
    </div>
  );
}
