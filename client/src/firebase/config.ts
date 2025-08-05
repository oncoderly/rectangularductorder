// Firebase kütüphanesinden gerekli fonksiyonları içe aktarıyoruz
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// .env dosyasından Firebase yapılandırma bilgilerini alıyoruz
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase uygulamasını başlatıyoruz
const app = initializeApp(firebaseConfig);

// Firebase servislerini dışa aktarıyoruz
export const db = getFirestore(app); // Veritabanı
export const auth = getAuth(app); // Kimlik doğrulama
export const storage = getStorage(app); // Dosya depolama
export default app;