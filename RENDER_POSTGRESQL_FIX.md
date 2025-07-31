# 🐘 Render.com PostgreSQL Sorun Çözüm Rehberi

## ❌ Sorun: Kayıtlar PostgreSQL'e kaydedilmiyor ve siliniyor

### 🔍 Sorunun Nedenleri:
1. **DATABASE_URL environment variable'ının eksik olması**
2. **PostgreSQL bağlantısının başarısız olması**
3. **Veritabanı tablolarının oluşturulmaması**
4. **Migration sürecinde veri kaybı**

## ✅ Çözüm Adımları

### 1️⃣ Render.com Dashboard'da Environment Variables Kontrolü

1. [Render.com Dashboard](https://dashboard.render.com)'a git
2. **Web Service**'inizi seçin (`rectangularductorder-server`)
3. **"Environment"** sekmesine gidin
4. Aşağıdaki environment variables'ların **MUTLAKA** ayarlı olduğunu kontrol edin:

```env
# CRITICAL - PostgreSQL Database URL
DATABASE_URL=postgresql://rectangularduct_user:WvlaSwkbrZlDVBV1gc34RCKCO5PF3aGC@dpg-d23m9kali9vc73f85n40-a.frankfurt-postgres.render.com/rectangularductorder_db

# CRITICAL - Force PostgreSQL usage
USE_POSTGRESQL=true

# Session Secret
SESSION_SECRET=rectangularduct-super-secret-key-2024

# Client URL
CLIENT_URL=https://rectangularductorder.onrender.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=havakanalsiparis@gmail.com
SMTP_PASSWORD=qumo dlhm npcg jjhn
SENDER_EMAIL=havakanalsiparis@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=781991570845-o0a0radjv944bjo7utgmrfsca3ts78m2.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Demo Mode (Production'da false olmalı)
DEMO_MODE=false
```

### 2️⃣ PostgreSQL Database Kontrolü

1. **PostgreSQL Database**'inizin aktif olduğunu kontrol edin
2. **"Info"** sekmesinde **"External Database URL"**'yi kopyalayın
3. Bu URL'nin `DATABASE_URL` environment variable'ında doğru ayarlandığından emin olun

### 3️⃣ Deployment Sonrası Kontrol

1. **"Manual Deploy"** butonuna tıklayın
2. **Deploy loglarını** kontrol edin
3. Şu mesajları görmelisiniz:
   ```
   🐘 PostgreSQL Database initializing...
   ✅ PostgreSQL connected successfully
   🏗️ Creating PostgreSQL tables...
   ✅ PostgreSQL tables created successfully
   ```

### 4️⃣ Test Scripti Çalıştırma

Deployment sonrası PostgreSQL bağlantısını test etmek için:

```bash
# Server klasörüne git
cd server

# PostgreSQL bağlantısını test et
node check-postgresql-connection.js
```

Bu script şu bilgileri verecek:
- ✅ PostgreSQL bağlantısı başarılı mı?
- 📊 Kaç kullanıcı var?
- 📊 Örnek kullanıcılar

### 5️⃣ Debug Endpoint'leri

Uygulama çalıştıktan sonra şu URL'leri kontrol edin:

- **Environment Debug**: `https://your-app.onrender.com/api/debug/env`
- **Database Debug**: `https://your-app.onrender.com/api/debug`

### 6️⃣ Sorun Devam Ederse

#### A) Environment Variables Kontrolü
```bash
# Server klasöründe
node check-postgresql-connection.js
```

#### B) Database Logları
Render.com'da **"Logs"** sekmesini kontrol edin:
- `❌ DATABASE_URL environment variable is required` hatası varsa → DATABASE_URL eksik
- `❌ PostgreSQL connection failed` hatası varsa → Bağlantı sorunu
- `📊 Found X existing users` mesajı varsa → Bağlantı başarılı

#### C) Manual Database Kontrolü
```bash
# PostgreSQL'e bağlan
psql "postgresql://rectangularduct_user:WvlaSwkbrZlDVBV1gc34RCKCO5PF3aGC@dpg-d23m9kali9vc73f85n40-a.frankfurt-postgres.render.com/rectangularductorder_db"

# Kullanıcıları kontrol et
SELECT COUNT(*) FROM users;
SELECT email, "firstName", "lastName", "createdAt" FROM users LIMIT 5;
```

## 🔧 Yapılan Düzeltmeler

### 1. Database Selector İyileştirmeleri
- ✅ PostgreSQL bağlantı timeout'u eklendi
- ✅ Daha güvenilir bağlantı testi
- ✅ Migration sürecinde veri kaybı önlendi

### 2. PostgreSQL Module İyileştirmeleri
- ✅ Tablo varlığı kontrolü eklendi
- ✅ Mevcut kullanıcı kontrolü güçlendirildi
- ✅ createUser fonksiyonu güvenli hale getirildi

### 3. Server.js İyileştirmeleri
- ✅ Production environment kontrolü eklendi
- ✅ DATABASE_URL eksikliği uyarısı eklendi
- ✅ Daha detaylı debug logları

## 🚨 Kritik Kontrol Noktaları

1. **DATABASE_URL mutlaka ayarlı olmalı**
2. **USE_POSTGRESQL=true olmalı**
3. **PostgreSQL database aktif olmalı**
4. **Deploy loglarında PostgreSQL başarı mesajları olmalı**

## 📞 Sorun Devam Ederse

1. Render.com **"Logs"** sekmesini kontrol edin
2. Debug endpoint'lerini test edin
3. PostgreSQL test scriptini çalıştırın
4. Environment variables'ları tekrar kontrol edin

Bu düzeltmelerle PostgreSQL veritabanındaki kayıtların silinme sorunu çözülmüş olmalı. 