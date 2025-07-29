# Gmail SMTP Basit Kurulum Rehberi

Bu rehber, şifre sıfırlama emaillerini Gmail SMTP üzerinden göndermek için basit ve ücretsiz kurulum adımlarını anlatır.

## 1. Gmail App Password Oluşturma

### Adım 1: Google Hesap Ayarları
1. [Google Hesabım](https://myaccount.google.com/) sayfasına gidin
2. Sol menüden **"Güvenlik"** seçeneğine tıklayın

### Adım 2: 2-Factor Authentication Aktifleştirme
- Gmail App Password kullanabilmek için **2-Factor Authentication (2FA)** aktif olmalıdır
- Eğer aktif değilse, "2 Adımlı Doğrulama" bölümünden aktifleştirin

### Adım 3: App Password Oluşturma
1. **"2 Adımlı Doğrulama"** bölümüne gidin
2. Sayfanın altında **"Uygulama parolaları"** seçeneğini bulun
3. **"Uygulama parolaları"** tıklayın
4. **"Uygulama seç"** dropdown'dan **"Mail"** seçin
5. **"Cihaz seç"** dropdown'dan **"Diğer (özel ad)"** seçin
6. Ad olarak **"Rectangular Duct Order"** yazın
7. **"Oluştur"** butonuna tıklayın
8. **16 haneli parolayı kopyalayın** (örn: `abcd efgh ijkl mnop`)

## 2. .env Dosyası Ayarları

`.env` dosyanızda aşağıdaki değişkenleri güncelleyin:

```env
# Gmail SMTP Basit Servis
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Önemli Notlar:**
- `GMAIL_USER`: Gmail adresiniz (örn: `kanal.siparis@gmail.com`)
- `GMAIL_APP_PASSWORD`: Yukarıda oluşturduğunuz 16 haneli parola (boşluksuz)

## 3. Test Etme

Sunucuyu yeniden başlattıktan sonra:

1. **Şifremi Unuttum** linkine tıklayın
2. Email adresinizi girin
3. **6 haneli OTP kodunu** kontrol edin
4. Gmail hesabınızda **"Gönderilmiş"** klasörünü kontrol edin

## 4. Demo Mode

Eğer Gmail ayarları yapılmamışsa sistem **Demo Mode**'da çalışır:
- OTP kodları konsola yazdırılır
- Gerçek email gönderilmez
- Geliştirme sırasında kullanışlıdır

## 5. Güvenlik

✅ **Güvenli Özellikler:**
- 6 haneli rastgele OTP
- 15 dakika süre sınırı
- 3 yanlış deneme hakkı
- Rate limiting aktif
- Email adresi gizliliği korunur

## 6. Sorun Giderme

### Gmail Bağlantı Hatası
```
❌ Gmail SMTP bağlantı hatası: Invalid login
```
**Çözüm:** App Password'u doğru oluşturdunuz mu? 2FA aktif mi?

### Demo Mode Çalışıyor
```
🎯 DEMO MODE: Gmail SMTP yapılandırılmamış
```
**Çözüm:** `.env` dosyasında `GMAIL_USER` ve `GMAIL_APP_PASSWORD` değerlerini kontrol edin

### Email Gelmiyor
- **Spam** klasörünü kontrol edin
- Gmail **"Gönderilmiş"** klasörünü kontrol edin
- Console loglarında başarı mesajını kontrol edin

## 7. Maliyetler

**Tamamen Ücretsiz!**
- Gmail günde 500 email gönderme limiti
- Küçük/orta ölçekli projeler için yeterli
- App Password güvenli ve ücretsiz

## 8. Production Ayarları

Production'da:
1. Güvenli `.env` değişkenleri kullanın
2. Rate limiting'i uygun ayarlayın
3. Log seviyelerini ayarlayın
4. Error monitoring ekleyin

Bu kurulum ile şifre sıfırlama sistemi tamamen çalışır durumda olacaktır!