
"use client";

import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const auth = getAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      toast({ title: "Auth Error", description: error.message, variant: "destructive" });
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      toast({ title: "Google Sign In Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-color)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-[var(--heading-color)]">Milk Tracker Pro</CardTitle>
          <CardDescription className="text-center">Please sign in to manage your milk records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full btn-primary h-12">
              {isLogin ? 'Login' : 'Sign Up'}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
          </div>
          <Button variant="outline" onClick={handleGoogleSignIn} className="w-full h-12">
            Sign in with Google
          </Button>
          <p className="text-center text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[var(--heading-color)] font-semibold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
