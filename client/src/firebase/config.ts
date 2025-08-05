import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase yapılandırma
const firebaseConfig = {
  apiKey: "AIzaSyBNNQVBlR0ODKicHPv2hYQFaS3t3oEBIWw",
  authDomain: "ductorder-bd79a.firebaseapp.com",
  projectId: "ductorder-bd79a",
  storageBucket: "ductorder-bd79a.firebasestorage.app",
  messagingSenderId: "770259223189",
  appId: "1:770259223189:web:5a06c47783926aad9bd19c"
};

// Firebase'i initialize et
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

export { auth, db };
export default app;