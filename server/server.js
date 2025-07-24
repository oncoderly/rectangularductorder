const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'rectangularduct-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

<<<<<<< Updated upstream
=======
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
        
        // Track user login
        await trackSession(user.id, 'login', {
            type: 'google_oauth',
            email: user.email,
            method: 'google'
        });
        
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

>>>>>>> Stashed changes
app.use('/images', express.static(path.join(__dirname, '../public/images')));

app.get('/', (req, res) => {
    res.json({ 
        message: 'Rectangular Duct Order API', 
        version: '1.0.0',
        endpoints: ['/api/register', '/api/login', '/api/me', '/api/logout']
    });
});

const USERS_FILE = path.join(__dirname, 'users.json');
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');

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

<<<<<<< Updated upstream
=======
// Analytics functions
const loadAnalytics = async () => {
    try {
        return await fs.readJson(ANALYTICS_FILE);
    } catch (error) {
        return { sessions: [], activities: [] };
    }
};

const saveAnalytics = async (analytics) => {
    await fs.writeJson(ANALYTICS_FILE, analytics, { spaces: 2 });
};

// Track user session
const trackSession = async (userId, action, data = {}) => {
    try {
        const analytics = await loadAnalytics();
        const sessionData = {
            id: Date.now().toString(),
            userId: userId || 'guest',
            action, // 'login', 'logout', 'activity'
            timestamp: new Date().toISOString(),
            data
        };
        
        if (action === 'login') {
            analytics.sessions.push({
                ...sessionData,
                sessionStart: new Date().toISOString()
            });
        } else if (action === 'activity') {
            analytics.activities.push(sessionData);
        }
        
        await saveAnalytics(analytics);
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
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

>>>>>>> Stashed changes
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
        await trackSession(newUser.id, 'login', { 
            type: 'register',
            email: newUser.email,
            method: 'email'
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
        await trackSession(user.id, 'login', {
            type: 'login',
            email: user.email,
            method: 'email'
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

<<<<<<< Updated upstream
=======
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

// Analytics endpoints
app.post('/api/track', async (req, res) => {
    try {
        const { action, data } = req.body;
        const userId = req.session.userId || 'guest';
        
        await trackSession(userId, 'activity', {
            type: action,
            ...data
        });
        
        res.json({ message: 'Activity tracked' });
    } catch (error) {
        res.status(500).json({ error: 'Tracking error' });
    }
});

// Admin analytics endpoint  
app.get('/api/admin/analytics', async (req, res) => {
    try {
        const users = await loadUsers();
        const stats = await getAnalyticsSummary(users);
        
        if (!stats) {
            return res.status(500).json({ error: 'Analytics error' });
        }
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Analytics error' });
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

>>>>>>> Stashed changes

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} portunda çalışıyor`);
});