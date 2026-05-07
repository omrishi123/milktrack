'use client';

import React, { useState, useMemo, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, Firestore } from 'firebase/firestore';
import { Customer, MilkEntry, AppSettings, UserProfile } from '@/lib/types';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import HistoryTable from './HistoryTable';
import EntryForm from './EntryForm';
import PaymentForm from './PaymentForm';
import AiInsights from './AiInsights';
import SmartHisab from './SmartHisab';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer, Download, Sparkles, Phone, MapPin, MessageCircle, Share2, Loader2, FileText, Send, Droplets, Calculator } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const printAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const billStats = useMemo(() => {
    const totalLiters = entries.reduce((sum, e) => sum + e.milkQuantity, 0);
    const totalAmount = entries.reduce((sum, e) => sum + e.total, 0);
    const totalPaid = entries.filter(e => e.paid).reduce((sum, e) => sum + e.total, 0);
    const totalDue = entries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
    
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
        toast({ title: "Entry Recorded", description: `${entryData.milkQuantity}L delivery saved successfully.` });
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

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!printAreaRef.current) return null;
    
    const originalStyle = printAreaRef.current.style.cssText;
    printAreaRef.current.style.cssText = "display: block !important; position: absolute; left: 0; top: 0; width: 800px; background: white; visibility: visible !important; color: black !important; z-index: 9999; padding: 40px;";
    
    try {
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; 
      const pageHeight = 295; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      return pdf.output('blob');
    } catch (err) {
      console.error("PDF Gen Error:", err);
      return null;
    } finally {
      printAreaRef.current.style.cssText = originalStyle;
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const pdfBlob = await generatePdfBlob();
    setIsGeneratingPdf(false);

    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bill_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      return true;
    }
    return false;
  };

  const getBillText = () => {
    const businessName = settings.sellerName || profile.displayName || 'Milk Tracker Pro';
    return `*🍼 MILK BILL SUMMARY*\n` +
           `*Seller:* ${businessName}\n` +
           `*Customer:* ${customer.name}\n` +
           `*Period:* ${billStats.dateRange}\n\n` +
           `*Total Volume:* ${billStats.totalLiters.toFixed(2)} L\n` +
           `*Total Amount:* ₹${billStats.totalAmount.toFixed(2)}\n` +
           `*Payment Received:* ₹${billStats.totalPaid.toFixed(2)}\n` +
           `--------------------------\n` +
           `*BALANCE DUE: ₹${billStats.totalDue.toFixed(2)}*\n` +
           `--------------------------\n\n` +
           `Thank you!`;
  };

  const handleShareTextOnly = () => {
    const billText = getBillText();
    const phone = customer.phoneNumber?.replace(/\D/g, '');
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(billText)}`;
    window.open(waUrl, '_blank');
  };

  const handleShareProfessional = async () => {
    setIsGeneratingPdf(true);
    const pdfBlob = await generatePdfBlob();
    setIsGeneratingPdf(false);

    const billText = getBillText() + `\n(PDF Invoice Attached)`;
    const phone = customer.phoneNumber?.replace(/\D/g, '');

    if (pdfBlob && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], 'bill.pdf', { type: 'application/pdf' })] })) {
      const file = new File([pdfBlob], `Bill_${customer.name.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
      try {
        await navigator.share({
          files: [file],
          title: 'Milk Bill Invoice',
          text: billText
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bill_${customer.name.replace(/\s+/g, '_')}.pdf`;
      link.click();
      toast({ title: "PDF Ready", description: "PDF downloaded. Now opening WhatsApp chat..." });
    }
    
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(billText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex flex-wrap justify-between items-center gap-4 no-print">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default" 
            onClick={handleShareTextOnly} 
            className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
          >
            <Send className="h-4 w-4" />
            Share Text Summary
          </Button>
          <Button 
            variant="default" 
            onClick={handleShareProfessional} 
            disabled={isGeneratingPdf}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg"
          >
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Share PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf} 
            disabled={isGeneratingPdf}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
            <Printer className="h-4 w-4" /> Professional Print
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
        <button className={`flex-1 py-2 px-3 rounded-md font-semibold transition-all text-sm ${activeTab === 'entry' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('entry')}>Add Entry</button>
        <button className={`flex-1 py-2 px-3 rounded-md font-semibold transition-all text-sm ${activeTab === 'history' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('history')}>History</button>
        <button className={`flex-1 py-2 px-3 rounded-md font-semibold transition-all text-sm flex items-center justify-center gap-1 ${activeTab === 'hisab' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('hisab')}><Calculator className="h-4 w-4" /> Smart Hisab</button>
        <button className={`flex-1 py-2 px-3 rounded-md font-semibold transition-all text-sm ${activeTab === 'payment' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('payment')}>Payments</button>
        <button className={`flex-1 py-2 px-3 rounded-md font-semibold transition-all text-sm flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-background shadow-sm text-amber-600' : 'text-muted-foreground'}`} onClick={() => setActiveTab('ai')}><Sparkles className="h-4 w-4" /> AI Insights</button>
      </nav>

      <div className={`${activeTab === 'entry' ? '' : 'hidden'} no-print`}>
        <EntryForm customerName={customer.name} defaultPrice={settings.defaultPrice} onAdd={handleAddEntry} />
      </div>
      <div className={`${activeTab === 'hisab' ? '' : 'hidden'} no-print`}>
        <SmartHisab customerName={customer.name} phoneNumber={customer.phoneNumber} entries={entries} sellerName={settings.sellerName || profile.displayName || 'Milk Tracker Pro'} />
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

      {/* PROFESSONAL BILL PRINT AREA */}
      <div id="print-area" ref={printAreaRef} className="hidden print:block font-serif text-black bg-white p-8 border">
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
          <div className="flex items-start gap-4">
             {profile.businessLogoBase64 ? (
               <div className="h-20 w-20 overflow-hidden border-2 border-black p-2 bg-white">
                 <img src={profile.businessLogoBase64} alt="Business Logo" className="w-full h-full object-contain" />
               </div>
             ) : (
               <div className="h-20 w-20 border-2 border-black flex items-center justify-center p-2">
                 <Droplets className="h-10 w-10 text-black" />
               </div>
             )}
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-tight">{settings.sellerName || profile.displayName || 'MILK TRACKER PRO'}</h1>
              {profile.address && <p className="text-sm font-medium mt-1">{profile.address}</p>}
              <div className="flex gap-4 mt-2 text-xs font-bold">
                {profile.mobileNumber && <span>📞 {profile.mobileNumber}</span>}
                {profile.upiId && <span>💳 UPI: {profile.upiId}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-gray-300">INVOICE</h2>
            <p className="text-sm font-bold mt-2">Bill Date: {new Date().toLocaleDateString()}</p>
            <div className="mt-2 flex justify-end">
              <span className="text-xs text-black py-1 uppercase font-bold leading-none inline-block border-b-2 border-black">
                Period: {billStats.dateRange}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mb-8 border-l-4 border-black pl-4">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">CUSTOMER DETAILS</h3>
          <p className="text-xl font-black">{customer.name}</p>
          {customer.address && <p className="text-sm">{customer.address}</p>}
          {customer.phoneNumber && <p className="text-sm font-bold">Phone: {customer.phoneNumber}</p>}
        </div>

        <table className="w-full border-collapse mb-8 text-sm">
          <thead>
            <tr className="border-y-2 border-black bg-gray-50">
              <th className="py-2 px-2 text-left">DATE</th>
              <th className="py-2 px-2 text-left">SESSION</th>
              <th className="py-2 px-2 text-right">QTY (L)</th>
              <th className="py-2 px-2 text-right">RATE (₹)</th>
              <th className="py-2 px-2 text-right font-bold">TOTAL (₹)</th>
              <th className="py-2 px-2 text-center">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.sort((a,b) => a.date.localeCompare(b.date)).map(e => (
              <tr key={e.id} className="align-top">
                <td className="py-3 px-2">{e.date}</td>
                <td className="py-3 px-2 font-medium">{e.timeOfDay}</td>
                <td className="py-3 px-2 text-right">{e.milkQuantity.toFixed(2)}</td>
                <td className="py-3 px-2 text-right">{e.price.toFixed(2)}</td>
                <td className="py-3 px-2 text-right font-bold">₹{e.total.toFixed(2)}</td>
                <td className="py-3 px-2 text-center align-middle">
                  <div className="flex justify-center items-center h-full">
                    <span className={`text-[10px] px-1.5 py-0.5 font-black uppercase leading-none inline-block ${e.paid ? 'text-green-700' : 'text-red-700'}`}>
                      {e.paid ? 'PAID' : 'DUE'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start gap-12 mt-12 border-t-2 border-dashed border-gray-400 pt-8">
          <div className="flex flex-col items-center">
            {upiUri ? (
              <div className="border-2 border-black p-4 bg-white shadow-md flex flex-col items-center gap-3">
                <QRCodeSVG value={decodeURIComponent(upiUri)} size={140} level="H" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-700 uppercase">SCAN TO PAY (UPI)</p>
                  <p className="text-lg font-black mt-1">₹{billStats.totalDue.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="h-[180px] w-[180px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded text-center px-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase italic">
                  {billStats.totalDue <= 0 ? 'Full Payment Completed' : 'Add UPI ID in Profile to show QR'}
                </p>
              </div>
            )}
          </div>
          <div className="w-80 space-y-3">
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-sm font-medium">Net Milk Volume:</span>
              <span className="font-bold">{billStats.totalLiters.toFixed(2)} Liters</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-sm font-medium">Subtotal Amount:</span>
              <span className="font-bold">₹{billStats.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700 border-b border-gray-100 pb-1">
              <span className="text-sm font-medium">Payments Received:</span>
              <span className="font-bold">(-) ₹{billStats.totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-3xl font-black border-t-4 border-black pt-2 mt-4">
              <span>BALANCE:</span>
              <span>₹{billStats.totalDue.toFixed(2)}</span>
            </div>
            <div className="pt-6 text-[10px] font-bold italic text-gray-400 text-right uppercase tracking-widest">
              Digital Invoice Generated by Milk Tracker Pro
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
