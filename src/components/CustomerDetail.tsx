
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
import { ChevronLeft, Printer, Download, Sparkles, Phone, MapPin, CreditCard, Share2, MessageCircle, FileText } from 'lucide-react';
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
    
    // Sort entries to find date range
    const sortedDates = [...entries].map(e => e.date).sort();
    const dateRange = sortedDates.length > 0 
      ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
      : 'No entries';

    return { totalLiters, totalAmount, totalPaid, totalDue, dateRange };
  }, [entries]);

  const upiUri = useMemo(() => {
    if (!profile.upiId || billStats.totalDue <= 0) return null;
    const payeeName = encodeURIComponent(settings.sellerName || profile.displayName || 'Milk Seller');
    const amount = billStats.totalDue.toFixed(2);
    return `upi://pay?pa=${profile.upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=Milk%20Bill%20Payment`;
  }, [profile.upiId, profile.displayName, settings.sellerName, billStats.totalDue]);

  const handleAddEntry = (entryData: Omit<MilkEntry, 'id' | 'ownerId'>) => {
    const ref = collection(db, 'users', userId, 'entries');
    const data = { ...entryData, ownerId: userId };
    addDoc(ref, data)
      .then(() => {
        toast({
          title: "Entry Recorded",
          description: `${entryData.milkQuantity}L delivery saved successfully.`
        });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'create',
          requestResourceData: data,
        }));
      });
  };

  const handleMarkPaid = async (fromDate: string, toDate: string) => {
    const entriesToUpdate = entries.filter(e => e.date >= fromDate && e.date <= toDate && !e.paid);
    if (entriesToUpdate.length === 0) {
      toast({ title: "No Entries Found", description: "No unpaid entries found in range.", variant: "destructive" });
      return;
    }
    for (const entry of entriesToUpdate) {
      if (!entry.id) continue;
      const ref = doc(db, 'users', userId, 'entries', entry.id);
      updateDoc(ref, { paid: true }).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: { paid: true },
        }));
      });
    }
    toast({ title: "Payments Updated", description: `Marked ${entriesToUpdate.length} entries as paid.` });
    setActiveTab('history');
  };

  const handleShareWhatsApp = () => {
    if (!customer.phoneNumber) {
      toast({ title: "No Phone Number", description: "Please add a phone number for this customer first.", variant: "destructive" });
      return;
    }

    const businessName = settings.sellerName || profile.displayName || 'Milk Tracker Pro';
    
    let message = `*🍼 MILK BILL SUMMARY*\n`;
    message += `----------------------------\n`;
    message += `*Seller:* ${businessName}\n`;
    if (profile.mobileNumber) message += `*Contact:* ${profile.mobileNumber}\n`;
    message += `----------------------------\n`;
    message += `*Customer:* ${customer.name}\n`;
    message += `*Period:* ${billStats.dateRange}\n`;
    message += `----------------------------\n\n`;
    
    message += `*Summary:*\n`;
    message += `Total Milk: ${billStats.totalLiters.toFixed(2)} Liters\n`;
    message += `Total Amount: ₹${billStats.totalAmount.toFixed(2)}\n`;
    message += `Amount Paid: ₹${billStats.totalPaid.toFixed(2)}\n`;
    message += `----------------------------\n`;
    message += `*BALANCE DUE: ₹${billStats.totalDue.toFixed(2)}*\n`;
    message += `----------------------------\n\n`;

    if (profile.upiId && billStats.totalDue > 0) {
      message += `*Pay via UPI:* ${profile.upiId}\n`;
      message += `(Pre-filled link available in PDF/Print bill)\n\n`;
    }

    message += `_Thank you for your business!_`;
    
    const whatsappUrl = `https://wa.me/${customer.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex flex-wrap justify-between items-center gap-4 no-print">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleShareWhatsApp} className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
            <MessageCircle className="h-4 w-4" /> Share on WhatsApp
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
            <Printer className="h-4 w-4" /> Professional Bill (PDF)
          </Button>
          <Button variant="outline" onClick={() => {
            let csv = "Date,Time,Milk(L),Rate,Total,Status\n";
            entries.forEach(e => csv += `${e.date},${e.timeOfDay},${e.milkQuantity},${e.price},${e.total.toFixed(2)},${e.paid ? 'Paid' : 'Unpaid'}\n`);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${customer.name}_milk_report.csv`;
            link.click();
          }} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
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
        <button className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'entry' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('entry')}>Add Entry</button>
        <button className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'history' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('history')}>History</button>
        <button className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${activeTab === 'payment' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('payment')}>Payments</button>
        <button className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-background shadow-sm text-amber-600' : 'text-muted-foreground'}`} onClick={() => setActiveTab('ai')}><Sparkles className="h-4 w-4" /> AI Insights</button>
      </nav>

      <div className={`${activeTab === 'entry' ? '' : 'hidden'} no-print`}>
        <EntryForm customerName={customer.name} defaultPrice={settings.defaultPrice} onAdd={handleAddEntry} />
      </div>
      <div className={`${activeTab === 'payment' ? '' : 'hidden'} no-print`}>
        <PaymentForm customerName={customer.name} onMarkPaid={handleMarkPaid} />
      </div>
      <div className={`${activeTab === 'history' ? '' : 'hidden'} no-print`}>
        <HistoryTable entries={entries} db={db} userId={userId} customerName={customer.name} />
      </div>
      <div className={`${activeTab === 'ai' ? '' : 'hidden'} no-print`}>
        <AiInsights customerName={customer.name} entries={entries} />
      </div>

      <div id="print-area" className="hidden print:block font-serif text-black bg-white p-8">
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">{settings.sellerName || profile.displayName || 'MILK TRACKER PRO'}</h1>
            {profile.address && <p className="text-sm italic max-w-xs">{profile.address}</p>}
            {profile.mobileNumber && <p className="text-sm font-bold">Mobile: {profile.mobileNumber}</p>}
            {profile.upiId && <p className="text-sm">UPI ID: {profile.upiId}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black">INVOICE</h2>
            <p className="text-sm font-bold">Date: {new Date().toLocaleDateString()}</p>
            <p className="text-xs text-gray-500">Period: {billStats.dateRange}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border p-4 bg-gray-50 rounded">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">BILL TO:</h3>
            <p className="text-lg font-bold">{customer.name}</p>
            {customer.address && <p className="text-sm">{customer.address}</p>}
            {customer.phoneNumber && <p className="text-sm font-medium">Phone: {customer.phoneNumber}</p>}
          </div>
        </div>

        <table className="w-full border-collapse mb-8 text-sm">
          <thead>
            <tr className="border-y-2 border-black bg-gray-100">
              <th className="py-2 px-1 text-left">Date</th>
              <th className="py-2 px-1 text-left">Session</th>
              <th className="py-2 px-1 text-right">Qty (L)</th>
              <th className="py-2 px-1 text-right">Rate (₹)</th>
              <th className="py-2 px-1 text-right font-bold">Amount (₹)</th>
              <th className="py-2 px-1 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {entries.sort((a,b) => a.date.localeCompare(b.date)).map(e => (
              <tr key={e.id} className="align-top">
                <td className="py-2 px-1">{e.date}</td>
                <td className="py-2 px-1">{e.timeOfDay}</td>
                <td className="py-2 px-1 text-right">{e.milkQuantity.toFixed(2)}</td>
                <td className="py-2 px-1 text-right">{e.price.toFixed(2)}</td>
                <td className="py-2 px-1 text-right font-bold">{e.total.toFixed(2)}</td>
                <td className="py-2 px-1 text-center text-[10px] uppercase font-bold">{e.paid ? 'Paid' : 'Due'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start gap-8">
          <div className="flex flex-col items-center">
            {upiUri ? (
              <div className="border-2 border-black p-3 bg-white flex flex-col items-center gap-2 rounded">
                <QRCodeSVG value={upiUri} size={120} level="H" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-600 uppercase">Scan to Pay using UPI</p>
                  <p className="text-xs font-black">₹{billStats.totalDue.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="h-[150px] w-[150px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded text-[10px] text-gray-400 text-center px-4">
                {billStats.totalDue <= 0 ? 'Payment Completed' : 'Setup UPI in Profile to enable QR'}
              </div>
            )}
          </div>
          <div className="w-72 space-y-2">
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-sm">Total Milk Volume:</span>
              <span className="font-bold">{billStats.totalLiters.toFixed(2)} Liters</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Subtotal:</span>
              <span className="font-bold">₹{billStats.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span className="text-sm">Total Paid:</span>
              <span className="font-bold">₹{billStats.totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-black border-t-4 border-double border-black pt-2 mt-4">
              <span>BALANCE:</span>
              <span>₹{billStats.totalDue.toFixed(2)}</span>
            </div>
            <div className="pt-4 text-[10px] italic text-gray-500 text-right">
              This is a computer-generated invoice.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
