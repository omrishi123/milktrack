
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LogOut, User, Camera, Loader2, Save, ChevronLeft, Building2, Image as ImageIcon, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfilePageProps {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onSignOut: () => void;
  onBack: () => void;
}

export default function ProfilePage({ profile, onSave, onSignOut, onBack }: ProfilePageProps) {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  const businessLogoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync formData with props when they change (e.g., when Firestore data finally loads)
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        ...profile
      }));
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Resizes and compresses images to stay under Firestore 1MB limit.
   */
  const compressImage = (base64Str: string, maxWidth = 500, maxHeight = 500): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress as JPEG with 0.7 quality to significantly reduce size
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photoBase64' | 'businessLogoBase64') => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check for immediate feedback (10MB limit before processing)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }

      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalBase64 = reader.result as string;
        try {
          const compressed = await compressImage(originalBase64);
          setFormData(prev => ({ ...prev, [field]: compressed }));
        } catch (err) {
          console.error("Image processing failed:", err);
          toast({ title: "Processing Error", description: "Failed to process image.", variant: "destructive" });
        } finally {
          setIsProcessingImage(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ChevronLeft className="h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-lg border-primary/10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">Business Profile</CardTitle>
          <CardDescription>Update your personal information and business branding.</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-6">
          <div className="flex flex-col sm:flex-row justify-around items-center gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl transition-transform group-hover:scale-105">
                  <AvatarImage src={formData.photoBase64} />
                  <AvatarFallback className="bg-muted text-2xl">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-lg border-2 border-background"
                  onClick={() => userPhotoInputRef.current?.click()}
                  disabled={isProcessingImage}
                >
                  {isProcessingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
                <input 
                  type="file" 
                  ref={userPhotoInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, 'photoBase64')} 
                />
              </div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">User Photo</p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="h-24 w-24 border-4 border-emerald-500/20 rounded-xl overflow-hidden shadow-xl bg-muted flex items-center justify-center transition-transform group-hover:scale-105">
                  {formData.businessLogoBase64 ? (
                    <img src={formData.businessLogoBase64} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-lg border-2 border-background"
                  onClick={() => businessLogoInputRef.current?.click()}
                  disabled={isProcessingImage}
                >
                  {isProcessingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                </Button>
                <input 
                  type="file" 
                  ref={businessLogoInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, 'businessLogoBase64')} 
                />
              </div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Business Logo</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-bold flex items-center gap-2">
                <Mail className="h-4 w-4" /> Registered Email
              </Label>
              <Input
                id="email"
                value={formData.email || ''}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed h-12"
              />
            </div>
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
            <Button onClick={handleSave} disabled={isSaving || isProcessingImage} className="flex-1 min-w-[140px]">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Profile
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
