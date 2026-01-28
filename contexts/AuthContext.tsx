import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
// googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly'); // REMOVED to prevent "Unverified App" warning
googleProvider.setCustomParameters({
  prompt: 'select_account consent'
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSigningIn = React.useRef(false); // Concurrency Lock

  useEffect(() => {
    // 1. Check for Redirect Result (Recovers from Redirect Fallback)
    getRedirectResult(auth).then((result) => {
      if (result) {
        console.log('🔗 Recovered from Redirect Sign-In', { uid: result.user.uid });
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          localStorage.setItem('google_access_token', credential.accessToken);
        }
      }
    }).catch((error) => {
      console.error('🔗 Redirect Result Error:', error);
      setError('Failed to complete sign-in from redirect.');
    });

    // 2. Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('👤 Auth State Changed:', { email: user?.email, uid: user?.uid });
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isSigningIn.current) {
      console.warn('⚠️ Sign-in already in progress. Ignoring duplicate click.');
      return;
    }
    isSigningIn.current = true;
    console.group('🔐 Google Sign-In Debug');

    try {
      console.log('1. Starting sign-in process...');
      setError(null);
      setLoading(true);

      if (!auth) throw new Error('Firebase Auth unavailable');

      console.log('2. Attempting POPUP sign-in...');
      const result = await signInWithPopup(auth, googleProvider);

      console.log('3. Pop-up Success!', { uid: result.user?.uid });
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
      }

    } catch (error: any) {
      console.error('❌ Sign In Failed:', error);

      // FALLBACK TO REDIRECT if Popup fails
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn('⚠️ Popup failed/blocked. Falling back to REDIRECT strategy...');
        try {
          await signInWithRedirect(auth, googleProvider);
          // The page will redirect, so no further code execution usually happens here
          return;
        } catch (redirectError) {
          console.error('❌ Redirect Fallback Failed:', redirectError);
          setError('Sign-in failed. Please disable popup blockers or try a different browser.');
        }
      } else {
        setError(error.message || 'Failed to sign in with Google');
      }
    } finally {
      console.log('🏁 Sign-in process cleanup');
      console.groupEnd();
      isSigningIn.current = false;
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      console.log('👋 Signing out...');

      // Aggressive Cleanup
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('firebase:authUser:' + auth.config.apiKey + ':[DEFAULT]');
      sessionStorage.clear(); // Clear any session debris

      await firebaseSignOut(auth);
      console.log('✅ Sign out complete');
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signInWithGoogle,
    signIn: signInWithGoogle, // Alias for easier usage
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
