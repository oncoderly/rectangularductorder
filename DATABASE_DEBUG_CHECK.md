# Database Debug - Kullanıcı Silme Sorunu

## 🚨 Kullanıcılar Hala Siliniyor

Render.com'da deployment sonrası kullanıcılar hala siliniyorsa şu durumlardan biri var:

## 🔍 1. Database Durumu Kontrol Et

Şu URL'yi ziyaret ederek hangi database'in kullanıldığını kontrol edin:

```
https://rectangularductorder.onrender.com/api/debug
```

**Bekleneni sonuç:**
```json
{
  "NODE_ENV": "production",
  "DATABASE_URL_EXISTS": true,
  "USE_POSTGRESQL": "true",
  "isPostgreSQL": true,
  "dbStatus": {
    "userDB_exists": true
  }
}
```

## 🚨 2. Olası Sorunlar

### **A. Environment Variables Eksik**
Render.com dashboard'da bu değişkenlerin ayarlanması gerek:

```env
DATABASE_URL=postgresql://rectangularduct_user:WvlaSwkbrZlDVBV1gc34RCKCO5PF3aGC@dpg-d23m9kali9vc73f85n40-a.frankfurt-postgres.render.com/rectangularductorder_db
USE_POSTGRESQL=true
SERVER_URL=https://rectangularductorder.onrender.com
CLIENT_URL=https://rectangularductorder.onrender.com
```

### **B. PostgreSQL Database Bağlantı Hatası**
Database bağlanamıyorsa SQLite'a fallback yapıyor (geçici)

### **C. Migration Çalışmıyor**
PostgreSQL boşsa SQLite'dan migration yapmalı

## 🔧 3. Çözüm Adımları

### **Adım 1: Render.com Environment Variables**
1. Render.com Dashboard > Your Service > Environment
2. Yukarıdaki 4 değişkeni ekle/güncelle
3. Redeploy

### **Adım 2: Database Logs Kontrol**
Render.com logs'ta şu mesajları ara:
- `✅ PostgreSQL connected successfully`
- `🐘 Using PostgreSQL database`
- `🔄 Migrating data from SQLite to PostgreSQL`

### **Adım 3: Manual Test**
```bash
# Database durumu
curl https://rectangularductorder.onrender.com/api/debug

# Kullanıcı sayısı
curl https://rectangularductorder.onrender.com/api/admin/users
```

## ⚠️ 4. Eğer Hala SQLite Kullanıyorsa

`/api/debug` sonucunda `isPostgreSQL: false` gösteriyorsa:

1. **Environment variables eksik/yanlış**
2. **PostgreSQL connection string hatalı**
3. **DATABASE_URL Render.com'da ayarlanmamış**

## 🎯 5. Kesin Çözüm

Eğer PostgreSQL çalışmıyorsa, bu komutla zorla PostgreSQL kullan:

**server.js'de şu satırı bul ve değiştir:**
```javascript
// Eski
if (DATABASE_URL || process.env.USE_POSTGRESQL === 'true') {

// Yeni - Zorla PostgreSQL
if (true) { // Always use PostgreSQL in production
```

Bu garanti eder ki production'da her zaman PostgreSQL kullanılır.