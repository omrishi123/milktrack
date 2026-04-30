"use client";

import React, { useState } from 'react';
import { AppSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Save, X, RefreshCw } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onCancel: () => void;
  onResetData: () => void;
}

export default function SettingsView({ settings, onSave, onCancel, onResetData }: SettingsViewProps) {
  const [sellerName, setSellerName] = useState(settings.sellerName);
  const [defaultPrice, setDefaultPrice] = useState(settings.defaultPrice.toString());
  const [darkMode, setDarkMode] = useState(settings.darkMode);

  const handleSave = () => {
    onSave({
      sellerName,
      defaultPrice: parseFloat(defaultPrice) || 0,
      darkMode,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>Configure your business profile and default preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sellerName">Your Name / Business Name (for Invoices)</Label>
            <Input
              id="sellerName"
              placeholder="e.g., Ankit Dairy Farm"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="defaultPrice">Default Price per Liter (₹)</Label>
            <Input
              id="defaultPrice"
              type="number"
              placeholder="e.g., 55"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
            <div className="space-y-0.5">
              <Label className="text-base">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Switch between light and dark visual themes.</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="mr-2 h-4 w-4" /> Save Preferences
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Actions in this section are irreversible.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive/10 rounded-lg bg-destructive/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-sm">Reset All Application Data</p>
                <p className="text-xs text-muted-foreground">Delete all customers, entries, and settings from local storage.</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => {
              if (confirm("Are you absolutely sure? This will delete all your customer records and delivery history.")) {
                onResetData();
              }
            }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset Everything
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}