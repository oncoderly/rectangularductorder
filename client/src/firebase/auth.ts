import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth';
import { auth } from './config';

// Google Auth Provider (singleton)
const googleProvider = new GoogleAuthProvider();

// Email ile giriş + Email Doğrulama Kontrolü
export const loginWithEmail = async (email: string, password: string) => {
  try {
    console.log('🔐 Auth: Email login started');
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Email doğrulaması kontrolü
    if (!result.user.emailVerified) {
      console.warn('⚠️ Auth: Email not verified');
      return { 
        success: false, 
        error: 'Email adresiniz doğrulanmamış. Lütfen email kutunuzu kontrol edin.',
        needsVerification: true,
        user: result.user
      };
    }
    
    console.log('✅ Auth: Email login successful');
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('❌ Auth: Email login failed:', error);
    return { success: false, error: getFirebaseErrorMessage(error.code) };
  }
};

// Email ile kayıt + Email Doğrulama
export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    console.log('📝 Auth: Email registration started');
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Display name güncelle
    await updateProfile(result.user, { displayName });
    
    // Email doğrulama gönder
    await sendEmailVerification(result.user);
    console.log('📧 Auth: Email verification sent');
    
    console.log('✅ Auth: Email registration successful');
    return { 
      success: true, 
      user: result.user,
      message: 'Kayıt başarılı! Lütfen email adresinizi doğrulayın.'
    };
  } catch (error: any) {
    console.error('❌ Auth: Email registration failed:', error);
    return { success: false, error: getFirebaseErrorMessage(error.code) };
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

// Şifre sıfırlama
export const resetPassword = async (email: string) => {
  try {
    console.log('🔑 Auth: Password reset started');
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Auth: Password reset email sent');
    return { 
      success: true, 
      message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi.' 
    };
  } catch (error: any) {
    console.error('❌ Auth: Password reset failed:', error);
    return { success: false, error: getFirebaseErrorMessage(error.code) };
  }
};

// Email doğrulama tekrar gönder
export const resendEmailVerification = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }
    
    await sendEmailVerification(user);
    console.log('📧 Auth: Email verification resent');
    return { 
      success: true, 
      message: 'Doğrulama emaili tekrar gönderildi.' 
    };
  } catch (error: any) {
    console.error('❌ Auth: Resend verification failed:', error);
    return { success: false, error: getFirebaseErrorMessage(error.code) };
  }
};

// Firebase hata mesajlarını Türkçe'ye çevir
const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Bu email adresi ile kayıtlı kullanıcı bulunamadı.';
    case 'auth/wrong-password':
      return 'Hatalı şifre girdiniz.';
    case 'auth/email-already-in-use':
      return 'Bu email adresi zaten kullanımda.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. En az 6 karakter olmalıdır.';
    case 'auth/invalid-email':
      return 'Geçersiz email adresi.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.';
    case 'auth/network-request-failed':
      return 'İnternet bağlantısı hatası. Lütfen tekrar deneyin.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
};

// Auth state listener helper
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};