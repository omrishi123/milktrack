'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { useAuth } from '../provider';

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, [auth]);

  const signOut = () => firebaseSignOut(auth);

  return { user, loading, signOut };
}
