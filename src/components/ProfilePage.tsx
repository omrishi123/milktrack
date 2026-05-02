"use client";

import React, { useState, useRef } from 'react';
import { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LogOut, User, Camera, Loader2, Save, ChevronLeft } from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onSignOut: () => void;
  onBack: () => void;
}

export default function ProfilePage({ profile, onSave, onSignOut, onBack }: ProfilePageProps) {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ChevronLeft className="h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-lg border-primary/10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">User Profile</CardTitle>
          <CardDescription>Update your personal information and profile picture.</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-xl transition-transform group-hover:scale-105">
                <AvatarImage src={formData.photoBase64} />
                <AvatarFallback className="bg-muted text-4xl">
                  <User className="h-16 w-16 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute bottom-1 right-1 rounded-full h-10 w-10 shadow-lg border-2 border-background"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5" />
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>
            <p className="text-sm text-muted-foreground italic">Click camera icon to change photo</p>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="displayName" className="font-bold">Full Name</Label>
              <Input
                id="displayName"
                name="displayName"
                value={formData.displayName || ''}
                onChange={handleChange}
                placeholder="Your Name"
                className="h-12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-bold text-muted-foreground">Email (Read-only)</Label>
              <Input
                id="email"
                name="email"
                value={formData.email || ''}
                disabled
                className="bg-muted h-12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobileNumber" className="font-bold">Mobile Number</Label>
              <Input
                id="mobileNumber"
                name="mobileNumber"
                value={formData.mobileNumber || ''}
                onChange={handleChange}
                placeholder="+91 00000 00000"
                className="h-12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upiId" className="font-bold">UPI ID (for payments)</Label>
              <Input
                id="upiId"
                name="upiId"
                value={formData.upiId || ''}
                onChange={handleChange}
                placeholder="example@upi"
                className="h-12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address" className="font-bold">Business/Home Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                placeholder="Full address for bills..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6 bg-muted/30">
          <Button variant="destructive" className="w-full sm:w-auto gap-2" onClick={onSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
          <div className="flex gap-2 w-full sm:ml-auto">
            <Button variant="outline" className="flex-1" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1 min-w-[140px]">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Profile
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
