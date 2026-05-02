"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, Customer, MilkEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, Cloud, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, Firestore } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  customers: Customer[];
  milkEntries: MilkEntry[];
  db: Firestore;
  userId: string;
}

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onSave, 
  customers, 
  milkEntries, 
  db, 
  userId 
}: SettingsModalProps) {
  const [sellerName, setSellerName] = useState(settings.sellerName);
  const [defaultPrice, setDefaultPrice] = useState(settings.defaultPrice.toString());
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setSellerName(settings.sellerName);
    setDefaultPrice(settings.defaultPrice.toString());
    setDarkMode(settings.darkMode);
  }, [settings, isOpen]);

  const handleSave = () => {
    onSave({
      ...settings,
      sellerName,
      defaultPrice: parseFloat(defaultPrice) || 0,
      darkMode
    });
    onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>Your preferences are saved to your cloud profile.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-2">
          <div className="space-y-6 pb-6">
            <div className="space-y-2 mt-2">
              <Label>Business Name (for Reports)</Label>
              <Input 
                value={sellerName} 
                placeholder="e.g. Daily Fresh Dairy"
                onChange={e => setSellerName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Default Price per Liter (₹)</Label>
              <Input 
                type="number" 
                value={defaultPrice} 
                placeholder="55"
                onChange={e => setDefaultPrice(e.target.value)} 
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Adjust visuals for low light.</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="pt-4 border-t space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" /> Data Migration
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleExportData}
                >
                  <Download className="h-4 w-4" /> Export JSON
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import JSON
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".json" 
                  onChange={handleImportData}
                />
              </div>
              <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
                Use these tools to move data between accounts. Imported data will be merged with your existing records.
              </p>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="p-6 pt-2 border-t gap-2 sm:gap-0">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
