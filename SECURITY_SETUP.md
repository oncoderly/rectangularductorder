# 🔒 Güvenlik Kurulum Rehberi

Bu dokümanda projenizi 1000+ kullanıcıya açmadan önce yapmanız gereken güvenlik ayarları açıklanmaktadır.

## 🚀 Hızlı Başlangıç

### 1. Gerekli Paketleri Yükleyin

```bash
cd server
npm install
```

Yeni eklenen güvenlik paketleri:
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation
- `helmet` - Security headers
- `csurf` - CSRF protection

### 2. Environment Variables'ları Ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin ve gerçek değerleri girin:

```env
# Production için önemli ayarlar
NODE_ENV=production
SESSION_SECRET=çok-güvenli-ve-uzun-rastgele-string-buraya-32-karakter-minimum
CLIENT_URL=https://yourdomain.com
SERVER_URL=https://yourdomain.com

# SendGrid (Önerilen)
SENDGRID_API_KEY=SG.gerçek-api-key-buraya
SENDGRID_FROM_EMAIL=doğrulanmış-email@yourdomain.com
```

### 3. SendGrid Kurulumu

1. [SendGrid](https://sendgrid.com/) hesabı oluşturun
2. Domain doğrulaması yapın
3. API Key oluşturun (Mail Send yetkisi ile)
4. From email'i doğrulayın

## 🛡️ Güvenlik Özellikleri

### Rate Limiting
- **Genel API**: 15 dakikada 100 istek
- **Auth endpoint'leri**: 15 dakikada 10 istek
- **Şifre sıfırlama**: Saatte 3 istek
- **SMS/OTP**: Saatte 5 istek

### Input Validation
- Email format kontrolü
- Şifre güçlülük kontrolü
- Telefon numarası format kontrolü
- XSS koruması

### Session Güvenliği
- HttpOnly cookies
- Secure cookies (production'da)
- SameSite protection
- 24 saatlik session timeout

### Database Optimizasyonları
- WAL mode (Write-Ahead Logging)
- Index'ler performans için
- Prepared statements
- Connection pooling

## 🔍 Güvenlik Kontrol Listesi

### Pre-Production Checklist

- [ ] `NODE_ENV=production` set edildi
- [ ] Güçlü `SESSION_SECRET` belirlendi
- [ ] HTTPS sertifikası kuruldu
- [ ] SendGrid doğrulaması tamamlandı
- [ ] Rate limiting test edildi
- [ ] Input validation test edildi
- [ ] Error handling test edildi
- [ ] Database backup sistemi kuruldu
- [ ] Monitoring sistemi kuruldu

### Production Monitoring

```bash
# Logları kontrol edin
tail -f server/logs/app.log

# Database performansını kontrol edin  
sqlite3 server/users.db ".schema"

# Rate limiting istatistikleri
curl -I http://localhost:5050/api/status
```

## 🚨 Acil Durumlar

### Rate Limit Aşılması
```bash
# Specific IP'yi geçici olarak engellemek için
# nginx/cloudflare seviyesinde blokla
```

### Database Performans Sorunu
```bash
# WAL dosyalarını temizle
sqlite3 server/users.db "PRAGMA wal_checkpoint(FULL);"
```

### Session Sorunları
```bash
# Tüm session'ları temizle
rm -rf server/sessions/*
```

## 📊 Performance Metrics

### Beklenen Performans (1000+ kullanıcı)
- Response time: < 100ms
- Database query time: < 10ms
- Memory usage: < 512MB
- CPU usage: < 50%

### Monitoring Endpoint'leri
- `/api/status` - Sistem durumu
- `/api/admin/analytics` - Kullanıcı istatistikleri

## 🔧 İleri Seviye Ayarlar

### Nginx Reverse Proxy (Önerilen)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/TLS Ayarları

```bash
# Let's Encrypt ile ücretsiz SSL
certbot --nginx -d yourdomain.com
```

### Process Manager (PM2)

```bash
# PM2 ile production'da çalıştırma
npm install -g pm2
pm2 start server.js --name "rectangular-duct-order"
pm2 startup
pm2 save
```

## 📞 Destek

Herhangi bir güvenlik sorunu için:
1. Önce bu dokümandaki çözümleri deneyin
2. GitHub Issues'da sorun bildirin
3. Kritik güvenlik sorunları için direkt iletişime geçin

---

**⚠️ Uyarı**: Bu güvenlik ayarları yapılmadan production'a almayın!