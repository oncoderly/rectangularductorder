const admin = require('firebase-admin');
const path = require('path');

// Service account key dosyasının yolu
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

let app;
let auth;
let db;

// Firebase ayarlarını kontrol et
function checkFirebaseConfig() {
  const requiredVars = ['FIREBASE_PROJECT_ID'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Firebase Admin SDK configuration missing:');
    missing.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('🛠️ Firebase özellikleri devre dışı - geliştirme için normal');
    return false;
  }
  
  return true;
}

try {
  if (!checkFirebaseConfig()) {
    throw new Error('Firebase configuration incomplete');
  }

  // Service account key dosyası ile dene
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    
    console.log('🔥 Firebase Admin initialized with service account key');
  } catch (fileError) {
    // Service account dosyası yoksa environment variables ile dene
    console.log('📄 Service account key file not found, trying environment variables...');
    
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_EMAIL ? 
        `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}` : undefined
    };

    // Tüm required alanları kontrol et
    const requiredFields = ['project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field] || serviceAccount[field] === 'undefined');
    
    if (missingFields.length > 0) {
      throw new Error(`Missing Firebase service account fields: ${missingFields.join(', ')}`);
    }

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    
    console.log('🔥 Firebase Admin initialized with environment variables');
  }
  
  // Servisleri ayarla
  auth = admin.auth();
  db = admin.firestore();
  
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK initialization failed:', error.message);
  console.warn('🛠️ Firebase özellikleri devre dışı - sadece eski auth sistemi çalışacak');
  console.warn('📖 Kurulum için FIREBASE_SETUP.md dosyasına bakın');
  
  // Dummy servisleri oluştur (error handling için)
  auth = {
    verifyIdToken: () => Promise.reject(new Error('Firebase not configured')),
    listUsers: () => Promise.reject(new Error('Firebase not configured')),
    createUser: () => Promise.reject(new Error('Firebase not configured')),
    updateUser: () => Promise.reject(new Error('Firebase not configured')),
    deleteUser: () => Promise.reject(new Error('Firebase not configured')),
    setCustomUserClaims: () => Promise.reject(new Error('Firebase not configured')),
    getUserByEmail: () => Promise.reject(new Error('Firebase not configured')),
    getUser: () => Promise.reject(new Error('Firebase not configured'))
  };
  
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firebase not configured')),
        set: () => Promise.reject(new Error('Firebase not configured')),
        delete: () => Promise.reject(new Error('Firebase not configured'))
      })
    })
  };
}

// Auth ve Firestore servislerini export et - yukarıda zaten tanımlandı

module.exports = {
  admin,
  auth,
  db,
  app
};