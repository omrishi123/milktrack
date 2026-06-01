'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, addDoc, setDoc, deleteDoc, updateDoc, query, orderBy, collectionGroup, where, getDoc } from 'firebase/firestore';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import CustomerDetail from '@/components/CustomerDetail';
import SettingsPage from '@/components/SettingsPage';
import ProfilePage from '@/components/ProfilePage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User as UserIcon, Loader2, Home, Droplets, ShoppingBag } from 'lucide-react';
import { Customer, MilkEntry, AppSettings, UserProfile, CustomerPurchase } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sanitizePhoneNumber } from '@/lib/utils';

export default function MilkTrackerApp() {
  const { user, loading: authLoading, signOut } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-detail' | 'profile' | 'settings'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [purchaseData, setPurchaseData] = useState<CustomerPurchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Queries for the Dairy Owner
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
  const { data: profileData, loading: profileLoading } = useDoc<UserProfile>(profileRef);

  const settings = settingsData || { sellerName: '', defaultPrice: 0, darkMode: false, ownerId: user?.uid || '' };
  
  const profile = useMemo(() => {
    return {
      email: user?.email || '',
      displayName: user?.displayName || '',
      mobileNumber: user?.phoneNumber || '',
      ...profileData
    };
  }, [user, profileData]);

  // Fetch Customer Portal Data (Cross-Dairy)
  useEffect(() => {
    if (!db || !user?.phoneNumber) {
      setPurchaseData([]);
      return;
    }

    setLoadingPurchases(true);
    const cleanPhone = sanitizePhoneNumber(user.phoneNumber);
    
    // Use collectionGroup to find entries where this user is the customer
    const q = query(collectionGroup(db, 'entries'), where('customerPhoneNumber', '==', cleanPhone));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const grouped: Record<string, MilkEntry[]> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as MilkEntry;
        const ownerId = data.ownerId;
        if (!grouped[ownerId]) grouped[ownerId] = [];
        grouped[ownerId].push({ ...data, id: doc.id });
      });

      const processed: CustomerPurchase[] = [];
      for (const ownerId of Object.keys(grouped)) {
        // Fetch owner profile and settings for branding/payment
        const pRef = doc(db, 'users', ownerId, 'profile', 'data');
        const sRef = doc(db, 'users', ownerId, 'settings', 'config');
        
        const [pSnap, sSnap] = await Promise.all([getDoc(pRef), getDoc(sRef)]);
        
        processed.push({
          ownerId,
          ownerProfile: pSnap.exists() ? pSnap.data() as UserProfile : undefined,
          ownerSettings: sSnap.exists() ? sSnap.data() as AppSettings : undefined,
          entries: grouped[ownerId]
        });
      }
      setPurchaseData(processed);
      setLoadingPurchases(false);
    }, (err) => {
      console.error("Portal fetch error:", err);
      setLoadingPurchases(false);
    });

    return () => unsubscribe();
  }, [db, user?.phoneNumber]);

  // Initial Redirect Logic
  useEffect(() => {
    if (!authLoading && !profileLoading && user) {
      const storageKey = `onboarding_complete_${user.uid}`;
      const hasSeenOnboarding = localStorage.getItem(storageKey);

      if (!profileData && !hasSeenOnboarding) {
        // If they are a customer but not an owner, they might not need a profile setup immediately
        // but we still want to greet them.
        if (purchaseData.length === 0) {
          setCurrentView('profile');
        }
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [authLoading, profileLoading, user, profileData, purchaseData.length]);

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
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const handleAddCustomer = (customerData: Omit<Customer, 'ownerId'>) => {
    if (customers.find(c => c.name.toLowerCase() === customerData.name.toLowerCase())) {
      toast({ title: "Error", description: "Customer already exists.", variant: "destructive" });
      return;
    }
    const cleanPhone = customerData.phoneNumber ? sanitizePhoneNumber(customerData.phoneNumber) : "";
    const ref = collection(db!, 'users', user.uid, 'customers');
    const data = { 
      ...customerData, 
      phoneSanitized: cleanPhone,
      ownerId: user.uid 
    };
    
    addDoc(ref, data).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: ref.path,
        operation: 'create',
        requestResourceData: data,
      }));
    });
    toast({ title: "Customer Added", description: `${customerData.name} saved successfully.` });
  };

  const handleUpdateCustomer = (id: string, customerData: Partial<Customer>) => {
    const cleanPhone = customerData.phoneNumber ? sanitizePhoneNumber(customerData.phoneNumber) : undefined;
    const ref = doc(db!, 'users', user.uid, 'customers', id);
    const data = { 
      ...customerData, 
      ...(cleanPhone ? { phoneSanitized: cleanPhone } : {})
    };

    updateDoc(ref, data).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: ref.path,
        operation: 'update',
        requestResourceData: data,
      }));
    });
    toast({ title: "Customer Updated", description: "Details updated successfully." });
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    const customerRef = doc(db!, 'users', user.uid, 'customers', id);
    deleteDoc(customerRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: customerRef.path,
        operation: 'delete',
      }));
    });
    toast({ title: "Customer Deleted", description: `Removed ${name}.` });
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    if (!settingsRef) return;
    const data = { ...newSettings, ownerId: user.uid };
    setDoc(settingsRef, data, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: settingsRef.path,
        operation: 'write',
        requestResourceData: data,
      }));
    });
    toast({ title: "Settings Saved", description: "Application preferences updated." });
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    if (!profileRef) return;
    const data = { ...newProfile, uid: user.uid };
    setDoc(profileRef, data, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: profileRef.path,
        operation: 'write',
        requestResourceData: data,
      }));
    });
    toast({ title: "Profile Saved", description: "Your business identity has been updated." });
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
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest -mt-1">Professional Ledger</p>
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
              <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline-block max-w-[100px] truncate">
              {profile.displayName || profile.email || 'Profile'}
            </span>
          </button>
        </div>
      </header>

      <main className="min-h-[60vh]">
        {currentView === 'dashboard' && (
          <Dashboard
            customers={customers}
            milkEntries={milkEntries}
            purchaseData={purchaseData}
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
    </div>
  );
}

// Ensure onSnapshot import
import { onSnapshot } from 'firebase/firestore';
