'use client';

import React, { useState, useMemo, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, Firestore, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { Customer, MilkEntry, AppSettings, UserProfile } from '@/lib/types';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import HistoryTable from './HistoryTable';
import EntryForm from './EntryForm';
import PaymentForm from './PaymentForm';
import AiInsights from './AiInsights';
import SmartHisab from './SmartHisab';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  Sparkles, 
  Phone, 
  MapPin, 
  Loader2, 
  FileText, 
  Send, 
  Droplets, 
  Calculator, 
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  Share2,
  MessageSquare
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatDate, sanitizePhoneNumber } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'payment' | 'ai' | 'hisab'>('entry');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showBillFilters, setShowBillFilters] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [billFromDate, setBillFromDate] = useState('');
  const [billToDate, setBillToDate] = useState('');
  const [billOnlyUnpaid, setBillOnlyUnpaid] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredEntriesForBill = useMemo(() => {
    return entries.filter(e => {
      const dateMatch = (!billFromDate || e.date >= billFromDate) && (!billToDate || e.date <= billToDate);
      const paidMatch = billOnlyUnpaid ? !e.paid : true;
      return dateMatch && paidMatch;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, billFromDate, billToDate, billOnlyUnpaid]);

  const billStats = useMemo(() => {
    const totalLiters = filteredEntriesForBill.reduce((sum, e) => sum + e.milkQuantity, 0);
    const totalAmount = filteredEntriesForBill.reduce((sum, e) => sum + e.total, 0);
    const totalPaid = filteredEntriesForBill.filter(e => e.paid).reduce((sum, e) => sum + e.total, 0);
    const totalDue = filteredEntriesForBill.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
    
    const sortedDates = [...filteredEntriesForBill].map(e => e.date).sort();
    const dateRange = sortedDates.length > 0 
      ? `${formatDate(sortedDates[0])} to ${formatDate(sortedDates[sortedDates.length - 1])}`
      : 'No entries in range';

    return { totalLiters, totalAmount, totalPaid, totalDue, dateRange };
  }, [filteredEntriesForBill]);

  const upiUri = useMemo(() => {
    if (!profile.upiId || billStats.totalDue <= 0) return null;
    const payeeName = encodeURIComponent(settings.sellerName || profile.displayName || 'Milk Seller');
    const amount = billStats.totalDue.toFixed(2);
    return `upi://pay?pa=${profile.upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=Milk%20Bill%20Payment`;
  }, [profile.upiId, profile.displayName, settings.sellerName, billStats.totalDue]);

  const handleAddEntry = (entryData: Omit<MilkEntry, 'id' | 'ownerId'>) => {
    const ref = collection(db, 'users', userId, 'entries');
    const data = { 
      ...entryData, 
      ownerId: userId,
      customerPhoneNumber: customer.phoneSanitized || (customer.phoneNumber ? sanitizePhoneNumber(customer.phoneNumber) : "")
    };
    addDoc(ref, data)
      .then(() => {
        toast({ title: "Delivery Saved", description: "The entry has been recorded automatically." });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'create',
          requestResourceData: data,
        }));
      });
  };

  const handleSyncForPortal = async () => {
    if (!customer.phoneNumber) {
      toast({ title: "Phone Missing", description: "Add a phone number first.", variant: "destructive" });
      return;
    }
    setIsSyncing(true);
    const cleanPhone = sanitizePhoneNumber(customer.phoneNumber);
    const batch = writeBatch(db);
    let count = 0;
    try {
      const q = query(collection(db, 'users', userId, 'entries'), where('customerName', '==', customer.name));
      const snap = await getDocs(q);
      snap.forEach(doc => {
        if (doc.data().customerPhoneNumber !== cleanPhone) {
          batch.update(doc.ref, { customerPhoneNumber: cleanPhone });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        toast({ title: "Portal Synced", description: `Linked ${count} entries to ${cleanPhone}.` });
      } else {
        toast({ title: "Already Synced", description: "All records are already linked." });
      }
    } catch (err) {
      toast({ title: "Sync Failed", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!printAreaRef.current) return null;
    
    const originalStyle = printAreaRef.current.style.cssText;
    // Force visibility and set fixed width for consistent capture (Solves half-page bug)
    printAreaRef.current.style.cssText = "display: block !important; position: fixed; left: -9999px; top: 0; width: 800px; background: white; visibility: visible !important; color: black !important; padding: 40px;";
    
    try {
      const canvas = await html2canvas(printAreaRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      return pdf.output('blob');
    } catch (err) {
      console.error("PDF generation failed:", err);
      return null;
    } finally {
      printAreaRef.current.style.cssText = originalStyle;
    }
  };

  const handleShareTextSummary = () => {
    const text = `*🍼 MILK BILL SUMMARY*\n*Seller:* ${settings.sellerName || profile.displayName}\n*Customer:* ${customer.name}\n*Period:* ${billStats.dateRange}\n*Total Vol:* ${billStats.totalLiters.toFixed(2)} L\n*Total Due:* ₹${billStats.totalDue.toFixed(2)}`;
    const phone = customer.phoneNumber?.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await generatePdfBlob();
      setIsGeneratingPdf(false);
      
      if (!blob) throw new Error("Could not generate PDF");

      if (navigator.share) {
        const file = new File([blob], `Milk_Bill_${customer.name}.pdf`, { type: 'application/pdf' });
        try {
          await navigator.share({
            files: [file],
            title: 'Milk Bill',
            text: `Invoice for ${customer.name}`
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            handleDownloadPdf();
          }
        }
      } else {
        handleDownloadPdf();
      }
    } catch (err: any) {
      setIsGeneratingPdf(false);
      toast({ title: "Sharing Failed", description: "Try downloading instead.", variant: "destructive" });
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const blob = await generatePdfBlob();
    setIsGeneratingPdf(false);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Milk_Bill_${customer.name}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleMarkPaid = async (fromDate: string, toDate: string) => {
    const entriesToUpdate = entries.filter(e => e.date >= fromDate && e.date <= toDate && !e.paid);
    if (entriesToUpdate.length === 0) {
      toast({ title: "No unpaid entries", description: "All entries in this range are already paid." });
      return;
    }
    const batch = writeBatch(db);
    for (const entry of entriesToUpdate) {
      if (!entry.id) continue;
      batch.update(doc(db, 'users', userId, 'entries', entry.id), { paid: true });
    }
    await batch.commit();
    toast({ title: "Payments Updated", description: `Marked ${entriesToUpdate.length} entries as paid.` });
    setActiveTab('history');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex flex-wrap justify-between items-center gap-4 no-print">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncForPortal} disabled={isSyncing} className="gap-2 border-primary text-primary font-bold">
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync for Portal
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBillFilters(!showBillFilters)} className="gap-2 font-bold">
            <Filter className="h-4 w-4" /> Filter Bill
          </Button>
          <Button variant="default" size="sm" onClick={handleShareTextSummary} className="gap-2 bg-emerald-500 font-bold hover:bg-emerald-600">
            <Send className="h-4 w-4" /> Share Text Summary
          </Button>
          <Button variant="default" size="sm" onClick={handleSharePdf} disabled={isGeneratingPdf} className="gap-2 bg-emerald-600 font-bold hover:bg-emerald-700">
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="gap-2 font-bold">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="default" size="sm" onClick={() => window.print()} className="gap-2 bg-primary font-bold">
            <Printer className="h-4 w-4" /> Professional Print
          </Button>
        </div>
      </div>

      {showBillFilters && (
        <div className="no-print p-4 bg-card border rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1"><Label className="text-xs font-bold">Start Date</Label><Input type="date" value={billFromDate} onChange={e => setBillFromDate(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs font-bold">End Date</Label><Input type="date" value={billToDate} onChange={e => setBillToDate(e.target.value)} /></div>
          <div className="flex items-end pb-1 gap-2">
            <div className="flex items-center space-x-2 border rounded-md px-2 h-10 w-full">
              <Checkbox id="onlyUnpaid" checked={billOnlyUnpaid} onCheckedChange={(c) => setBillOnlyUnpaid(!!c)} />
              <label htmlFor="onlyUnpaid" className="text-xs font-bold cursor-pointer">Unpaid Only</label>
            </div>
          </div>
        </div>
      )}

      <div className="text-center no-print">
        <h2 className="text-3xl font-black text-[var(--heading-color)] mb-1 uppercase tracking-tight">{customer.name}</h2>
        <div className="flex justify-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {customer.phoneNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phoneNumber}</span>}
          {customer.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {customer.address}</span>}
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg no-print">
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase ${activeTab === 'entry' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('entry')}>Add Entry</button>
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase ${activeTab === 'history' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('history')}>History</button>
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase ${activeTab === 'hisab' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('hisab')}>Smart Hisab</button>
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase ${activeTab === 'payment' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('payment')}>Payments</button>
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase ${activeTab === 'ai' ? 'bg-background shadow-sm text-amber-600' : 'text-muted-foreground'}`} onClick={() => setActiveTab('ai')}>AI Analysis</button>
      </nav>

      <div className={`${activeTab === 'entry' ? '' : 'hidden'} no-print`}><EntryForm customerName={customer.name} defaultPrice={settings.defaultPrice} onAdd={handleAddEntry} /></div>
      <div className={`${activeTab === 'history' ? '' : 'hidden'} no-print`}><HistoryTable entries={entries} db={db} userId={userId} customerName={customer.name} /></div>
      <div className={`${activeTab === 'hisab' ? '' : 'hidden'} no-print`}><SmartHisab customerName={customer.name} phoneNumber={customer.phoneNumber} entries={entries} sellerName={settings.sellerName || profile.displayName || 'Dairy Ledger'} /></div>
      <div className={`${activeTab === 'payment' ? '' : 'hidden'} no-print`}><PaymentForm customerName={customer.name} onMarkPaid={handleMarkPaid} /></div>
      <div className={`${activeTab === 'ai' ? '' : 'hidden'} no-print`}><AiInsights customerName={customer.name} entries={entries} /></div>

      <div id="print-area" ref={printAreaRef} className="hidden print:block font-serif text-black p-8 bg-white border">
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">{settings.sellerName || profile.displayName || 'DAIRY LEDGER'}</h1>
            {profile.address && <p className="text-sm mt-1">{profile.address}</p>}
            <p className="text-xs font-bold mt-2">📞 {profile.mobileNumber || 'N/A'}</p>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-gray-200">INVOICE</h2>
            <p className="text-sm font-bold mt-2">Date: {formatDate(new Date().toISOString().split('T')[0])}</p>
          </div>
        </div>
        <div className="mb-8">
          <h3 className="text-xs font-black uppercase text-gray-500 mb-1">BILL TO:</h3>
          <p className="text-xl font-black uppercase">{customer.name}</p>
          {customer.address && <p className="text-sm">{customer.address}</p>}
        </div>
        <table className="w-full text-sm mb-8 border-collapse">
          <thead>
            <tr className="border-y-2 border-black bg-gray-50">
              <th className="py-2 text-left px-2">DATE</th>
              <th className="py-2 text-left px-2">SHIFT</th>
              <th className="py-2 text-right px-2">QTY (L)</th>
              <th className="py-2 text-right px-2">RATE</th>
              <th className="py-2 text-right px-2 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b-2 border-black">
            {filteredEntriesForBill.map(e => (
              <tr key={e.id}>
                <td className="py-2 px-2">{formatDate(e.date)}</td>
                <td className="py-2 px-2 uppercase text-xs">{e.timeOfDay}</td>
                <td className="py-2 px-2 text-right">{e.milkQuantity.toFixed(2)}</td>
                <td className="py-2 px-2 text-right">₹{e.price.toFixed(2)}</td>
                <td className="py-2 px-2 text-right font-bold">₹{e.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-start gap-12 mt-4">
          <div>
            {upiUri && (
              <div className="border-2 border-black p-4 inline-block text-center bg-white shadow-sm">
                <QRCodeSVG value={decodeURIComponent(upiUri)} size={120} />
                <p className="text-[10px] font-black mt-2 uppercase">SCAN TO PAY ₹{billStats.totalDue.toFixed(0)}</p>
              </div>
            )}
          </div>
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal:</span><span className="font-bold">₹{billStats.totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-emerald-700"><span>Received:</span><span className="font-bold">₹{billStats.totalPaid.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-black border-t-2 border-black pt-2"><span>BALANCE:</span><span>₹{billStats.totalDue.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="mt-12 text-center text-[10px] text-gray-400 border-t pt-4">
          Powered by Milk Tracker Pro
        </div>
      </div>
    </div>
  );
}