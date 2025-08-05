import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  // User
} from 'firebase/auth';
import { auth } from './config';

// Email/Password ile giriş
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Email/Password ile kayıt
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Kullanıcı adını güncelle
    await updateProfile(result.user, {
      displayName: displayName
    });
    
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Google ile giriş - popup kullan (production-safe)
export const signInWithGoogle = async () => {
  try {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    
    const provider = new GoogleAuthProvider();
    
    // Popup kullan (retry logic ile)
    try {
      console.log('🔍 Attempting Google popup login...');
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Google popup login successful');
      return { success: true, user: result.user };
    } catch (popupError: any) {
      console.log('❌ Popup failed, trying redirect fallback:', popupError.code);
      
      // Popup fail olursa redirect kullan
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request') {
        
        console.log('🔄 Falling back to redirect...');
        await signInWithRedirect(auth, provider);
        return { success: true, message: 'Redirecting to Google...' };
      }
      
      throw popupError;
    }
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error.message };
  }
};

// Redirect sonrası sonucu kontrol et
export const handleRedirectResult = async () => {
  try {
    if (!auth) {
      return { success: false, error: 'Firebase auth not initialized' };
    }
    
    console.log('🔍 Checking redirect result...');
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('✅ Redirect result found:', result.user?.email);
      return { success: true, user: result.user };
    }
    console.log('ℹ️ No redirect result');
    return { success: false, error: 'No redirect result' };
  } catch (error: any) {
    console.error('❌ Redirect result error:', error);
    return { success: false, error: error.message };
  }
};

// Telefon numarası ile giriş (reCAPTCHA gerekli)
export const signInWithPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return { success: true, confirmationResult };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Çıkış yap
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Şifre sıfırlama
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// reCAPTCHA verifier oluştur
export const createRecaptchaVerifier = (containerId: string) => {
  return new RecaptchaVerifier(auth, containerId, {
    'size': 'normal',
    'callback': () => {
      // reCAPTCHA solved - will proceed with submit function
    }
  });
};