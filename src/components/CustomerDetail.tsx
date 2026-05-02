'use client';

import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, Firestore } from 'firebase/firestore';
import { Customer, MilkEntry, AppSettings, UserProfile } from '@/lib/types';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import HistoryTable from './HistoryTable';
import EntryForm from './EntryForm';
import PaymentForm from './PaymentForm';
import AiInsights from './AiInsights';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer, Download, Sparkles, Phone, MapPin, CreditCard, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';

interface CustomerDetailProps {
  customer: Customer;
  entries: MilkEntry[];
  settings: AppSettings;
  profile: UserProfile;
  onBack: () => void;
  db: Firestore;
  userId: string;
}

export default function CustomerDetail({ customer, entries, settings, profile, onBack, db, userId }: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'payment' | 'ai'>('entry');
  const { toast } = useToast();

  const billStats = useMemo(() => {
    const totalLiters = entries.reduce((sum, e) => sum + e.milkQuantity, 0);
    const totalAmount = entries.reduce((sum, e) => sum + e.total, 0);
    const totalPaid = entries.filter(e => e.paid).reduce((sum, e) => sum + e.total, 0);
    const totalDue = entries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
    return { totalLiters, totalAmount, totalPaid, totalDue };
  }, [entries]);

  // Construct UPI Payment URI
  const upiUri = useMemo(() => {
    if (!profile.upiId || billStats.totalDue <= 0) return null;
    const payeeName = encodeURIComponent(settings.sellerName || profile.displayName || 'Milk Seller');
    const amount = billStats.totalDue.toFixed(2);
    // Standard UPI URI format: upi://pay?pa=<address>&pn=<name>&am=<amount>&cu=INR
    return `upi://pay?pa=${profile.upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=Milk%20Bill%20Payment`;
  }, [profile.upiId, profile.displayName, settings.sellerName, billStats.totalDue]);

  const handleAddEntry = (entryData: Omit<MilkEntry, 'id' | 'ownerId'>) => {
    const ref = collection(db, 'users', userId, 'entries');
    const data = {
      ...entryData,
      ownerId: userId
    };
    addDoc(ref, data).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    toast({
      title: "Entry Recorded",
      description: `${entryData.milkQuantity}L delivery for ${entryData.customerName} saved successfully.`
    });
  };

  const handleMarkPaid = async (fromDate: string, toDate: string) => {
    const entriesToUpdate = entries.filter(e => e.date >= fromDate && e.date <= toDate && !e.paid);
    
    if (entriesToUpdate.length === 0) {
      toast({
        title: "No Entries Found",
        description: "No unpaid entries were found in the selected date range.",
        variant: "destructive"
      });
      return;
    }

    for (const entry of entriesToUpdate) {
      if (!entry.id) continue;
      const ref = doc(db, 'users', userId, 'entries', entry.id);
      updateDoc(ref, { paid: true }).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: { paid: true },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    }

    toast({
      title: "Payments Updated",
      description: `Marked ${entriesToUpdate.length} entries as paid for ${customer.name}.`
    });
    
    setActiveTab('history');
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    let csv = "Date,Time,Milk(L),Total,Status\n";
    entries.forEach(e => csv += `${e.date},${e.timeOfDay},${e.milkQuantity},${e.total.toFixed(2)},${e.paid ? 'Paid' : 'Unpaid'}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${customer.name}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex flex-wrap justify-between items-center gap-4 no-print">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print Bill
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="text-center no-print">
        <h2 className="text-3xl font-bold text-[var(--heading-color)] mb-1">{customer.name}</h2>
        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          {customer.phoneNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phoneNumber}</span>}
          {customer.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {customer.address}</span>}
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg no-print">
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'entry' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('entry')}
        >
          Add Entry
        </button>
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'history' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'payment' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('payment')}
        >
          Payments
        </button>
        <button 
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-background shadow-sm text-amber-600' : 'text-muted-foreground'}`} 
          onClick={() => setActiveTab('ai')}
        >
          <Sparkles className="h-4 w-4" /> AI Insights
        </button>
      </nav>

      <div className={`${activeTab === 'entry' ? '' : 'hidden'} no-print`}>
        <EntryForm 
          customerName={customer.name} 
          defaultPrice={settings.defaultPrice} 
          onAdd={handleAddEntry} 
        />
      </div>

      <div className={`${activeTab === 'payment' ? '' : 'hidden'} no-print`}>
        <PaymentForm 
          customerName={customer.name} 
          onMarkPaid={handleMarkPaid} 
        />
      </div>

      <div className={`${activeTab === 'history' ? '' : 'hidden'} no-print`}>
        <HistoryTable 
          entries={entries} 
          db={db} 
          userId={userId} 
          customerName={customer.name} 
        />
      </div>

      <div className={`${activeTab === 'ai' ? '' : 'hidden'} no-print`}>
        <AiInsights 
          customerName={customer.name} 
          entries={entries} 
        />
      </div>

      {/* PROFESSIONAL PRINT BILL AREA */}
      <div id="print-area" className="hidden print:block font-serif text-black bg-white p-8">
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">{settings.sellerName || profile.displayName || 'MILK TRACKER PRO'}</h1>
            {profile.address && <p className="text-sm italic">{profile.address}</p>}
            {profile.mobileNumber && <p className="text-sm">Mobile: {profile.mobileNumber}</p>}
            {profile.upiId && <p className="text-sm font-semibold flex items-center gap-1"><CreditCard className="h-3 w-3" /> UPI ID: {profile.upiId}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">INVOICE</h2>
            <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Bill To:</h3>
            <p className="text-lg font-bold">{customer.name}</p>
            {customer.address && <p className="text-sm">{customer.address}</p>}
            {customer.phoneNumber && <p className="text-sm">Phone: {customer.phoneNumber}</p>}
          </div>
        </div>

        <table className="w-full border-collapse mb-8 text-sm">
          <thead>
            <tr className="border-y-2 border-black bg-gray-50">
              <th className="py-2 px-1 text-left">Date</th>
              <th className="py-2 px-1 text-left">Session</th>
              <th className="py-2 px-1 text-right">Qty (L)</th>
              <th className="py-2 px-1 text-right">Rate (₹)</th>
              <th className="py-2 px-1 text-right font-bold">Amount (₹)</th>
              <th className="py-2 px-1 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {entries.map(e => (
              <tr key={e.id} className="align-top">
                <td className="py-2 px-1">{e.date}</td>
                <td className="py-2 px-1">{e.timeOfDay}</td>
                <td className="py-2 px-1 text-right">{e.milkQuantity.toFixed(2)}</td>
                <td className="py-2 px-1 text-right">{e.price.toFixed(2)}</td>
                <td className="py-2 px-1 text-right font-bold">{e.total.toFixed(2)}</td>
                <td className="py-2 px-1 text-center text-xs uppercase">{e.paid ? 'Paid' : 'Due'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start gap-8">
          <div className="flex flex-col items-center">
            {upiUri ? (
              <div className="border p-2 bg-white flex flex-col items-center gap-1">
                <QRCodeSVG value={upiUri} size={100} level="M" />
                <p className="text-[8px] font-bold text-gray-500 uppercase">Scan to Pay UPI</p>
                <p className="text-[10px] font-black">₹{billStats.totalDue.toFixed(2)}</p>
              </div>
            ) : (
              <div className="h-[120px] w-[120px] flex items-center justify-center border border-dashed text-[10px] text-gray-400 text-center px-4">
                {billStats.totalDue <= 0 ? 'No Balance Due' : 'Set UPI ID in Profile to show QR'}
              </div>
            )}
          </div>
          
          <div className="w-64 space-y-2 border-t-2 border-black pt-4">
            <div className="flex justify-between text-sm">
              <span>Total Milk:</span>
              <span className="font-bold">{billStats.totalLiters.toFixed(2)} Liters</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Gross Amount:</span>
              <span className="font-bold">₹{billStats.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-700">
              <span>Amount Paid:</span>
              <span className="font-bold">₹{billStats.totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-black border-t-2 border-double border-black pt-2 mt-2">
              <span>Balance Due:</span>
              <span>₹{billStats.totalDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-20 flex justify-between">
          <div className="text-center w-40 border-t border-black pt-2">
            <p className="text-xs italic">Customer Signature</p>
          </div>
          <div className="text-center w-40 border-t border-black pt-2">
            <p className="text-xs italic">Authorized Seal/Sign</p>
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-gray-500 italic">
          <p>Thank you for your business! This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}
