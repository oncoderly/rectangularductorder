import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
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

// Google ile giriş
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error: any) {
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