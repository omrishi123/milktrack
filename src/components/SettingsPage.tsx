"use client";

import React, { useState, useRef } from 'react';
import { AppSettings, Customer, MilkEntry } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Download, Upload, Cloud, Loader2, ChevronLeft, Save, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, Firestore } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  customers: Customer[];
  milkEntries: MilkEntry[];
  db: Firestore;
  userId: string;
  onBack: () => void;
}

export default function SettingsPage({ 
  settings, 
  onSave, 
  customers, 
  milkEntries, 
  db, 
  userId,
  onBack
}: SettingsPageProps) {
  const [sellerName, setSellerName] = useState(settings.sellerName);
  const [defaultPrice, setDefaultPrice] = useState(settings.defaultPrice.toString());
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSave = () => {
    onSave({
      ...settings,
      sellerName,
      defaultPrice: parseFloat(defaultPrice) || 0,
      darkMode
    });
  };

  const handleExportData = () => {
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      customers: customers.map(({ id, ...rest }) => rest),
      milkEntries: milkEntries.map(({ id, ...rest }) => rest),
      settings: settings
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `milk_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Your backup file has been generated successfully.",
    });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.customers || !data.milkEntries) {
          throw new Error("Invalid backup file format.");
        }

        setIsImporting(true);
        let importedCustomersCount = 0;
        let importedEntriesCount = 0;

        const customerRef = collection(db, 'users', userId, 'customers');
        for (const importedCust of data.customers) {
          const exists = customers.find(c => c.name.toLowerCase() === importedCust.name.toLowerCase());
          if (!exists) {
            const newCust = { ...importedCust, ownerId: userId };
            await addDoc(customerRef, newCust).catch(err => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: customerRef.path,
                operation: 'create',
                requestResourceData: newCust
              }));
            });
            importedCustomersCount++;
          }
        }

        const entriesRef = collection(db, 'users', userId, 'entries');
        for (const importedEntry of data.milkEntries) {
          const newEntry = { ...importedEntry, ownerId: userId };
          await addDoc(entriesRef, newEntry).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: entriesRef.path,
              operation: 'create',
              requestResourceData: newEntry
            }));
          });
          importedEntriesCount++;
        }

        toast({
          title: "Import Successful",
          description: `Added ${importedCustomersCount} new customers and ${importedEntriesCount} milk entries.`,
        });

      } catch (err: any) {
        toast({
          title: "Import Failed",
          description: err.message || "Could not parse the backup file.",
          variant: "destructive"
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ChevronLeft className="h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl">Application Settings</CardTitle>
          <CardDescription>Configure your global preferences and manage data backups.</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold">Business Name (for Reports)</Label>
              <Input 
                value={sellerName} 
                placeholder="e.g. Daily Fresh Dairy"
                onChange={e => setSellerName(e.target.value)} 
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Default Price per Liter (₹)</Label>
              <Input 
                type="number" 
                value={defaultPrice} 
                placeholder="55"
                onChange={e => setDefaultPrice(e.target.value)} 
                className="h-12"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-base font-bold">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark visual themes.</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>

          <div className="pt-8 border-t space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Cloud className="h-5 w-5" />
              <h3>Data Migration & Backups</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-muted/10 border-dashed">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">Export Data</p>
                    <p className="text-xs text-muted-foreground">Download all records as a JSON file.</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleExportData}>
                    Download Backup
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/10 border-dashed">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="bg-emerald-500/10 p-3 rounded-full">
                    <Upload className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold">Import Data</p>
                    <p className="text-xs text-muted-foreground">Restore from a JSON backup file.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2" 
                    disabled={isImporting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Select File'}
                  </Button>
                </CardContent>
              </Card>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleImportData}
            />
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-3 items-start border border-blue-100 dark:border-blue-800">
              <FileJson className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Imported data will be merged with your existing cloud records. If a customer name matches an existing one, only new milk entries will be added.
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/30 border-t pt-6 gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1 bg-primary gap-2">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
