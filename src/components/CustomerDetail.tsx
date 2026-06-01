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
  MessageSquare,
  Globe,
  Calendar as CalendarIcon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatDate, sanitizePhoneNumber } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    const startDate = sortedDates.length > 0 ? formatDate(sortedDates[0]) : '--/--/----';
    const endDate = sortedDates.length > 0 ? formatDate(sortedDates[sortedDates.length - 1]) : '--/--/----';

    return { totalLiters, totalAmount, totalPaid, totalDue, startDate, endDate };
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
        const entryRef = doc.ref;
        const entryData = doc.data();
        if (entryData.customerPhoneNumber !== cleanPhone) {
          batch.update(entryRef, { customerPhoneNumber: cleanPhone });
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
    
    const element = printAreaRef.current;
    const originalStyle = element.style.cssText;
    
    element.style.cssText = `
      display: block !important;
      visibility: visible !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 800px !important;
      height: auto !important;
      background: white !important;
      color: black !important;
      z-index: -9999 !important;
      padding: 0 !important;
      margin: 0 !important;
    `;
    
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        height: element.scrollHeight,
        windowWidth: 800,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('print-area');
          if (clonedElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pageHeight = 297;
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      return pdf.output('blob');
    } catch (err) {
      console.error("PDF generation failed:", err);
      return null;
    } finally {
      element.style.cssText = originalStyle;
    }
  };

  const handleShareTextSummary = () => {
    const text = `*🍼 MILK BILL SUMMARY*\n*Seller:* ${settings.sellerName || profile.displayName}\n*Customer:* ${customer.name}\n*Period:* ${billStats.startDate} to ${billStats.endDate}\n*Total Vol:* ${billStats.totalLiters.toFixed(2)} L\n*Subtotal:* ₹${billStats.totalAmount.toFixed(2)}\n*Paid:* ₹${billStats.totalPaid.toFixed(2)}\n*PENDING DUE:* ₹${billStats.totalDue.toFixed(2)}`;
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
            text: `Invoice for ${customer.name} - Balance: ₹${billStats.totalDue.toFixed(2)}`
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
          <Button variant="outline" size="sm" onClick={handleSyncForPortal} disabled={isSyncing} className="gap-2 border-primary text-primary font-black">
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync for Portal
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBillFilters(!showBillFilters)} className="gap-2 font-black">
            <Filter className="h-4 w-4" /> Filter Bill
          </Button>
          <Button variant="default" size="sm" onClick={handleShareTextSummary} className="gap-2 bg-emerald-500 font-black hover:bg-emerald-600">
            <Send className="h-4 w-4" /> Share Text Summary
          </Button>
          <Button variant="default" size="sm" onClick={handleSharePdf} disabled={isGeneratingPdf} className="gap-2 bg-emerald-600 font-black hover:bg-emerald-700">
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="gap-2 font-black">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="default" size="sm" onClick={() => window.print()} className="gap-2 bg-primary font-black">
            <Printer className="h-4 w-4" /> Professional Print
          </Button>
        </div>
      </div>

      {showBillFilters && (
        <div className="no-print p-4 bg-card border rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 flex flex-col">
            <Label className="text-xs font-black uppercase">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-bold",
                    !billFromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {billFromDate ? format(parseISO(billFromDate), "dd/MM/yyyy") : <span>Select Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={billFromDate ? parseISO(billFromDate) : undefined}
                  onSelect={(d) => d && setBillFromDate(d.toISOString().split('T')[0])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1 flex flex-col">
            <Label className="text-xs font-black uppercase">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-bold",
                    !billToDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {billToDate ? format(parseISO(billToDate), "dd/MM/yyyy") : <span>Select Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={billToDate ? parseISO(billToDate) : undefined}
                  onSelect={(d) => d && setBillToDate(d.toISOString().split('T')[0])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end pb-1 gap-2">
            <div className="flex items-center space-x-2 border rounded-md px-2 h-10 w-full">
              <Checkbox id="onlyUnpaid" checked={billOnlyUnpaid} onCheckedChange={(c) => setBillOnlyUnpaid(!!c)} />
              <label htmlFor="onlyUnpaid" className="text-xs font-black uppercase cursor-pointer">Unpaid Only</label>
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
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase flex items-center justify-center gap-2 ${activeTab === 'hisab' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('hisab')}>
          <Calculator className="h-3 w-3" /> Smart Hisab
        </button>
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase ${activeTab === 'payment' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('payment')}>Payments</button>
        <button className={`flex-1 py-3 px-3 rounded-md font-black transition-all text-xs uppercase ${activeTab === 'ai' ? 'bg-background shadow-sm text-amber-600' : 'text-muted-foreground'}`} onClick={() => setActiveTab('ai')}>AI Analysis</button>
      </nav>

      <div className={`${activeTab === 'entry' ? '' : 'hidden'} no-print`}><EntryForm customerName={customer.name} defaultPrice={settings.defaultPrice} onAdd={handleAddEntry} /></div>
      <div className={`${activeTab === 'history' ? '' : 'hidden'} no-print`}><HistoryTable entries={entries} db={db} userId={userId} customerName={customer.name} /></div>
      <div className={`${activeTab === 'hisab' ? '' : 'hidden'} no-print`}><SmartHisab customerName={customer.name} phoneNumber={customer.phoneNumber} entries={entries} sellerName={settings.sellerName || profile.displayName || 'Dairy Ledger'} /></div>
      <div className={`${activeTab === 'payment' ? '' : 'hidden'} no-print`}><PaymentForm customerName={customer.name} onMarkPaid={handleMarkPaid} /></div>
      <div className={`${activeTab === 'ai' ? '' : 'hidden'} no-print`}><AiInsights customerName={customer.name} entries={entries} /></div>

      <div id="print-area" ref={printAreaRef} className="hidden print:block font-sans text-black p-10 bg-white min-h-[1120px]">
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div className="flex gap-4 items-center">
            {profile.businessLogoBase64 ? (
              <div className="h-20 w-20 overflow-hidden rounded-lg border-2 border-primary/20 bg-white p-1">
                <img src={profile.businessLogoBase64} alt="Brand Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="h-20 w-20 bg-primary flex items-center justify-center rounded-lg">
                <Droplets className="h-10 w-10 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">{settings.sellerName || profile.displayName || 'DAIRY LEDGER'}</h1>
              <p className="text-sm font-medium text-gray-600 max-w-[400px] leading-tight mb-2">{profile.address || 'Address Not Set'}</p>
              <div className="flex gap-4 text-xs font-bold text-gray-800">
                <span className="flex items-center gap-1">📞 {profile.mobileNumber || 'N/A'}</span>
                <span className="flex items-center gap-1">💳 UPI: {profile.upiId || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-5xl font-black text-gray-100 mb-2 select-none tracking-tighter">INVOICE</h2>
            <div className="text-xs font-bold uppercase space-y-1">
              <p>Bill Date: <span className="text-gray-600">{formatDate(new Date().toISOString().split('T')[0])}</span></p>
              <p>Period: <span className="text-gray-600">{billStats.startDate} to {billStats.endDate}</span></p>
            </div>
          </div>
        </div>
        
        <div className="mb-10 p-4 border-l-4 border-black bg-gray-50/50">
          <h3 className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">CUSTOMER DETAILS</h3>
          <p className="text-2xl font-black uppercase leading-tight mb-1">{customer.name}</p>
          {customer.address && <p className="text-sm text-gray-600">{customer.address}</p>}
          <p className="text-xs font-bold mt-1">Phone: {customer.phoneNumber || 'N/A'}</p>
        </div>

        <table className="w-full text-sm mb-12 border-collapse">
          <thead>
            <tr className="border-y-2 border-black bg-white">
              <th className="py-3 text-left px-2 font-black uppercase tracking-wider">DATE</th>
              <th className="py-3 text-left px-2 font-black uppercase tracking-wider">SESSION</th>
              <th className="py-3 text-right px-2 font-black uppercase tracking-wider">QTY (L)</th>
              <th className="py-3 text-right px-2 font-black uppercase tracking-wider">RATE (₹)</th>
              <th className="py-3 text-right px-2 font-black uppercase tracking-wider">TOTAL (₹)</th>
              <th className="py-3 text-right px-4 font-black uppercase tracking-wider">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b-2 border-black">
            {filteredEntriesForBill.map(e => (
              <tr key={e.id} className="border-gray-200">
                <td className="py-3 px-2 font-medium">{formatDate(e.date)}</td>
                <td className="py-3 px-2 text-gray-600">{e.timeOfDay}</td>
                <td className="py-3 px-2 text-right font-medium">{e.milkQuantity.toFixed(2)}</td>
                <td className="py-3 px-2 text-right text-gray-600">{e.price.toFixed(2)}</td>
                <td className="py-3 px-2 text-right font-bold">₹{e.total.toFixed(2)}</td>
                <td className={`py-3 px-4 text-right font-black text-[10px] ${e.paid ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {e.paid ? 'PAID' : 'DUE'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 border-dashed border-gray-300 pt-8 flex justify-between items-start">
          <div className="flex flex-col items-center">
            {upiUri ? (
              <div className="border-2 border-black p-4 bg-white shadow-sm inline-block text-center">
                <QRCodeSVG value={decodeURIComponent(upiUri)} size={140} level="H" />
                <div className="mt-2">
                  <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">SCAN TO PAY (UPI)</p>
                  <p className="text-xl font-black">₹{billStats.totalDue.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="h-[180px] w-[140px] flex items-center justify-center border-2 border-dashed border-gray-200 text-[10px] font-bold text-gray-400">
                UPI ID NOT SET
              </div>
            )}
          </div>
          
          <div className="w-80 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-bold uppercase tracking-tight">Net Milk Volume:</span>
              <span className="font-black text-lg">{billStats.totalLiters.toFixed(2)} L</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-500 font-bold uppercase tracking-tight">Subtotal Amount:</span>
              <span className="font-black text-lg">₹{billStats.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-emerald-600">
              <span className="font-bold uppercase tracking-tight">Payments Received:</span>
              <span className="font-black text-lg">(-) ₹{billStats.totalPaid.toFixed(2)}</span>
            </div>
            
            <div className="border-t-4 border-black pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-black tracking-tighter">BALANCE:</span>
                <span className="text-3xl font-black tracking-tighter">₹{billStats.totalDue.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-6">
              DIGITAL INVOICE GENERATED BY MILK TRACKER PRO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
