
"use client";

import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

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
  }, [settings]);

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
      <DialogContent className="sm:max-w-md bg-[var(--card-bg-color)]">
        <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Business Name (for Invoices)</Label>
            <Input value={sellerName} onChange={e => setSellerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Default Price per Liter (₹)</Label>
            <Input type="number" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Dark Mode</Label>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSave} className="btn-primary">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
