import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth';
import { auth } from './config';

// Google Auth Provider (singleton) - Enhanced
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile'); 
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

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

  googleLoginInProgress = true;

  console.log('🚀 Auth: Google login started (redirect mode)');
  try {
    // İlk olarak redirect dene
    await signInWithRedirect(auth, googleProvider);
    console.log('🔄 Auth: Redirecting to Google...');
    return { success: true, message: 'Google\'a yönlendiriliyor...' };
  } catch (redirectError: any) {
    console.warn('⚠️ Auth: Redirect failed, trying popup instead', redirectError);

    try {
      // Redirect başarısız olursa popup'a düş
      const popupResult = await signInWithPopup(auth, googleProvider);
      console.log('✅ Auth: Popup login successful');
      return { success: true, user: popupResult.user };
    } catch (error: any) {
      console.error('❌ Auth: Google login failed:', error);
      return { success: false, error: error.message };
    } finally {
      googleLoginInProgress = false;
    }
  }
};

// Redirect sonucunu kontrol et (sayfa yüklendiğinde) - Enhanced
export const handleGoogleRedirectResult = async () => {
  try {
    console.log('🔍 Auth: Checking for redirect result...');
    console.log('🌍 Auth: Current URL:', window.location.href);
    console.log('🔥 Auth: Firebase auth instance:', !!auth);
    console.log('🔍 Auth: Auth instance details:', {
      app: auth.app?.name,
      config: auth.config,
      currentUser: !!auth.currentUser
    });
    
    const result = await getRedirectResult(auth);
    console.log('🔍 Auth: Raw redirect result:', result);
    console.log('🔍 Auth: Redirect result type:', typeof result);
    console.log('🔍 Auth: Redirect result null?', result === null);
    console.log('🔍 Auth: Redirect result undefined?', result === undefined);
    
    if (result) {
      console.log('✅ Auth: Google redirect successful!');
      console.log('👤 Auth: User details:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        emailVerified: result.user.emailVerified,
        photoURL: result.user.photoURL
      });
      console.log('🆔 Auth: Additional info:', (result as any).additionalUserInfo);
      console.log('🔑 Auth: Credential:', (result as any).credential);
      console.log('🌐 Auth: Provider ID:', (result as any).providerId);
      
      googleLoginInProgress = false;
      
      // Firebase Auth state otomatik olarak güncellenecek
      return { 
        success: true, 
        user: result.user,
        isNewUser: (result as any).additionalUserInfo?.isNewUser || false
      };
    } else {
      console.log('ℹ️ Auth: No redirect result found');
      console.log('🔍 Auth: result is exactly:', result);
      console.log('🔍 Auth: Checking if user is already logged in...');
      
      const currentUser = auth.currentUser;
      console.log('👤 Auth: Current user from auth:', currentUser);
      if (currentUser) {
        console.log('👤 Auth: User already logged in:', currentUser.email);
        return { 
          success: true, 
          user: currentUser,
          isNewUser: false
        };
      }
      
      googleLoginInProgress = false;
      return { success: false, error: 'No redirect result' };
    }
  } catch (error: any) {
    console.error('❌ Auth: Google redirect result error:', error);
    console.error('❌ Auth: Error code:', error.code);
    console.error('❌ Auth: Error message:', error.message);
    console.error('❌ Auth: Full error object:', error);
    
    googleLoginInProgress = false;
    
    // Detaylı hata mesajı
    let errorMessage = 'Google ile giriş başarısız';
    if (error.code === 'auth/unauthorized-domain') {
      errorMessage = 'Domain yetkisiz - Firebase Console authorized domains kontrol edin';
    } else if (error.code === 'auth/configuration-not-found') {
      errorMessage = 'Firebase konfigürasyon hatası';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Popup kapatıldı';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Popup iptal edildi';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup engellenmiş';
    }
    
    return { success: false, error: errorMessage, code: error.code };
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