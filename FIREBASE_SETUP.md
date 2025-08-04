# Firebase Authentication Kurulum Kılavuzu

Bu projede **Firebase Authentication** kullanarak tam kapsamlı bir kullanıcı giriş sistemi kurulmuştur. Sistem aşağıdaki özellikleri destekler:

- ✉️ **E-posta/Şifre** ile giriş ve kayıt
- 📱 **Telefon numarası** ile SMS doğrulama
- 🌐 **Google OAuth** ile tek tıkla giriş
- 🔐 **Şifre sıfırlama** fonksiyonu
- 👨‍💼 **Admin panel** ve rol yönetimi

## 🚀 Hızlı Kurulum

### 1. Firebase Projesi Oluşturma

1. [Firebase Console](https://console.firebase.google.com/) 'a gidin
2. "Add project" butonuna tıklayın
3. Proje adını girin (örn: `rectangular-duct-order`)
4. Google Analytics'i etkinleştirin (isteğe bağlı)
5. Projeyi oluşturun

### 2. Firebase Authentication Ayarları

1. Firebase Console'da sol menüden **Authentication** 'a tıklayın
2. **Get started** butonuna tıklayın
3. **Sign-in method** sekmesine gidin
4. Aşağıdaki yöntemleri etkinleştirin:

#### Email/Password
- **Email/Password** 'ı etkinleştirin
- **Email link (passwordless sign-in)** 'i isteğe bağlı etkinleştirin

#### Phone
- **Phone** 'u etkinleştirin
- Test telefon numaraları ekleyin (geliştirme için)

#### Google
- **Google** 'ı etkinleştirin
- Project support email adresini seçin

### 3. Firebase Web Uygulaması Kaydetme

1. Firebase Console'da **Project settings** (⚙️) 'e gidin
2. **General** sekmesinde **Your apps** bölümüne gidin
3. **Web app** (</>) ikonuna tıklayın
4. App nickname girin (örn: `duct-order-web`)
5. **Also set up Firebase Hosting** 'i işaretleyin (isteğe bağlı)
6. **Register app** butonuna tıklayın
7. Verilen config bilgilerini kopyalayın

### 4. Environment Variables Ayarlama

#### Client (.env dosyası)
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API URL
VITE_API_URL=http://localhost:3001
```

#### Server (.env dosyası)
```env
# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
```

### 5. Firebase Admin SDK Service Account

1. Firebase Console'da **Project settings** → **Service accounts** 'a gidin
2. **Generate new private key** butonuna tıklayın
3. JSON dosyasını indirin
4. Dosyayı `server/firebase/service-account-key.json` olarak kaydedin
5. **VEYA** JSON içeriğindeki değerleri .env dosyasına ekleyin

## 📱 Özellikler

### ✉️ E-posta/Şifre Girişi
- Kullanıcı kayıt ve giriş
- E-posta doğrulama
- Şifre sıfırlama
- Güçlü şifre politikaları

### 📞 Telefon Girişi
- SMS ile doğrulama kodu
- reCAPTCHA koruması
- Uluslararası telefon formatları
- Test numaraları desteği

### 🌐 Google OAuth
- Tek tıkla giriş
- Profil bilgilerini otomatik alma
- Güvenli token yönetimi

### 👨‍💼 Admin Paneli
- Kullanıcı listesi görüntüleme
- Kullanıcı rolü değiştirme
- Kullanıcı hesaplarını devre dışı bırakma
- Kullanıcı silme

## 🔧 Geliştirme

### Bağımlılıklar Yüklendi ✅
```bash
# Client tarafı
cd client
npm install firebase

# Server tarafı
cd server
npm install firebase-admin
```

### Dosya Yapısı
```
client/
├── src/
│   ├── firebase/
│   │   ├── config.ts          # Firebase konfigürasyonu
│   │   └── auth.ts            # Auth fonksiyonları
│   ├── components/
│   │   └── FirebaseAuth.tsx   # Auth bileşeni
│   └── hooks/
│       └── useFirebaseAuth.ts # Auth hook'u

server/
├── firebase/
│   ├── admin.js                    # Firebase Admin SDK
│   └── service-account-key.json   # Service account key
├── middleware/
│   └── firebase-auth.js            # Auth middleware
└── routes/
    └── firebase-auth.js            # Auth route'ları
```

## 🛡️ Güvenlik

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Kullanıcılar kendi verilerini okuyabilir/yazabilir
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin'ler tüm kullanıcıları görebilir
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

### Firebase Auth Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Production Deployment

### 1. Environment Variables
Production'da aşağıdaki değişkenleri ayarlayın:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY` 
- `FIREBASE_CLIENT_EMAIL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`

### 2. Domain Authorization
Firebase Console'da **Authentication** → **Settings** → **Authorized domains** bölümünde production domain'inizi ekleyin.

### 3. CORS Ayarları
Server tarafında CORS ayarlarını production domain'i için yapılandırın.

## 🎯 Kullanım

### Basit Giriş
```javascript
import { signInWithEmail } from '../firebase/auth';

const login = async () => {
  const result = await signInWithEmail(email, password);
  if (result.success) {
    console.log('Giriş başarılı:', result.user);
  }
};
```

### Admin Kontrolü
```javascript
import { verifyFirebaseToken, requireAdmin } from '../middleware/firebase-auth';

// Admin gerektiren endpoint
app.get('/api/admin/users', verifyFirebaseToken, requireAdmin, (req, res) => {
  // Admin kullanıcılar listesi
});
```

## 🔍 Test

Firebase Auth Emulator ile test:
```bash
# Firebase CLI yükle
npm install -g firebase-tools

# Emulator başlat
firebase emulators:start --only auth

# Test URL: http://localhost:9099
```

## 📞 Destek

Sorun yaşıyorsanız:
1. Firebase Console'da **Authentication** → **Users** bölümünde kullanıcıları kontrol edin
2. Browser Developer Tools'da network ve console log'larını inceleyin
3. Server log'larında Firebase hata mesajlarını kontrol edin

## ⚡ İleri Düzey Özellikler

### Custom Claims (Kullanıcı Rolleri)
```javascript
// Kullanıcıyı admin yap
const { makeUserAdmin } = require('./middleware/firebase-auth');
await makeUserAdmin(userId);
```

### Multi-Factor Authentication
Firebase Console'da **Authentication** → **Settings** → **Multi-factor authentication** 'ı etkinleştirin.

### Rate Limiting
Firebase Auth otomatik olarak rate limiting uygular, ek yapılandırma gerekmez.

---

🔥 **Firebase Authentication sistemi başarıyla kuruldu!** Artık güvenli ve ölçeklenebilir bir kullanıcı giriş sisteminiz var.