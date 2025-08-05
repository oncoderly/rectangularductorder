import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User
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

// Google ile giriş - TEK POPUP
let googleLoginInProgress = false;

export const loginWithGoogle = async () => {
  // Double-click protection
  if (googleLoginInProgress) {
    console.log('🚫 Auth: Google login already in progress');
    return { success: false, error: 'Giriş işlemi devam ediyor' };
  }

  try {
    console.log('🚀 Auth: Google login started');
    googleLoginInProgress = true;
    
    const result = await signInWithPopup(auth, googleProvider);
    
    console.log('✅ Auth: Google login successful:', result.user.email);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('❌ Auth: Google login failed:', error);
    
    // Popup kapatılırsa error verme
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Giriş işlemi iptal edildi' };
    }
    
    return { success: false, error: error.message };
  } finally {
    googleLoginInProgress = false;
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