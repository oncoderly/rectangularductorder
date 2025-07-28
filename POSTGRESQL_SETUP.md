# 🐘 PostgreSQL Kurulum Rehberi

## ✅ Tamamlanan Adımlar

1. **PostgreSQL client paketi yüklendi** (`npm install pg`)
2. **PostgreSQL database modülü oluşturuldu** (`database-postgres.js`)
3. **Database selector oluşturuldu** (`database-selector.js`)
4. **Server.js async/await ile güncellendi**
5. **Environment variables ayarlandı**

## 🚀 Render.com'da PostgreSQL Kurulumu

### 1️⃣ PostgreSQL Database Oluştur

1. [Render.com Dashboard](https://dashboard.render.com)'a git
2. **"New PostgreSQL"** butonuna tıkla
3. **Database ayarları:**
   - **Name**: `rectangularductorder-db`
   - **User**: `rectangularduct` (otomatik)
   - **Region**: `Frankfurt (EU Central)` (Türkiye'ye yakın)
   - **PostgreSQL Version**: `15` (varsayılan)
   - **Plan**: **Free** (512MB, 1 ay sonra silinir ama yedeklenebilir)

4. **"Create Database"** butonuna tıkla
5. **5-10 dakika bekle** (database oluşturulacak)

### 2️⃣ Database URL'sini Kopyala

Database oluştuktan sonra:

1. **"Info"** sekmesine git
2. **"External Database URL"** kısmındaki URL'yi kopyala
3. URL şuna benzer olacak:
   ```
   postgresql://rectangularduct:XYZ123@dpg-xyz-a.oregon-postgres.render.com/rectangularductorder_db
   ```

### 3️⃣ Web Service'e Environment Variable Ekle

1. Render.com'da **web service**'inize git (`rectangularductorder`)
2. **"Environment"** sekmesine git
3. **"Add Environment Variable"** butonuna tıkla
4. Şu variable'ı ekle:
   ```
   Key: DATABASE_URL
   Value: [yukarıda kopyaladığınız PostgreSQL URL]
   ```

5. **"Save Changes"** butonuna tıkla

### 4️⃣ Deploy Et

1. **"Manual Deploy"** butonuna tıkla veya git push yapın
2. **Deploy loglarında** şu mesajları göreceksiniz:
   ```
   🐘 PostgreSQL Database initializing...
   ✅ PostgreSQL connected successfully
   🔄 Migrating data from SQLite to PostgreSQL...
   ✅ Migrated X users to PostgreSQL
   🗄️ Database type: PostgreSQL
   ```

## 🔧 Local Test (Opsiyonel)

Local'de PostgreSQL test etmek için:

1. **PostgreSQL yükle** (Windows için: https://www.postgresql.org/download/windows/)
2. **.env dosyasında:**
   ```env
   USE_POSTGRESQL=true
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=rectangularduct
   DB_USER=postgres
   DB_PASSWORD=yourpassword
   ```
3. **Database oluştur:**
   ```sql
   CREATE DATABASE rectangularduct;
   ```
4. **Server'ı başlat:** `npm start`

## 🎯 Sonuç

- ✅ **Local**: SQLite (geliştirme)
- ✅ **Render.com**: PostgreSQL (production)
- ✅ **Otomatik migration**: SQLite → PostgreSQL
- ✅ **Kalıcı veriler**: Render restart'ta silinmez
- ✅ **Performance**: Çoklu kullanıcı desteği

## 🔍 Test Etme

Deploy sonrası test edin:

1. **Yeni kullanıcı kaydet**
2. **Server'ı restart et** (Manual Deploy)
3. **Kullanıcı hala orada mı?** ✅ (PostgreSQL sayesinde kalıcı)

## 📞 Sorun Giderme

**Connection Error**: 
- Database URL'nin doğru olduğunu kontrol edin
- Database'in oluşturulup oluşturulmadığını kontrol edin

**Migration Error**:
- Normal, SQLite yoksa migration atlanır

**Render Logs**:
```bash
# Logs kontrol etmek için
https://dashboard.render.com/web/[service-id]/logs
```

## 💰 Maliyet

- **Free Plan**: 512MB, 1 ay sonra silinir
- **Starter Plan**: $7/ay, kalıcı
- **Ücretsiz kullanım**: Yeterli küçük-orta projeler için