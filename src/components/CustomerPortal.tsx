"use client";

import React, { useMemo, useState, useRef } from 'react';
import { MilkEntry, UserProfile, AppSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Droplets, 
  Wallet2, 
  Calendar, 
  Phone, 
  MapPin, 
  Calculator, 
  Search, 
  AlertCircle,
  Download,
  Share2,
  Printer,
  Filter,
  ArrowRight,
  FileText,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/lib/utils';
import MilkChart from './MilkChart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface CustomerPortalProps {
  purchases: {
    ownerId: string;
    ownerProfile?: UserProfile;
    ownerSettings?: AppSettings;
    entries: MilkEntry[];
  }[];
}

export default function CustomerPortal({ purchases }: CustomerPortalProps) {
  if (purchases.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-black uppercase">No Records Found</h2>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm">
          Once your dairy owner records a delivery with your mobile number, your bills will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3">
        <Droplets className="h-5 w-5 text-primary" />
        <p className="text-xs font-bold text-primary uppercase">You have records from {purchases.length} active dairy {purchases.length === 1 ? 'owner' : 'owners'}.</p>
      </div>
      
      {purchases.map((purchase) => (
        <OwnerPurchaseSection key={purchase.ownerId} purchase={purchase} />
      ))}
    </div>
  );
}

function OwnerPurchaseSection({ purchase }: { purchase: CustomerPortalProps['purchases'][0] }) {
  const { entries, ownerProfile, ownerSettings } = purchase;
  const { toast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const dateMatch = (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate);
      const paidMatch = onlyUnpaid ? !e.paid : true;
      return dateMatch && paidMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, fromDate, toDate, onlyUnpaid]);

  const stats = useMemo(() => {
    const totalLiters = filteredEntries.reduce((sum, e) => sum + e.milkQuantity, 0);
    const totalAmount = filteredEntries.reduce((sum, e) => sum + e.total, 0);
    const totalPaid = filteredEntries.filter(e => e.paid).reduce((sum, e) => sum + e.total, 0);
    const totalDue = filteredEntries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
    
    const sortedDates = [...filteredEntries].map(e => e.date).sort();
    const startDate = sortedDates.length > 0 ? formatDate(sortedDates[0]) : '--/--/----';
    const endDate = sortedDates.length > 0 ? formatDate(sortedDates[sortedDates.length - 1]) : '--/--/----';

    return { totalLiters, totalAmount, totalPaid, totalDue, startDate, endDate };
  }, [filteredEntries]);

  const upiUri = useMemo(() => {
    if (!ownerProfile?.upiId || stats.totalDue <= 0) return null;
    const payeeName = encodeURIComponent(ownerSettings?.sellerName || ownerProfile.displayName || 'Milk Seller');
    const amount = stats.totalDue.toFixed(2);
    return `upi://pay?pa=${ownerProfile.upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=Milk%20Bill%20Payment`;
  }, [ownerProfile, ownerSettings, stats.totalDue]);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!printAreaRef.current) return null;
    const element = printAreaRef.current;
    const originalStyle = element.style.cssText;
    
    // High-precision capture setup
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
        width: 800,
        height: element.scrollHeight,
        windowWidth: 800
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

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    const blob = await generatePdfBlob();
    setIsGenerating(false);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Milk_Bill_${ownerSettings?.sellerName || ownerProfile?.displayName || 'Dairy'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSharePdf = async () => {
    setIsGenerating(true);
    const blob = await generatePdfBlob();
    setIsGenerating(false);
    if (blob && navigator.share) {
      const file = new File([blob], 'Milk_Bill.pdf', { type: 'application/pdf' });
      try {
        await navigator.share({
          files: [file],
          title: 'Milk Bill',
          text: `Payment due for ${ownerSettings?.sellerName || ownerProfile?.displayName || 'Milk Dairy'}`
        });
      } catch (err) {
        handleDownloadPdf();
      }
    } else {
      handleDownloadPdf();
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 flex flex-wrap justify-between items-end gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-primary uppercase">
            {ownerSettings?.sellerName || ownerProfile?.displayName || 'Active Dairy'}
          </h2>
          <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {ownerProfile?.mobileNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {ownerProfile.mobileNumber}</span>}
            {ownerProfile?.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ownerProfile.address}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="font-black gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating} className="font-black gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Bill
          </Button>
          <Button variant="default" size="sm" onClick={handleSharePdf} disabled={isGenerating} className="bg-emerald-600 font-black gap-2">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button variant="default" size="sm" onClick={() => window.print()} className="bg-primary font-black gap-2">
            <Printer className="h-4 w-4" /> Professional Print
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="no-print p-4 bg-muted/50 border rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase">Start Date</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-10 font-bold" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatDate(fromDate)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase">End Date</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-10 font-bold" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatDate(toDate)}</p>
          </div>
          <div className="flex items-end pb-1">
             <div className="flex items-center space-x-2 border rounded-md px-3 h-10 w-full bg-background">
              <Checkbox id={`unpaid-${purchase.ownerId}`} checked={onlyUnpaid} onCheckedChange={(c) => setOnlyUnpaid(!!c)} />
              <label htmlFor={`unpaid-${purchase.ownerId}`} className="text-xs font-black uppercase cursor-pointer">Unpaid Only</label>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Droplets className="h-6 w-6 text-primary mb-2" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Period Volume</p>
            <p className="text-2xl font-black text-primary">{stats.totalLiters.toFixed(1)} L</p>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-none">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Wallet2 className="h-6 w-6 text-emerald-500 mb-2" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Period Total</p>
            <p className="text-2xl font-black text-emerald-700">₹{stats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className={`border-2 shadow-sm ${stats.totalDue > 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Calculator className={`h-6 w-6 mb-2 ${stats.totalDue > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Total Due</p>
            <p className={`text-2xl font-black ${stats.totalDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>₹{stats.totalDue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <Card className="shadow-none border-dashed">
          <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Delivery History</CardTitle>
            <Badge variant="outline" className="font-bold">{filteredEntries.length} Entries</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-auto">
              {filteredEntries.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground italic text-sm">No entries for the selected range.</div>
              ) : (
                filteredEntries.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-black text-sm">{formatDate(e.date)}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{e.timeOfDay}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{e.milkQuantity}L @ ₹{e.price}/L</p>
                      <Badge variant="outline" className={`text-[9px] font-black uppercase mt-1 ${e.paid ? 'border-emerald-200 text-emerald-600' : 'border-red-200 text-red-600'}`}>
                        {e.paid ? 'PAID' : 'DUE'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {upiUri && (
            <Card className="border-primary/20 bg-primary/5 shadow-lg border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Wallet2 className="h-4 w-4 text-primary" /> Instant Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <div className="bg-white p-4 rounded-2xl shadow-inner border-4 border-primary/10">
                  <QRCodeSVG value={decodeURIComponent(upiUri)} size={160} level="H" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Scan to Pay Now</p>
                  <p className="text-3xl font-black mt-1">₹{stats.totalDue.toLocaleString()}</p>
                </div>
                <Button className="w-full h-14 text-xl font-black shadow-lg shadow-primary/20 bg-primary" onClick={() => window.open(upiUri)}>
                  Instant UPI Pay
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Volume Consumption</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <MilkChart entries={filteredEntries} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Professional Bill Replication for Printing/Downloading */}
      <div id="print-area" ref={printAreaRef} className="hidden print:block font-sans text-black p-10 bg-white min-h-[1120px]">
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div className="flex gap-4 items-center">
            {ownerProfile?.businessLogoBase64 ? (
              <div className="h-20 w-20 overflow-hidden rounded-lg border-2 border-primary/20 bg-white p-1">
                <img src={ownerProfile.businessLogoBase64} alt="Brand Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="h-20 w-20 bg-primary flex items-center justify-center rounded-lg">
                <Droplets className="h-10 w-10 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">{ownerSettings?.sellerName || ownerProfile?.displayName || 'DAIRY LEDGER'}</h1>
              <p className="text-sm font-medium text-gray-600 max-w-[400px] leading-tight mb-2">{ownerProfile?.address || 'Dairy Address'}</p>
              <div className="flex gap-4 text-xs font-bold text-gray-800">
                <span className="flex items-center gap-1">📞 {ownerProfile?.mobileNumber || 'N/A'}</span>
                <span className="flex items-center gap-1">💳 UPI: {ownerProfile?.upiId || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-5xl font-black text-gray-100 mb-2 select-none tracking-tighter uppercase">Invoice</h2>
            <div className="text-xs font-bold uppercase space-y-1">
              <p>Period: <span className="text-gray-600">{stats.startDate} to {stats.endDate}</span></p>
            </div>
          </div>
        </div>
        
        <div className="mb-10 p-4 border-l-4 border-black bg-gray-50/50">
          <h3 className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">CUSTOMER RECORD</h3>
          <p className="text-2xl font-black uppercase leading-tight mb-1">Authenticated Delivery History</p>
          <p className="text-xs font-bold mt-1 uppercase">Generated by Customer Portal</p>
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
            {filteredEntries.map(e => (
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
                  <p className="text-xl font-black">₹{stats.totalDue.toFixed(2)}</p>
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
              <span className="font-black text-lg">{stats.totalLiters.toFixed(2)} L</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-500 font-bold uppercase tracking-tight">Subtotal Amount:</span>
              <span className="font-black text-lg">₹{stats.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-emerald-600">
              <span className="font-bold uppercase tracking-tight">Payments Settled:</span>
              <span className="font-black text-lg">(-) ₹{stats.totalPaid.toFixed(2)}</span>
            </div>
            
            <div className="border-t-4 border-black pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-black tracking-tighter uppercase">Balance Due:</span>
                <span className="text-3xl font-black tracking-tighter">₹{stats.totalDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
