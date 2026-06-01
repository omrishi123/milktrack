"use client";

import React, { useMemo } from 'react';
import { MilkEntry, UserProfile, AppSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplets, Wallet2, Calendar, Phone, MapPin, Calculator, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/lib/utils';
import MilkChart from './MilkChart';

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
          <Droplets className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">No Purchases Found</h2>
        <p className="text-muted-foreground max-w-xs mx-auto">
          Ask your dairy owner to add your phone number to your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {purchases.map((purchase) => (
        <OwnerPurchaseSection key={purchase.ownerId} purchase={purchase} />
      ))}
    </div>
  );
}

function OwnerPurchaseSection({ purchase }: { purchase: CustomerPortalProps['purchases'][0] }) {
  const { entries, ownerProfile, ownerSettings } = purchase;
  
  const stats = useMemo(() => {
    const totalLiters = entries.reduce((sum, e) => sum + e.milkQuantity, 0);
    const totalAmount = entries.reduce((sum, e) => sum + e.total, 0);
    const totalDue = entries.filter(e => !e.paid).reduce((sum, e) => sum + e.total, 0);
    
    return { totalLiters, totalAmount, totalDue };
  }, [entries]);

  const upiUri = useMemo(() => {
    if (!ownerProfile?.upiId || stats.totalDue <= 0) return null;
    const payeeName = encodeURIComponent(ownerSettings?.sellerName || ownerProfile.displayName || 'Milk Seller');
    const amount = stats.totalDue.toFixed(2);
    return `upi://pay?pa=${ownerProfile.upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=Milk%20Bill%20Payment`;
  }, [ownerProfile, ownerSettings, stats.totalDue]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-black text-primary">
          {ownerSettings?.sellerName || ownerProfile?.displayName || 'Unknown Dairy'}
        </h2>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          {ownerProfile?.mobileNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {ownerProfile.mobileNumber}</span>}
          {ownerProfile?.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ownerProfile.address}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Droplets className="h-6 w-6 text-blue-500 mb-2" />
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Milk Received</p>
            <p className="text-2xl font-black text-blue-700">{stats.totalLiters.toFixed(1)} L</p>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Wallet2 className="h-6 w-6 text-emerald-500 mb-2" />
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Bill Amount</p>
            <p className="text-2xl font-black text-emerald-700">₹{stats.totalAmount.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${stats.totalDue > 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Calculator className={`h-6 w-6 mb-2 ${stats.totalDue > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Balance Outstanding</p>
            <p className={`text-2xl font-black ${stats.totalDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>₹{stats.totalDue.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase">Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[400px] overflow-auto">
              {entries.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{formatDate(e.date)}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{e.timeOfDay}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">{e.milkQuantity}L @ ₹{e.price}/L</p>
                    <Badge variant="outline" className={`text-[9px] uppercase mt-1 ${e.paid ? 'border-emerald-200 text-emerald-600' : 'border-red-200 text-red-600'}`}>
                      {e.paid ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {upiUri && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                  <Wallet2 className="h-4 w-4 text-primary" /> Instant Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <div className="bg-white p-4 rounded-xl shadow-inner border">
                  <QRCodeSVG value={decodeURIComponent(upiUri)} size={160} level="H" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Scan with GPay, PhonePe or Paytm</p>
                  <p className="text-2xl font-black mt-2">Pay ₹{stats.totalDue.toFixed(2)}</p>
                </div>
                <Button className="w-full bg-primary" onClick={() => window.open(upiUri)}>
                  Pay Now using UPI
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Consumption Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <MilkChart entries={entries} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
