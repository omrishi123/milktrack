"use client";

import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Download, Upload, Cloud } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [sellerName, setSellerName] = useState(settings.sellerName);
  const [defaultPrice, setDefaultPrice] = useState(settings.defaultPrice.toString());
  const [darkMode, setDarkMode] = useState(settings.darkMode);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>Your preferences are saved to your cloud profile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
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

          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Cloud className="h-4 w-4" /> Cloud Status
            </h4>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              All data is automatically synced to your secure cloud database. No manual backup is required.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
