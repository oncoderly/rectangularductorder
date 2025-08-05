// Firebase kütüphanesinden gerekli fonksiyonları içe aktarıyoruz
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase yapılandırma bilgileri - production için hardcode
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBNNQVBlR0ODKicHPv2hYQFaS3t3oEBIWw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ductorder-bd79a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ductorder-bd79a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ductorder-bd79a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "770259223189",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:770259223189:web:5a06c47783926aad9bd19c"
};

// Check if Firebase config is valid
const isValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

if (isValidConfig) {
  try {
    // Firebase uygulamasını başlatıyoruz (singleton check)
    app = initializeApp(firebaseConfig);
    
    // Firebase servislerini dışa aktarıyoruz (singleton check)
    db = getFirestore(app); // Veritabanı
    auth = getAuth(app); // Kimlik doğrulama - singleton kullanır
    storage = getStorage(app); // Dosya depolama
    
    console.log('✅ Firebase initialized successfully');
    console.log('🔍 Firebase app:', !!app);
    console.log('🔍 Firebase auth:', !!auth);
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn('⚠️ Firebase config invalid - Firebase features disabled');
}

export { db, auth, storage };
export default app;