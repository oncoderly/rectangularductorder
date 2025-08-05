import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User
} from 'firebase/auth';
import { auth } from './config';

// Google Auth Provider (singleton)
const googleProvider = new GoogleAuthProvider();

// Email ile giriş
export const loginWithEmail = async (email: string, password: string) => {
  try {
    console.log('🔐 Auth: Email login started');
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Auth: Email login successful');
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('❌ Auth: Email login failed:', error);
    return { success: false, error: error.message };
  }
};

// Email ile kayıt
export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    console.log('📝 Auth: Email registration started');
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Display name güncelle
    await updateProfile(result.user, { displayName });
    
    console.log('✅ Auth: Email registration successful');
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('❌ Auth: Email registration failed:', error);
    return { success: false, error: error.message };
  }
};

// Google ile giriş - REDIRECT (Production Safe)
let googleLoginInProgress = false;

export const loginWithGoogle = async () => {
  // Double-click protection
  if (googleLoginInProgress) {
    console.log('🚫 Auth: Google login already in progress');
    return { success: false, error: 'Giriş işlemi devam ediyor' };
  }

  try {
    console.log('🚀 Auth: Google login started (redirect mode)');
    googleLoginInProgress = true;
    
    // Redirect kullan - popup yerine
    await signInWithRedirect(auth, googleProvider);
    
    // Redirect başlatıldı
    console.log('🔄 Auth: Redirecting to Google...');
    return { success: true, message: 'Google\'a yönlendiriliyor...' };
  } catch (error: any) {
    console.error('❌ Auth: Google redirect failed:', error);
    googleLoginInProgress = false;
    return { success: false, error: error.message };
  }
};

// Redirect sonucunu kontrol et (sayfa yüklendiğinde)
export const handleGoogleRedirectResult = async () => {
  try {
    console.log('🔍 Auth: Checking for redirect result...');
    const result = await getRedirectResult(auth);
    
    if (result) {
      console.log('✅ Auth: Google redirect successful:', result.user.email);
      googleLoginInProgress = false;
      return { success: true, user: result.user };
    } else {
      console.log('ℹ️ Auth: No redirect result found');
      googleLoginInProgress = false;
      return { success: false, error: 'No redirect result' };
    }
  } catch (error: any) {
    console.error('❌ Auth: Google redirect result error:', error);
    googleLoginInProgress = false;
    return { success: false, error: error.message };
  }
};

// Çıkış
export const logout = async () => {
  try {
    console.log('👋 Auth: Logout started');
    await firebaseSignOut(auth);
    console.log('✅ Auth: Logout successful');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Auth: Logout failed:', error);
    return { success: false, error: error.message };
  }
};

// Auth state listener helper
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};