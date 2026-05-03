"use client";

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Droplets, Mail, Lock, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    // Force select account to prevent silent failures on some browsers
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
          description: error.message || "Failed to sign in with Google. Ensure authorized domains are set in Firebase Console.", 
          variant: "destructive" 
        });
      }
    } finally {
      // Small delay to allow onAuthStateChanged to pick up the user before turning off spinner
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
            {isLogin ? 'Welcome back! Please sign in' : 'Create an account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
      
      {/* Hidden disclaimer about authorized domains for developer context */}
      <div className="fixed bottom-4 left-4 text-[10px] text-muted-foreground opacity-20 hover:opacity-100 transition-opacity">
        Tip: Google Sign-in requires authorized domains in Firebase Console.
      </div>
    </div>
  );
}
