"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Droplets, Mail, Lock, Phone, MessageSquare, ArrowRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset OTP state when switching tabs or views
    if (!showOtpInput) {
      setOtp('');
    }
  }, [showOtpInput]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!isLogin && !password)) return;
    
    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        toast({ title: "Account Created", description: "Welcome to Milk Tracker Pro!" });
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let message = "An error occurred during authentication.";
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = "No account found with this email.";
          break;
        case 'auth/wrong-password':
          message = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-credential':
          message = "Invalid email or password. Please check your details.";
          break;
        case 'auth/email-already-in-use':
          message = "This email is already registered. Try logging in.";
          break;
        case 'auth/weak-password':
          message = "Password should be at least 6 characters.";
          break;
        case 'auth/invalid-email':
          message = "Please enter a valid email address.";
          break;
        case 'auth/too-many-requests':
          message = "Too many failed attempts. Please try again later.";
          break;
      }
      
      toast({ 
        title: "Authentication Failed", 
        description: message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return (window as any).recaptchaVerifier;
    
    try {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (error) {
      console.error("reCAPTCHA setup failed:", error);
      return null;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast({ title: "Phone Required", description: "Please enter your mobile number.", variant: "destructive" });
      return;
    }

    // Format phone number for India if no country code provided
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
    }

    setIsLoading(true);
    try {
      const verifier = setupRecaptcha();
      if (!verifier) throw new Error("Could not initialize reCAPTCHA.");
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({ title: "OTP Sent", description: `Verification code sent to ${formattedPhone}` });
    } catch (error: any) {
      console.error("Phone Auth Error:", error);
      let message = error.message || "Could not send OTP.";
      
      if (error.code === 'auth/captcha-check-failed' || error.message?.includes('Hostname')) {
        message = "Domain not authorized. Go to Firebase Console > Auth > Settings and add this domain to 'Authorized Domains'.";
      } else if (error.code === 'auth/invalid-phone-number') {
        message = "The phone number is invalid. Please use 10 digits.";
      }

      toast({ 
        title: "OTP Failed", 
        description: message, 
        variant: "destructive" 
      });

      // Reset reCAPTCHA if it failed
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.render().then((widgetId: any) => {
            (window as any).recaptchaVerifier.reset(widgetId);
          });
        } catch (resetErr) {
          console.error("Verifier reset error:", resetErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;

    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast({ title: "Success", description: "Logged in successfully via Phone!" });
    } catch (error: any) {
      console.error("OTP Verification Error:", error);
      toast({ 
        title: "Verification Failed", 
        description: "Invalid OTP. Please check the code and try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      if (!result.user) {
        throw new Error("No user found after Google sign-in.");
      }
    } catch (error: any) {
      console.error("Google Sign In Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ 
          title: "Google Sign In Error", 
          description: error.message || "Failed to sign in with Google.", 
          variant: "destructive" 
        });
      }
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ 
        title: "Email Required", 
        description: "Please enter your email address to receive a reset link.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ 
        title: "Reset Email Sent", 
        description: "Check your inbox for instructions to reset your password." 
      });
    } catch (error: any) {
      toast({ 
        title: "Reset Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-color)] p-4">
      <div id="recaptcha-container"></div>
      
      <Card className="w-full max-w-md shadow-2xl border-primary/10 overflow-hidden">
        <div className="h-2 bg-primary"></div>
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <Droplets className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-center text-[var(--heading-color)]">
            Milk Tracker Pro
          </CardTitle>
          <CardDescription className="text-center text-base">
            Manage your daily milk records with ease
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="phone" className="font-bold">Phone (OTP)</TabsTrigger>
              <TabsTrigger value="email" className="font-bold">Email</TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-4">
              {!showOtpInput ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="pl-10 h-12"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Code +91 will be added automatically for India.</p>
                  </div>
                  <Button type="submit" className="w-full btn-primary h-12 text-lg font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">Send OTP <ArrowRight className="h-4 w-4" /></span>
                    )}
                  </Button>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-3 items-start border border-blue-100 dark:border-blue-800">
                    <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Ensure your website URL is added to "Authorized Domains" in the Firebase Console to enable OTP login.
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="otp" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enter 6-Digit Code</Label>
                      <button 
                        type="button" 
                        onClick={() => setShowOtpInput(false)}
                        className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        <ChevronLeft className="h-3 w-3" /> Change Number
                      </button>
                    </div>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        className="pl-10 h-12 text-center text-xl tracking-[0.5em] font-black"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold shadow-lg shadow-emerald-500/20" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      'Verify & Login'
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!isResetting}
                      className="pl-10 h-12"
                      disabled={isLoading}
                    />
                  </div>
                  {isLogin && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={isResetting || isLoading}
                        className="text-xs text-primary font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
                      >
                        {isResetting && <Loader2 className="h-3 w-3 animate-spin" />}
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full btn-primary h-12 text-lg font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </Button>
              </form>
              
              <div className="pt-2 text-center text-sm">
                {isLogin ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      onClick={() => setIsLogin(false)}
                      disabled={isLoading}
                      className="text-primary font-black hover:underline disabled:opacity-50"
                    >
                      Sign Up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      onClick={() => setIsLogin(true)}
                      disabled={isLoading}
                      className="text-primary font-black hover:underline disabled:opacity-50"
                    >
                      Log In
                    </button>
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-bold">Or continue with</span>
            </div>
          </div>

          <Button variant="outline" onClick={handleGoogleSignIn} className="w-full h-12 font-bold bg-background hover:bg-muted/50 transition-colors" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
