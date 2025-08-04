import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Firebase ID token'ını al
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          
          // Axios için default authorization header'ını ayarla
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Server'dan kullanıcı profilini al
          const response = await axios.get(`${API_URL}/api/firebase/me`);
          setUser(response.data.user);
          
        } catch (error) {
          console.error('❌ Firebase Auth: Failed to get user profile:', error);
          
          // Fallback: Firebase'den temel bilgileri al
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            role: 'user'
          };
          setUser(user);
        }
      } else {
        setUser(null);
        setIdToken(null);
        // Authorization header'ını temizle
        delete axios.defaults.headers.common['Authorization'];
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Token yenileme fonksiyonu
  const refreshToken = async () => {
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true); // Force refresh
        setIdToken(token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return token;
      } catch (error) {
        console.error('❌ Firebase Auth: Failed to refresh token:', error);
        return null;
      }
    }
    return null;
  };

  return {
    user,
    loading,
    idToken,
    refreshToken
  };
};