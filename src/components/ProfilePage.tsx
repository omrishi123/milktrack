"use client";

import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  LogOut, 
  User, 
  Camera, 
  Loader2, 
  Save, 
  ChevronLeft, 
  Building2, 
  Image as ImageIcon, 
  Mail, 
  ShieldCheck, 
  Smartphone, 
  Lock, 
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { 
  linkWithCredential, 
  EmailAuthProvider, 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  GoogleAuthProvider,
  linkWithPopup
} from 'firebase/auth';

interface ProfilePageProps {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onSignOut: () => void;
  onBack: () => void;
}

export default function ProfilePage({ profile, onSave, onSignOut, onBack }: ProfilePageProps) {
  const auth = useAuth();
  const user = auth.currentUser;
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  // Account Linking States
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkPhone, setLinkPhone] = useState('');
  const [linkOtp, setLinkOtp] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  const businessLogoInputRef = useRef<HTMLInputElement>(null);

  const providers = user?.providerData.map(p => p.providerId) || [];
  const hasEmail = providers.includes('password');
  const hasPhone = providers.includes('phone');
  const hasGoogle = providers.includes('google.com');

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        ...profile,
        // Auto-populate mobile number if signed in via phone and profile is empty
        mobileNumber: prev.mobileNumber || user?.phoneNumber || ''
      }));
    }
  }, [profile, user?.phoneNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLinkEmail = async () => {
    if (!linkEmail || !linkPassword) return;
    setIsLinking(true);
    try {
      const credential = EmailAuthProvider.credential(linkEmail, linkPassword);
      await linkWithCredential(user!, credential);
      toast({ title: "Email Linked", description: "You can now login with this email and password." });
      setLinkEmail('');
      setLinkPassword('');
    } catch (error: any) {
      console.error("Link Email Error:", error);
      toast({ 
        title: "Linking Failed", 
        description: error.message || "Could not link email account.", 
        variant: "destructive" 
      });
    } finally {
      setIsLinking(false);
    }
  };

  const setupRecaptcha = () => {
    if ((window as any).linkVerifier) return (window as any).linkVerifier;
    try {
      const verifier = new RecaptchaVerifier(auth, 'link-recaptcha-container', {
        size: 'invisible'
      });
      (window as any).linkVerifier = verifier;
      return verifier;
    } catch (error) {
      console.error("reCAPTCHA setup failed:", error);
      return null;
    }
  };

  const handleSendLinkOtp = async () => {
    if (!linkPhone) return;
    setIsLinking(true);
    try {
      let formattedPhone = linkPhone.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
      }
      
      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({ title: "OTP Sent", description: "Enter the code to link your phone." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  const handleVerifyLinkOtp = async () => {
    if (!linkOtp || !confirmationResult) return;
    setIsLinking(true);
    try {
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, linkOtp);
      await linkWithCredential(user!, credential);
      toast({ title: "Phone Linked", description: "Account security updated." });
      setShowOtpInput(false);
      setLinkPhone('');
      setLinkOtp('');
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(user!, provider);
      toast({ title: "Google Account Linked", description: "Google sign-in is now enabled for this account." });
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ title: "Google Linking Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsLinking(false);
    }
  };

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
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max size is 10MB.", variant: "destructive" });
        return;
      }
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFormData(prev => ({ ...prev, [field]: compressed }));
        setIsProcessingImage(false);
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
    <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <div id="link-recaptcha-container"></div>
      
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="destructive" size="sm" className="gap-2" onClick={onSignOut}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Branding Card */}
        <Card className="lg:col-span-2 shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle>Business Branding</CardTitle>
            <CardDescription>Visual identity for your invoices and dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex justify-around items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-primary/10">
                    <AvatarImage src={formData.photoBase64} />
                    <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                  </Avatar>
                  <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow" onClick={() => userPhotoInputRef.current?.click()}>
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input type="file" ref={userPhotoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'photoBase64')} />
                </div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">User Photo</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <div className="h-24 w-24 border-4 border-primary/10 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                    {formData.businessLogoBase64 ? (
                      <img src={formData.businessLogoBase64} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow" onClick={() => businessLogoInputRef.current?.click()}>
                    <Building2 className="h-4 w-4" />
                  </Button>
                  <input type="file" ref={businessLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'businessLogoBase64')} />
                </div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Business Logo</span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label className="font-bold">Business / Owner Name</Label>
                <Input name="displayName" value={formData.displayName || ''} onChange={handleChange} placeholder="Full Name" />
              </div>
              <div className="grid gap-2">
                <Label className="font-bold">Mobile Number (Primary)</Label>
                <Input name="mobileNumber" value={formData.mobileNumber || ''} onChange={handleChange} placeholder="+91 00000 00000" />
              </div>
              <div className="grid gap-2">
                <Label className="font-bold">UPI ID (Payments)</Label>
                <Input name="upiId" value={formData.upiId || ''} onChange={handleChange} placeholder="example@upi" />
              </div>
              <div className="grid gap-2">
                <Label className="font-bold">Address</Label>
                <Textarea name="address" value={formData.address || ''} onChange={handleChange} placeholder="Full business address..." rows={3} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t">
            <Button onClick={handleSave} disabled={isSaving || isProcessingImage} className="w-full">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Business Profile
            </Button>
          </CardFooter>
        </Card>

        {/* Security / Linking Card */}
        <Card className="shadow-lg border-emerald-500/10 h-fit">
          <CardHeader className="bg-emerald-500/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Account Security
            </CardTitle>
            <CardDescription>Link more ways to login to this account.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Email Linking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase"><Mail className="h-3 w-3" /> Email</Label>
                {hasEmail ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5"><CheckCircle2 className="h-3 w-3 mr-1" /> Linked</Badge> : <Badge variant="outline" className="text-amber-600 border-amber-200">Not Linked</Badge>}
              </div>
              {hasEmail ? (
                <p className="text-xs text-muted-foreground truncate italic">{user?.email}</p>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Enter Email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} className="h-9 text-xs" />
                  <Input type="password" placeholder="Set Password" value={linkPassword} onChange={e => setLinkPassword(e.target.value)} className="h-9 text-xs" />
                  <Button size="sm" onClick={handleLinkEmail} disabled={isLinking} className="w-full h-9 bg-emerald-600 hover:bg-emerald-700">
                    {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />} Link Email
                  </Button>
                </div>
              )}
            </div>

            {/* Phone Linking */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase"><Smartphone className="h-3 w-3" /> Phone</Label>
                {hasPhone ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5"><CheckCircle2 className="h-3 w-3 mr-1" /> Linked</Badge> : <Badge variant="outline" className="text-amber-600 border-amber-200">Not Linked</Badge>}
              </div>
              {hasPhone ? (
                <p className="text-xs text-muted-foreground italic">{user?.phoneNumber}</p>
              ) : (
                <div className="space-y-2">
                  {!showOtpInput ? (
                    <>
                      <Input placeholder="9876543210" value={linkPhone} onChange={e => setLinkPhone(e.target.value)} className="h-9 text-xs" />
                      <Button size="sm" onClick={handleSendLinkOtp} disabled={isLinking} className="w-full h-9 bg-emerald-600 hover:bg-emerald-700">
                        {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send OTP to Link'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input placeholder="Verification Code" value={linkOtp} onChange={e => setLinkOtp(e.target.value)} className="h-9 text-xs text-center tracking-[0.3em] font-bold" />
                      <Button size="sm" onClick={handleVerifyLinkOtp} disabled={isLinking} className="w-full h-9 bg-blue-600 hover:bg-blue-700">
                        Verify & Link
                      </Button>
                      <button onClick={() => setShowOtpInput(false)} className="text-[10px] text-center w-full text-muted-foreground hover:underline">Change Number</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Google Linking */}
            <div className="border-t pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLinkGoogle} 
                disabled={isLinking || hasGoogle} 
                className={`w-full h-10 font-bold ${hasGoogle ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : ''}`}
              >
                {hasGoogle ? (
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Google Linked</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Link Google Account
                  </span>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 dark:text-blue-300">
                <strong>Pro Tip:</strong> Link all three methods so you never lose access to your records!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground",
    outline: "text-foreground border-input"
  };
  return <div className={`${base} ${variants[variant]} ${className}`}>{children}</div>;
}
