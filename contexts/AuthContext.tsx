import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
    console.group('🔐 Google Sign-In Debug');
    try {
      console.log('1. Starting sign-in process...');
      setError(null);
      setLoading(true);

      if (!auth) {
        throw new Error('Firebase Auth unavailable');
      }
      console.log('2. Auth Service checks out:', {
        hasAuth: !!auth,
        params: googleProvider.getCustomParameters()
      });

      console.log('3. Awaiting Pop-up...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('4. Pop-up Result Success!', { uid: result.user?.uid });

      // Save Access Token for Calendar API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        console.log('5. Access Token captured');
        localStorage.setItem('google_access_token', credential.accessToken);
      }
    } catch (error: any) {
      console.error('❌ Sign In Failed:', error);
      console.error('Error Code:', error.code);
      console.error('Error Message:', error.message);

      let cleanError = 'Failed to sign in with Google';
      if (error.code === 'auth/popup-blocked') cleanError = 'הדפדפן חסם את הפופ-אפ. אנא אשר חלונות קופצים.';
      if (error.code === 'auth/popup-closed-by-user') cleanError = 'חלון ההתחברות נסגר ידנית.';
      if (error.code === 'auth/network-request-failed') cleanError = 'בעיית תקשורת. בדוק את החיבור לאינטרנט.';

      setError(cleanError);
      throw error;
    } finally {
      console.log('🏁 Sign-in process cleanup');
      console.groupEnd();
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      localStorage.removeItem('google_access_token');
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
