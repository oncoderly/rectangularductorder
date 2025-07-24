// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 5050;

// Environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const SESSION_SECRET = process.env.SESSION_SECRET || 'rectangularduct-secret-key';
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5050';

// Twilio client
let twilioClient;
try {
    if (!DEMO_MODE && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
        twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio SMS servisi aktif');
    } else {
        console.log('🎯 Demo mode: SMS\'ler konsola yazdirilacak');
    }
} catch (error) {
    console.warn('⚠️ Twilio kurulumu basarisiz (demo mode):', error.message);
}

// OTP storage (in production, use Redis or database)
const otpStorage = new Map();

app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:3001'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check if running on HTTPS (production)
const isProduction = process.env.NODE_ENV === 'production' || process.env.SERVER_URL?.startsWith('https://');

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // HTTPS'de bile false yapıyoruz çünkü same-origin
        httpOnly: true,
        sameSite: 'lax', // same-origin olduğu için 'lax' yeterli
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Debug: Environment variables
console.log('🔧 Google OAuth Config:');
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('🔧 URL Config:');
console.log('CLIENT_URL:', CLIENT_URL);
console.log('SERVER_URL:', SERVER_URL);
console.log('🔧 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Is Production:', isProduction);
console.log('🔧 Expected Production URLs:');
console.log('Should be CLIENT_URL: https://rectangularductorder.onrender.com'); 
console.log('Should be SERVER_URL: https://rectangularductorder.onrender.com');

// Passport Google Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
    try {
        const users = await loadUsers();
        let user = users.find(u => u.googleId === profile.id);
        
        if (!user) {
            // Check if user exists with same email
            user = users.find(u => u.email === profile.emails[0].value);
            if (user) {
                // Link Google account to existing user
                user.googleId = profile.id;
            } else {
                // Create new user
                user = {
                    id: Date.now().toString(),
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    createdAt: new Date().toISOString()
                };
                users.push(user);
            }
            await saveUsers(users);
        }
        
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

    console.log('✅ Google OAuth strategy configured');
} else {
    console.log('❌ Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const users = await loadUsers();
        const user = users.find(u => u.id === id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Serve static files from client/dist
app.use(express.static(path.join(__dirname, '../client/dist')));

console.log('🔧 Registering root route...');
// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({ 
        message: 'Rectangular Duct Order API', 
        version: '2.0.0',
        endpoints: [
            '/api/register', '/api/login', '/api/me', '/api/logout',
            '/api/phone/send-otp', '/api/phone/register', '/api/phone/login',
            '/api/auth/google', '/api/auth/google/callback', '/api/auth/google/success',
            '/api/track', '/api/admin/analytics'
        ]
    });
});

const USERS_FILE = path.join(__dirname, 'users.json');

// Import analytics module
const { trackSession, getAnalyticsSummary } = require('./analytics');

const loadUsers = async () => {
    try {
        return await fs.readJson(USERS_FILE);
    } catch (error) {
        return [];
    }
};

const saveUsers = async (users) => {
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
};

// Helper functions for SMS
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const formatPhoneNumber = (phone) => {
    // Turkish phone number formatting
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('90')) {
        cleaned = cleaned.substring(2);
    }
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    return '+90' + cleaned;
};

const sendSMS = async (phone, message) => {
    if (!twilioClient) {
        // Demo mode - log to console
        console.log(`🎯 DEMO SMS to ${phone}: ${message}`);
        return { success: true, demo: true };
    }
    
    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: formatPhoneNumber(phone)
        });
        return { success: true, sid: result.sid };
    } catch (error) {
        console.error('SMS gönderme hatası:', error);
        return { success: false, error: error.message };
    }
};

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        const users = await loadUsers();
        const existingUser = users.find(u => u.email === email);
        
        if (existingUser) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            firstName,
            lastName,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        await saveUsers(users);
        
        req.session.userId = newUser.id;
        
        // Track user registration
        await trackSession(newUser.id, 'user_register', {
            method: 'email',
            email: newUser.email
        });
        
        res.json({ 
            message: 'Kayıt başarılı', 
            user: { 
                id: newUser.id, 
                email: newUser.email, 
                firstName: newUser.firstName, 
                lastName: newUser.lastName 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const users = await loadUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
        }
        
        req.session.userId = user.id;
        
        // Track user login
        await trackSession(user.id, 'user_login', {
            method: 'email',
            email: user.email
        });
        
        res.json({ 
            message: 'Giriş başarılı', 
            user: { 
                id: user.id, 
                email: user.email, 
                firstName: user.firstName, 
                lastName: user.lastName 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.get('/api/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Oturum açılmamış' });
        }
        
        const users = await loadUsers();
        const user = users.find(u => u.id === req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        res.json({ 
            user: { 
                id: user.id, 
                email: user.email, 
                firstName: user.firstName, 
                lastName: user.lastName 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Çıkış yapılırken hata oluştu' });
        }
        res.json({ message: 'Başarıyla çıkış yapıldı' });
    });
});

// Phone Auth Endpoints
app.post('/api/phone/send-otp', async (req, res) => {
    try {
        const { phone, isLogin } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Telefon numarası gerekli' });
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const users = await loadUsers();
        const existingUser = users.find(u => u.phone === formattedPhone);
        
        if (isLogin && !existingUser) {
            return res.status(400).json({ error: 'Bu telefon numarası kayıtlı değil' });
        }
        
        if (!isLogin && existingUser) {
            return res.status(400).json({ error: 'Bu telefon numarası zaten kayıtlı' });
        }
        
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        
        otpStorage.set(formattedPhone, { otp, expiresAt });
        
        // Clean up expired OTPs
        setTimeout(() => {
            if (otpStorage.has(formattedPhone)) {
                const stored = otpStorage.get(formattedPhone);
                if (stored.expiresAt < new Date()) {
                    otpStorage.delete(formattedPhone);
                }
            }
        }, 5 * 60 * 1000);
        
        const message = `Air Duct Order doğrulama kodunuz: ${otp}. Bu kod 5 dakika geçerlidir.`;
        const smsResult = await sendSMS(formattedPhone, message);
        
        if (smsResult.success) {
            res.json({ 
                message: 'Doğrulama kodu gönderildi',
                demo: smsResult.demo || false
            });
        } else {
            res.status(500).json({ error: 'SMS gönderilemedi' });
        }
    } catch (error) {
        console.error('OTP gönderme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.post('/api/phone/register', async (req, res) => {
    try {
        const { phone, otp, firstName, lastName } = req.body;
        
        if (!phone || !otp || !firstName || !lastName) {
            return res.status(400).json({ error: 'Tüm alanlar gerekli' });
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const storedOTP = otpStorage.get(formattedPhone);
        
        if (!storedOTP) {
            return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş kod' });
        }
        
        if (storedOTP.expiresAt < new Date()) {
            otpStorage.delete(formattedPhone);
            return res.status(400).json({ error: 'Doğrulama kodu süresi doldu' });
        }
        
        if (storedOTP.otp !== otp) {
            return res.status(400).json({ error: 'Geçersiz doğrulama kodu' });
        }
        
        const users = await loadUsers();
        const existingUser = users.find(u => u.phone === formattedPhone);
        
        if (existingUser) {
            return res.status(400).json({ error: 'Bu telefon numarası zaten kayıtlı' });
        }
        
        const newUser = {
            id: Date.now().toString(),
            phone: formattedPhone,
            firstName,
            lastName,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        await saveUsers(users);
        otpStorage.delete(formattedPhone);
        
        req.session.userId = newUser.id;
        
        // Track phone registration
        await trackSession(newUser.id, 'user_register', {
            method: 'phone',
            phone: newUser.phone
        });
        
        res.json({ 
            message: 'Kayıt başarılı', 
            user: { 
                id: newUser.id, 
                phone: newUser.phone,
                firstName: newUser.firstName, 
                lastName: newUser.lastName 
            } 
        });
    } catch (error) {
        console.error('Telefon kayıt hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.post('/api/phone/login', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        if (!phone || !otp) {
            return res.status(400).json({ error: 'Telefon numarası ve doğrulama kodu gerekli' });
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const storedOTP = otpStorage.get(formattedPhone);
        
        if (!storedOTP) {
            return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş kod' });
        }
        
        if (storedOTP.expiresAt < new Date()) {
            otpStorage.delete(formattedPhone);
            return res.status(400).json({ error: 'Doğrulama kodu süresi doldu' });
        }
        
        if (storedOTP.otp !== otp) {
            return res.status(400).json({ error: 'Geçersiz doğrulama kodu' });
        }
        
        const users = await loadUsers();
        const user = users.find(u => u.phone === formattedPhone);
        
        if (!user) {
            return res.status(400).json({ error: 'Bu telefon numarasıyla kayıtlı kullanıcı bulunamadı' });
        }
        
        otpStorage.delete(formattedPhone);
        req.session.userId = user.id;
        
        // Track phone login
        await trackSession(user.id, 'user_login', {
            method: 'phone',
            phone: user.phone
        });
        
        res.json({ 
            message: 'Giriş başarılı', 
            user: { 
                id: user.id, 
                phone: user.phone || user.email,
                email: user.email || '',
                firstName: user.firstName, 
                lastName: user.lastName 
            } 
        });
    } catch (error) {
        console.error('Telefon giriş hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Google Auth status check
app.get('/api/auth/google/status', (req, res) => {
    res.json({ 
        configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
        message: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? 'Google OAuth is configured' : 'Google OAuth is not configured'
    });
});

// Google Auth Endpoints
console.log('🔧 Registering Google auth route...');
app.get('/api/auth/google', (req, res, next) => {
    console.log('🔍 Google auth endpoint hit');
    console.log('🔍 DEBUG - GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'EXISTS' : 'NOT FOUND');
    console.log('🔍 DEBUG - GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'EXISTS' : 'NOT FOUND');
    console.log('🔍 DEBUG - SERVER_URL:', SERVER_URL);
    console.log('🔍 DEBUG - CLIENT_URL:', CLIENT_URL);
    console.log('🔍 DEBUG - Callback URL will be:', `${SERVER_URL}/api/auth/google/callback`);
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.log('❌ DEBUG - Variables are falsy, returning error');
        return res.status(500).json({ error: 'Google OAuth not configured' });
    }
    console.log('✅ DEBUG - Variables are truthy, proceeding with auth');
    console.log('✅ DEBUG - Redirecting to Google OAuth...');
    
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })(req, res, next);
});

app.get('/api/auth/google/callback', (req, res, next) => {
    console.log('🔍 OAuth Callback HIT - Query params:', req.query);
    console.log('🔍 OAuth Callback - Full URL:', req.url);
    console.log('🔍 OAuth Callback - Headers:', req.headers);
    
    passport.authenticate('google', { 
        failureRedirect: `${CLIENT_URL}/?error=google_auth_failed` 
    })(req, res, (err) => {
        if (err) {
            console.log('❌ Passport authentication error:', err);
            return res.redirect(`${CLIENT_URL}/?error=passport_error`);
        }
        
        if (!req.user) {
            console.log('❌ No user found after authentication');
            return res.redirect(`${CLIENT_URL}/?error=no_user`);
        }
        
        // Successful authentication, redirect to client  
        console.log('✅ OAuth Callback - User authenticated:', req.user?.email);
        console.log('✅ OAuth Callback - User object:', JSON.stringify(req.user, null, 2));
        console.log('✅ OAuth Callback - Redirecting to:', `${CLIENT_URL}/?google_auth=success`);
        
        req.session.userId = req.user.id;
        
        // Track Google OAuth login
        trackSession(req.user.id, 'user_login', {
            method: 'google',
            email: req.user.email
        }).catch(err => console.error('Analytics tracking error:', err));
        
        res.redirect(`${CLIENT_URL}/?google_auth=success`);
    });
});

// Google Auth success check endpoint
app.get('/api/auth/google/success', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Oturum açılmamış' });
        }
        
        const users = await loadUsers();
        const user = users.find(u => u.id === req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        res.json({ 
            message: 'Google ile giriş başarılı',
            user: { 
                id: user.id, 
                email: user.email,
                firstName: user.firstName, 
                lastName: user.lastName 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Analytics tracking endpoint
app.post('/api/track', async (req, res) => {
    try {
        const { action, data } = req.body;
        const userId = req.session.userId || 'guest';
        
        if (!action) {
            return res.status(400).json({ error: 'Action is required' });
        }
        
        await trackSession(userId, action, data || {});
        res.json({ message: 'Tracking successful' });
    } catch (error) {
        console.error('Analytics tracking error:', error);
        res.status(500).json({ error: 'Tracking failed' });
    }
});

// Admin analytics endpoint
app.get('/api/admin/analytics', async (req, res) => {
    try {
        // Check if user is authenticated (basic check)
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const summary = await getAnalyticsSummary();
        res.json(summary);
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});


process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});


// Handle client-side routing - catch-all route (must be last!)
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    console.log('📄 Serving index.html for path:', req.path);
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} portunda çalışıyor`);
    console.log('🔍 Testing Google Auth endpoint internally...');
    
    // Test if the route exists
    setTimeout(() => {
        console.log('Available routes test will be done via external call');
    }, 1000);
});