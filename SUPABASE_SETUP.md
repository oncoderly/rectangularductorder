# Supabase Kurulum Rehberi

Bu proje artık Supabase kullanıyor. Firebase ve PostgreSQL bağımlılıkları kaldırılmıştır.

## 1. Supabase Projesi Oluştur

1. [Supabase Dashboard](https://app.supabase.com) 'a git
2. "New Project" ile yeni proje oluştur
3. Proje adı: `rectangular-duct-order`
4. Database şifresini kaydet

## 2. Database Tabloları

Supabase SQL Editor'da aşağıdaki tabloları oluştur:

```sql
-- Users tablosu (Supabase Auth ile entegre)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Orders tablosu (sipariş verileri için)
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_data JSONB NOT NULL,
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Analytics tablosu
CREATE TABLE public.analytics (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  PRIMARY KEY (id)
);
```

## 3. Row Level Security (RLS) Ayarları

```sql
-- Profiles tablosu RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Orders tablosu RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Analytics tablosu RLS
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create analytics" ON public.analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
```

## 4. Environment Variables

`.env` dosyası oluştur:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
VITE_API_URL=http://localhost:5000

# Server Configuration (minimal)
PORT=5000
CLIENT_URL=http://localhost:5173
```

## 5. Çalıştırma

```bash
# Client çalıştır
cd client
npm install
npm run dev

# Server çalıştır (opsiyonel - sadece static hosting için)
cd server
npm install
npm start
```

## 6. Auth Akışı

- Kullanıcı kayıt/giriş Supabase Auth ile
- Profil bilgileri `profiles` tablosunda
- Session yönetimi otomatik
- Admin rolleri `profiles.role` sütununda

## 7. Özellikler

✅ **Kaldırılan**:
- PostgreSQL bağımlılıkları
- Firebase Admin SDK
- Express middleware'leri
- Karmaşık auth routes
- Server-side session yönetimi

✅ **Eklenen**:
- Supabase client
- Basitleştirilmiş auth hook
- RLS güvenlik
- Minimal server

## 8. Production Deployment

Vercel/Netlify gibi platformlarda sadece client deploy et. Server isteğe bağlı.