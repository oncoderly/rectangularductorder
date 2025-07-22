# Rectangular Duct Order System

Hava kanalı parçaları için sipariş yönetim sistemi.

## Özellikler

- 🔐 Kullanıcı kayıt/giriş sistemi
- 📊 15 farklı kanal parçası türü
- 📏 Detaylı ölçü girişi sistemi
- ✅ Seçenek checkboxları
- 📋 Sipariş listesi yönetimi
- 📄 PDF sipariş raporu oluşturma
- 💾 LocalStorage ile veri saklama
- 📱 Responsive tasarım

## Teknolojiler

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Axios

### Backend  
- Node.js + Express
- Puppeteer (PDF oluşturma)
- bcryptjs (şifreleme)
- express-session (oturum)
- CORS

## Kurulum

### 1. Backend Kurulumu
```bash
cd server
npm install
npm run dev
```

### 2. Frontend Kurulumu
```bash
cd client
npm install
npm run dev
```

### 3. Görsel Dosyaları
`public/images/` klasörüne parça görsellerini ekleyin:
- 1-duz-kanal.png
- 2-dirsek.png
- 2-reduksiyonlu-dirsek.png
- 3-reduksiyon.png
- 4-pantolon-tip1.png
- 5-saplama-yaka.png
- kanal-kapagi-kor-tapa.png
- reduksiyon-dikdortgenden-yuvarlaga.png
- s-parcasi.png
- y-parcasi.png
- lineer-menfez-kutusu.png
- fancoil-vrv-ic-unite-kutusu.png
- plenum-box-kutu.png
- tel-kafes.png
- manson.png

## Kullanım

1. **Kayıt/Giriş**: İlk kullanımda hesap oluşturun
2. **Parça Seçimi**: Sol panelden istenen parçayı seçin
3. **Ölçü Girişi**: Gerekli ölçüleri ve adet bilgisini girin
4. **Sipariş Ekleme**: "Siparişe Ekle" butonuna tıklayın
5. **PDF İndirme**: Sipariş tamamlandığında "PDF İndir" butonunu kullanın

## Parça Türleri

| Parça | Ölçüler | Seçenekler |
|-------|---------|------------|
| Düz Kanal | W1, H1, L | - |
| Dirsek | W1, H1, R1, A1 | - |
| Redüksiyonlu Dirsek | W1, H1, W2, H2, R1, A1 | Alt/Üst Düz, Ortali |
| Redüksiyon | W1, H1, L, W2, H2 | Sol/Sağ/Alt/Üst Düz, Ortali |
| Pantolon Tip 1 | W1, H1, L, H2, W2, W3, H3, R1, A1 | Çoklu seçenekler |
| ... | ... | ... |

## API Endpoints

- `POST /api/register` - Kullanıcı kaydı
- `POST /api/login` - Kullanıcı girişi  
- `GET /api/me` - Kullanıcı bilgisi
- `POST /api/logout` - Çıkış
- `POST /api/generate-pdf` - PDF oluşturma

## Production Deploy

### Render.com için:
1. GitHub'a push edin
2. Render'da yeni Web Service oluşturun
3. Build Command: `cd server && npm install`
4. Start Command: `cd server && npm start`
5. Environment Variables ekleyin:
   - `PORT=10000`
   - `NODE_ENV=production`

### Puppeteer için ek ayarlar:
```javascript
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ]
});
```

## Geliştirme

```bash
# Backend geliştirme modu
cd server && npm run dev

# Frontend geliştirme modu  
cd client && npm run dev
```

## Lisans

MIT