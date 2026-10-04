import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  type User,
  db,
} from './lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signInWithGoogle: () => Promise<string | null>;
  signInGuest: () => Promise<void>;
  logOut: () => Promise<void>;
  getAccessToken: () => string | null;
}

// In-memory token cache (never stored in localStorage or sessionStorage per skill security constraints)
let cachedAccessToken: string | null = null;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  signInWithGoogle: async () => null,
  signInGuest: async () => {},
  logOut: async () => {},
  getAccessToken: () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        cachedAccessToken = null;
        setAccessToken(null);
      } else {
        // Ensure user document exists in Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(
            userRef,
            {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName:
                currentUser.displayName ||
                (currentUser.isAnonymous ? 'Guest User' : 'Anonymous Voice Artist'),
              photoURL: currentUser.photoURL || '',
              isAnonymous: currentUser.isAnonymous,
              lastLoginAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Failed to sync user document to Firestore:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<string | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      cachedAccessToken = token;
      setAccessToken(token);
      return token;
    } catch (error: any) {
      console.error('Google Sign In Error:', error?.message || error);
      throw error;
    }
  };

  const signInGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error('Guest Sign In Error:', error?.message || error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      cachedAccessToken = null;
      setAccessToken(null);
    } catch (error: any) {
      console.error('Sign Out Error:', error?.message || error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        signInWithGoogle,
        signInGuest,
        logOut,
        getAccessToken: () => cachedAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
