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
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { google } = require('googleapis');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('./sendEmail');
const { sendPasswordResetOTP, sendWelcomeEmail: sendWelcomeEmailGmail } = require('./email-gmail-simple');



// Security middleware import
const {
    rateLimiters,
    validationRules,
    handleValidationErrors,
    securityHeaders,
    sanitizeInput,
    errorHandler,
    requestLogger
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 5050;

// Environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
// Generate a secure session secret if not provided
const generateSecureSecret = () => crypto.randomBytes(64).toString('hex');
const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
    console.warn('⚠️ SESSION_SECRET ortam değişkeni ayarlanmamış! Güvenli rastgele anahtar oluşturuluyor...');
    console.warn('🔐 Production için SESSION_SECRET ortam değişkenini mutlaka ayarlayın!');
    return generateSecureSecret();
})();
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5050';

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail'; // gmail, sendgrid, outlook, oauth2

// OAuth2 Configuration
const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;
const OAUTH2_REFRESH_TOKEN = process.env.OAUTH2_REFRESH_TOKEN;

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

// OAuth2 Gmail Configuration
let oauth2Client;
let emailTransporter;
let emailService = 'demo';

try {
    if (!DEMO_MODE) {
        if (EMAIL_SERVICE === 'oauth2' && OAUTH2_CLIENT_ID && OAUTH2_CLIENT_SECRET && OAUTH2_REFRESH_TOKEN) {
            // OAuth2 Gmail configuration
            oauth2Client = new google.auth.OAuth2(
                OAUTH2_CLIENT_ID,
                OAUTH2_CLIENT_SECRET,
                'http://localhost:5050/auth/google/callback'
            );
            
            oauth2Client.setCredentials({
                refresh_token: OAUTH2_REFRESH_TOKEN
            });
            
            emailService = 'oauth2';
            console.log('✅ OAuth2 Gmail e-posta servisi aktif');
            
        } else if (EMAIL_SERVICE === 'sendgrid' && SENDGRID_API_KEY) {
            // SendGrid configuration
            sgMail.setApiKey(SENDGRID_API_KEY);
            emailService = 'sendgrid';
            console.log('✅ SendGrid e-posta servisi aktif');
            
        } else if (EMAIL_SERVICE === 'outlook' && EMAIL_USER && EMAIL_PASS) {
            // Outlook configuration
            emailTransporter = nodemailer.createTransporter({
                host: 'smtp.office365.com',
                port: 587,
                secure: false,
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS
                }
            });
            emailService = 'outlook';
            console.log('✅ Outlook e-posta servisi aktif');
            
        } else if (EMAIL_SERVICE === 'gmail' && EMAIL_USER && EMAIL_PASS) {
            // Gmail configuration (if app password available)
            emailTransporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS
                }
            });
            emailService = 'gmail';
            console.log('✅ Gmail e-posta servisi aktif');
        }
        
        // Test connection for nodemailer services
        if (emailTransporter) {
            emailTransporter.verify((error, success) => {
                if (error) {
                    console.warn('⚠️ E-posta servisi bağlantı hatası:', error.message);
                    emailTransporter = null;
                    emailService = 'demo';
                } else {
                    console.log('✅ E-posta servisi bağlantısı doğrulandı');
                }
            });
        }
    }
    
    if (emailService === 'demo') {
        console.log('🎯 Demo mode: E-postalar konsola yazdirilacak');
    }
} catch (error) {
    console.warn('⚠️ E-posta servisi kurulumu basarisiz (demo mode):', error.message);
    emailService = 'demo';
}

// OTP storage (in production, use Redis or database)
const otpStorage = new Map();

// Password reset OTP storage
const passwordResetOTPStorage = new Map();

// Password reset tokens now stored in database

// Security headers - en üstte olmalı
app.use(securityHeaders);

// Trust proxy settings for Render.com deployment
app.set('trust proxy', 1);

// Request logging
app.use(requestLogger);

// General rate limiting - tüm istekler için
app.use(rateLimiters.general);

app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:3001'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' })); // JSON payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization - JSON parse'dan sonra
app.use(sanitizeInput);

// Check if running on HTTPS (production)
const isProduction = process.env.NODE_ENV === 'production' || process.env.SERVER_URL?.startsWith('https://');

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Default session name değiştir
    cookie: { 
        secure: isProduction, // Production'da HTTPS zorunlu
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax', // OAuth için 'none' gerekli
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
    },
    rolling: true // Her istekte session süresi yenilensin
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
        // Wait for database initialization
        await waitForInit();
        
        // Find user by Google ID first
        const allUsers = await userDB.getAllUsers();
        let user = allUsers.find(u => u.googleId === profile.id);
        
        if (!user) {
            // Check if user exists with same email
            user = await userDB.getUserByEmail(profile.emails[0].value);
            if (user) {
                // Link Google account to existing user
                await userDB.updateUser(user.id, { googleId: profile.id });
                user.googleId = profile.id; // Update local object
            } else {
                // Create new user
                const newUser = {
                    id: Date.now().toString(),
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    createdAt: new Date().toISOString()
                };
                
                const created = await userDB.createUser(newUser);
                if (created) {
                    user = newUser;
                } else {
                    return done(new Error('Failed to create user'), null);
                }
            }
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
        await waitForInit();
        const user = await userDB.getUserById(id);
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
app.get('/api/status', async (req, res) => {
    try {
        let dbStatus = 'unknown';
        let dbType = 'unknown';
        let dbError = null;
        
        try {
            await waitForInit();
            dbType = isPostgreSQL ? 'PostgreSQL' : 'SQLite';
            
            // Test database connection
            if (isPostgreSQL && db) {
                const result = await db.query('SELECT 1 as test');
                dbStatus = 'connected';
            } else if (userDB) {
                const count = await userDB.getUserCount();
                dbStatus = 'connected';
            }
        } catch (error) {
            dbStatus = 'error';
            dbError = error.message;
        }
        
        res.json({ 
            message: 'Rectangular Duct Order API', 
            version: '2.0.0',
            database: {
                type: dbType,
                status: dbStatus,
                error: dbError,
                initialized: isInitialized,
                postgresAvailable: isPostgreSQL
            },
            endpoints: [
                '/api/register', '/api/login', '/api/me', '/api/logout',
                '/api/phone/send-otp', '/api/phone/register', '/api/phone/login',
                '/api/auth/google', '/api/auth/google/callback', '/api/auth/google/success',
                '/api/track', '/api/admin/analytics'
            ]
        });
    } catch (error) {
        res.status(500).json({
            message: 'API Status Error',
            error: error.message
        });
    }
});

// Debug endpoint for render.com
app.get('/api/debug/env', async (req, res) => {
    try {
        await waitForInit();
        
        res.json({
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
            DATABASE_URL_LENGTH: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
            DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT SET',
            USE_POSTGRESQL: process.env.USE_POSTGRESQL,
            isPostgreSQL: isPostgreSQL,
            dbStatus: {
                userDB_exists: !!userDB,
                userDB_methods: userDB ? Object.keys(userDB) : null,
                db_exists: !!db
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug environment variables
console.log('🔍 ENV DEBUG - DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔍 ENV DEBUG - DATABASE_URL first 30 chars:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('🔍 ENV DEBUG - NODE_ENV:', process.env.NODE_ENV);

// Import database module  
const { db, userDB, tokenDB, analyticsDB, waitForInit, isPostgreSQL } = require('./database-selector');

// Import analytics module
const { trackSession, getAnalyticsSummary } = require('./analytics');

const loadUsers = async () => {
    try {
        await waitForInit();
        const users = await userDB.getAllUsers();
        console.log(`📊 Loaded ${users.length} users from database`);
        return users;
    } catch (error) {
        console.error('❌ Error loading users from database:', error);
        return [];
    }
};

const saveUsers = async (users) => {
    // Bu fonksiyon artık gereksiz, ancak eski kod için uyumluluk
    console.log('⚠️ saveUsers called - using database instead');
    return true;
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

app.post('/api/register', 
    rateLimiters.auth, 
    validationRules.register, 
    handleValidationErrors, 
    async (req, res) => {
    try {
        // Wait for database initialization
        await waitForInit();
        
        const { email, password, firstName, lastName } = req.body;
        
        // Check if user already exists
        const existingUser = await userDB.getUserByEmail(email);
        
        if (existingUser) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Check if this is admin email
        const isAdmin = email === 'havakanalsiparis@gmail.com';
        
        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: isAdmin ? 'admin' : 'user',
            createdAt: new Date().toISOString()
        };
        
        // Save to database
        console.log('⚙️ createUser fonksiyonu çağrılmak üzere:', newUser);
        const created = await userDB.createUser(newUser);
        
        if (!created) {
            return res.status(500).json({ error: 'Kullanıcı oluşturulamadı' });
        }
        
        req.session.userId = newUser.id;
        
        // Track user registration
        await trackSession(newUser.id, 'user_register', {
            method: 'email',
            email: newUser.email
        });
        
        // Send welcome email with Gmail (non-blocking)
        sendWelcomeEmailGmail(newUser.email, newUser.firstName).catch(error => {
            console.error('❌ Welcome email failed:', error);
            // Don't block registration if email fails
        });
        
        res.json({ 
            message: 'Kayıt başarılı', 
            user: { 
                id: newUser.id, 
                email: newUser.email, 
                firstName: newUser.firstName, 
                lastName: newUser.lastName,
                role: newUser.role
            } 
        });
    } catch (error) {
        console.error('❌ REGISTRATION ERROR DETAILS:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        console.error('userDB available:', !!userDB);
        console.error('userDB methods:', userDB ? Object.keys(userDB) : 'NULL');
        
        res.status(500).json({ 
            error: 'Sunucu hatası',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/login', 
    rateLimiters.auth, 
    validationRules.login, 
    handleValidationErrors, 
    async (req, res) => {
    try {
        // Wait for database initialization
        await waitForInit();
        
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt:', { email, passwordProvided: !!password });
        
        console.log('👥 Total users in database:', await userDB.getUserCount());
        console.log('📧 Looking for user with email:', email);
        
        const user = await userDB.getUserByEmail(email);
        console.log('🔍 User found:', !!user);
        
        if (!user) {
            console.log('❌ No user found with email:', email);
            // Generic error message to prevent user enumeration
            return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('❌ Invalid password for user:', email);
            // Generic error message to prevent user enumeration
            return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
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
                lastName: user.lastName,
                role: user.role || 'user'
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.get('/api/me', async (req, res) => {
    try {
        // Wait for database initialization
        await waitForInit();
        
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Oturum açılmamış' });
        }
        
        const user = await userDB.getUserById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        res.json({ 
            user: { 
                id: user.id, 
                email: user.email, 
                firstName: user.firstName, 
                lastName: user.lastName,
                role: user.role || 'user'
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
app.post('/api/phone/send-otp', 
    rateLimiters.sms, 
    validationRules.phoneAuth, 
    handleValidationErrors, 
    async (req, res) => {
    try {
        const { phone, isLogin } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Telefon numarası gerekli' });
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const users = await loadUsers();
        const existingUser = users.find(u => u.phone === formattedPhone);
        
        if (isLogin && !existingUser) {
            // Generic error message to prevent user enumeration
            return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
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

app.post('/api/phone/register', 
    rateLimiters.auth, 
    validationRules.phoneAuth, 
    handleValidationErrors, 
    async (req, res) => {
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

app.post('/api/phone/login', 
    rateLimiters.auth, 
    validationRules.phoneAuth, 
    handleValidationErrors, 
    async (req, res) => {
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
            // Generic error message to prevent user enumeration
            return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
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
        
        req.session.userId = req.user.id;
        
        // Session'ı kaydet (ÇÖZÜM!)
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
                return res.redirect(`${CLIENT_URL}/?error=session_save_failed`);
            }
            
            console.log('✅ Session saved successfully for user:', req.user.id);
            console.log('✅ OAuth Callback - Redirecting to:', `${CLIENT_URL}/?google_auth=success`);
            
            // Track Google OAuth login
            trackSession(req.user.id, 'user_login', {
                method: 'google',
                email: req.user.email
            }).catch(err => console.error('Analytics tracking error:', err));
            
            res.redirect(`${CLIENT_URL}/?google_auth=success`);
        });
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
app.post('/api/track', 
    rateLimiters.analytics, 
    validationRules.analytics, 
    handleValidationErrors, 
    async (req, res) => {
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
        
        // Database tipi bilgisini ekle
        const response = {
            ...summary,
            databaseType: isPostgreSQL ? 'PostgreSQL' : 'SQLite'
        };
        
        res.json(response);
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Admin users list endpoint
app.get('/api/admin/users', async (req, res) => {
    try {
        // Check if user is authenticated (basic check)
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        console.log('🔍 Admin users list requested by user:', req.session.userId);
        
        // Get all users from database
        const users = await userDB.getAllUsers();
        
        // Remove sensitive info and format the data  
        const safeUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName || user.firstname || 'N/A', // PostgreSQL uses lowercase
            lastName: user.lastName || user.lastname || 'N/A',   // PostgreSQL uses lowercase
            googleId: user.googleId || user.googleid || null,    // PostgreSQL uses lowercase
            createdAt: user.createdAt || user.createdat,         // PostgreSQL uses lowercase
            isGoogleUser: !!(user.googleId || user.googleid),
            displayName: `${(user.firstName || user.firstname || 'Anonim')} ${(user.lastName || user.lastname || 'Kullanıcı')}`.trim()
        }));
        
        // Sort by creation date (newest first)
        safeUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        console.log(`✅ Returning ${safeUsers.length} users to admin`);
        
        res.json({
            success: true,
            users: safeUsers,
            totalCount: safeUsers.length
        });
        
    } catch (error) {
        console.error('❌ Admin users list error:', error);
        res.status(500).json({ error: 'Failed to get users list' });
    }
});


process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

// Forgot Password endpoint
app.post('/api/forgot-password', 
    rateLimiters.passwordReset, 
    validationRules.forgotPassword, 
    handleValidationErrors, 
    async (req, res) => {
    try {
        // Wait for database initialization
        await waitForInit();
        
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'E-posta adresi gerekli' });
        }
        
        const user = await userDB.getUserByEmail(email);
        
        if (!user) {
            // Security: Don't reveal if email exists or not
            return res.json({ message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderildi.' });
        }
        
        // Generate secure reset token (64 bytes for higher entropy)
        const resetToken = crypto.randomBytes(64).toString('hex');
        const resetTokenExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes
        
        // Store reset token in database
        const tokenSaved = await tokenDB.saveResetToken(resetToken, user.id, user.email, resetTokenExpiry);
        
        if (!tokenSaved) {
            console.error('❌ Failed to save reset token');
            return res.status(500).json({ error: 'Şifre sıfırlama işlemi başlatılamadı' });
        }
        
        // Send password reset email
        const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;
        
        const emailTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea; margin-bottom: 10px;">🏭 Hava Kanalı Sipariş Sistemi</h1>
                    <h2 style="color: #2c3e50; margin-bottom: 30px;">Şifre Sıfırlama</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
                    <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Merhaba,<br><br>
                        Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  text-decoration: none; 
                                  padding: 15px 30px; 
                                  border-radius: 8px; 
                                  font-weight: bold; 
                                  font-size: 16px;
                                  display: inline-block;">
                            🔑 Şifremi Sıfırla
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 20px;">
                        Bu link 30 dakika geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz.
                    </p>
                    
                    <div style="border-top: 1px solid #e9ecef; padding-top: 15px; margin-top: 20px;">
                        <p style="color: #666; font-size: 12px; margin: 0;">
                            Buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:<br>
                            <span style="word-break: break-all; color: #667eea;">${resetLink}</span>
                        </p>
                    </div>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                    <p>© 2024 Hava Kanalı Sipariş Sistemi</p>
                </div>
            </div>
        `;
        
        try {
            if (emailService === 'oauth2') {
                // OAuth2 Gmail email
                const accessToken = await oauth2Client.getAccessToken();
                
                const transporter = nodemailer.createTransporter({
                    service: 'gmail',
                    auth: {
                        type: 'OAuth2',
                        user: EMAIL_FROM,
                        clientId: OAUTH2_CLIENT_ID,
                        clientSecret: OAUTH2_CLIENT_SECRET,
                        refreshToken: OAUTH2_REFRESH_TOKEN,
                        accessToken: accessToken.token,
                    },
                });
                
                const mailOptions = {
                    from: EMAIL_FROM,
                    to: email,
                    subject: 'Şifre Sıfırlama - Hava Kanalı Sipariş Sistemi',
                    html: emailTemplate
                };
                
                await transporter.sendMail(mailOptions);
                console.log(`✅ OAuth2 Gmail password reset email sent to ${email}`);
                
            } else if (emailService === 'sendgrid') {
                // SendGrid with custom HTML template
                const userName = user.firstName || user.email.split('@')[0];
                const emailResult = await sendPasswordResetEmail(email, resetToken, userName);
                if (emailResult.success) {
                    console.log(`✅ SendGrid password reset email sent to ${email}`);
                } else {
                    throw new Error(emailResult.message);
                }
                
            } else if (emailService === 'gmail') {
                // Gmail with App Password (Ücretsiz)
                const { sendPasswordResetEmailGmail } = require('./sendEmailGmail');
                const userName = user.firstName || user.email.split('@')[0];
                const emailResult = await sendPasswordResetEmailGmail(email, resetToken, userName);
                if (emailResult.success) {
                    console.log(`✅ Gmail password reset email sent to ${email}`);
                } else {
                    throw new Error(emailResult.message);
                }
                
            } else if (emailService === 'yaani') {
                // Yaani.com SMTP (Kendi Mail Altyapınız - Tamamen Ücretsiz)
                const { sendPasswordResetEmailYaani } = require('./sendEmailYaani');
                const userName = user.firstName || user.email.split('@')[0];
                const emailResult = await sendPasswordResetEmailYaani(email, resetToken, userName);
                if (emailResult.success) {
                    console.log(`✅ Yaani.com password reset email sent to ${email}`);
                } else {
                    throw new Error(emailResult.message);
                }
                
            } else if (emailTransporter) {
                // Nodemailer (Gmail/Outlook)
                const mailOptions = {
                    from: EMAIL_FROM,
                    to: email,
                    subject: 'Şifre Sıfırlama - Hava Kanalı Sipariş Sistemi',
                    html: emailTemplate
                };
                
                await emailTransporter.sendMail(mailOptions);
                console.log(`✅ ${emailService} password reset email sent to ${email}`);
                
            } else {
                // Demo mode - log the reset link
                console.log(`🔑 Password reset link for ${email}: ${resetLink}`);
            }
        } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            // Fallback to console log if email fails
            console.log(`🔑 Password reset link for ${email}: ${resetLink}`);
        }
        
        // Track password reset request
        await trackSession(user.id, 'password_reset_request', {
            email: user.email
        });
        
        res.json({ message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// OTP tabanlı şifre sıfırlama - Daha basit ve güvenli
app.post('/api/forgot-password-otp', 
    rateLimiters.passwordReset, 
    validationRules.forgotPassword, 
    handleValidationErrors, 
    async (req, res) => {
    try {
        await waitForInit();
        
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'E-posta adresi gerekli' });
        }
        
        const user = await userDB.getUserByEmail(email);
        
        if (!user) {
            // Security: Don't reveal if email exists or not
            return res.json({ 
                success: true,
                message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama kodu gönderildi.' 
            });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes
        
        // Store OTP
        passwordResetOTPStorage.set(email, {
            otp: otp,
            expiresAt: otpExpiry,
            userId: user.id,
            attempts: 0
        });
        
        // Auto-cleanup expired OTP
        setTimeout(() => {
            passwordResetOTPStorage.delete(email);
        }, 15 * 60 * 1000);
        
        // Send OTP via Gmail
        try {
            const userName = user.firstName || user.email.split('@')[0];
            const emailResult = await sendPasswordResetOTP(email, otp, userName);
            
            if (emailResult.success) {
                console.log(`✅ Şifre sıfırlama OTP gönderildi: ${email}`);
            } else if (emailResult.demo) {
                console.log(`🎯 DEMO: Şifre sıfırlama OTP: ${otp} (${email})`);
            }
        } catch (emailError) {
            console.error('❌ OTP e-posta gönderme hatası:', emailError);
            // Continue anyway for security
        }
        
        // Track password reset request
        await trackSession(user.id, 'password_reset_otp_request', {
            email: user.email
        });
        
        res.json({ 
            success: true,
            message: 'Şifre sıfırlama kodu e-posta adresinize gönderildi. Kod 15 dakika geçerlidir.' 
        });
        
    } catch (error) {
        console.error('❌ OTP şifre sıfırlama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// OTP ile şifre sıfırlama
app.post('/api/reset-password-otp', 
    rateLimiters.passwordReset, 
    async (req, res) => {
    try {
        await waitForInit();
        
        const { email, otp, newPassword } = req.body;
        
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'E-posta, OTP ve yeni şifre gerekli' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
        }
        
        // Check OTP
        const otpData = passwordResetOTPStorage.get(email);
        
        if (!otpData) {
            return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş OTP' });
        }
        
        if (otpData.expiresAt < Date.now()) {
            passwordResetOTPStorage.delete(email);
            return res.status(400).json({ error: 'OTP süresi doldu' });
        }
        
        if (otpData.attempts >= 3) {
            passwordResetOTPStorage.delete(email);
            return res.status(400).json({ error: 'Çok fazla yanlış deneme. Yeni OTP talep edin.' });
        }
        
        if (otpData.otp !== otp) {
            otpData.attempts++;
            return res.status(400).json({ error: 'Geçersiz OTP' });
        }
        
        // Get user and update password
        const user = await userDB.getUserById(otpData.userId);
        
        if (!user) {
            return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        const updated = await userDB.updateUser(user.id, { 
            password: hashedPassword,
            updatedAt: new Date().toISOString()
        });
        
        if (!updated) {
            return res.status(500).json({ error: 'Şifre güncellenemedi' });
        }
        
        // Remove used OTP
        passwordResetOTPStorage.delete(email);
        
        // Track password reset completion
        await trackSession(user.id, 'password_reset_otp_complete', {
            email: user.email
        });
        
        res.json({ 
            success: true,
            message: 'Şifreniz başarıyla güncellendi' 
        });
        
    } catch (error) {
        console.error('❌ OTP şifre sıfırlama completion hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Reset Password endpoint
app.post('/api/reset-password', 
    rateLimiters.passwordReset, 
    validationRules.resetPassword, 
    handleValidationErrors, 
    async (req, res) => {
    try {
        // Wait for database initialization
        await waitForInit();
        
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token ve yeni şifre gerekli' });
        }
        
        // Check if token exists and not expired
        const tokenData = await tokenDB.getResetToken(token);
        if (!tokenData || tokenData.expires < Date.now()) {
            return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token' });
        }
        
        // Get user and update password
        const user = await userDB.getUserById(tokenData.userId);
        
        if (!user) {
            return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user password in database
        const updated = await userDB.updateUser(user.id, { 
            password: hashedPassword,
            updatedAt: new Date().toISOString()
        });
        
        if (!updated) {
            return res.status(500).json({ error: 'Şifre güncellenemedi' });
        }
        
        // Remove used token
        await tokenDB.deleteResetToken(token);
        
        // Track password reset completion
        await trackSession(tokenData.userId, 'password_reset_complete', {
            email: tokenData.email
        });
        
        res.json({ message: 'Şifreniz başarıyla güncellendi' });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// OAuth2 callback for getting refresh token
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.send(`
            <h2>❌ OAuth2 Kurulum Hatası</h2>
            <p>Authorization code bulunamadı.</p>
            <a href="/">Ana sayfaya dön</a>
        `);
    }
    
    try {
        const oauth2Setup = new google.auth.OAuth2(
            OAUTH2_CLIENT_ID, 
            OAUTH2_CLIENT_SECRET, 
            'http://localhost:5050/auth/google/callback'
        );
        
        const { tokens } = await oauth2Setup.getToken(code);
        
        res.send(`
            <h2>✅ OAuth2 Kurulum Başarılı!</h2>
            <p>.env dosyanıza aşağıdaki satırı ekleyin:</p>
            <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto;">
OAUTH2_REFRESH_TOKEN=${tokens.refresh_token}
            </pre>
            <p><strong>Sunucuyu yeniden başlatın!</strong></p>
            <a href="/">Ana sayfaya dön</a>
        `);
        
        console.log('\n🎉 OAuth2 Refresh Token alındı!');
        console.log('📝 .env dosyanıza ekleyin:');
        console.log(`OAUTH2_REFRESH_TOKEN=${tokens.refresh_token}`);
        
    } catch (error) {
        console.error('OAuth2 token exchange failed:', error);
        res.send(`
            <h2>❌ OAuth2 Token Hatası</h2>
            <p>Token alınırken hata oluştu: ${error.message}</p>
            <a href="/">Ana sayfaya dön</a>
        `);
    }
});

// Handle client-side routing - catch-all route (must be last!)
app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    console.log('📄 Serving index.html for path:', req.path);
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Error handler - en son middleware olmalı
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} portunda çalışıyor`);
    
    // OAuth2 setup helper
    if (EMAIL_SERVICE === 'oauth2' && !OAUTH2_REFRESH_TOKEN && OAUTH2_CLIENT_ID) {
        console.log('\n📧 OAuth2 Kurulumu Gerekli!');
        console.log('🔗 Bu URL\'ye git:');
        const oauth2Setup = new google.auth.OAuth2(OAUTH2_CLIENT_ID, OAUTH2_CLIENT_SECRET, 'http://localhost:5050/auth/google/callback');
        const authUrl = oauth2Setup.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/gmail.send'],
            prompt: 'consent'
        });
        console.log(authUrl);
        console.log('\n✅ Onayladıktan sonra /auth/google/callback sayfasından kodu alın');
    }
    
    console.log('🔍 Testing Google Auth endpoint internally...');
    
    // Test if the route exists
    setTimeout(() => {
        console.log('Available routes test will be done via external call');
    }, 1000);
    
    // Wait for database initialization
    console.log('⏳ Waiting for database initialization...');
    waitForInit().then(() => {
        console.log('🗄️ Database type:', isPostgreSQL ? 'PostgreSQL' : 'SQLite');
        console.log('✅ Database ready - Server fully initialized');
        console.log('🧪 PostgreSQL available flag:', isPostgreSQL);
    }).catch(error => {
        console.error('❌ Database initialization failed:', error);
    });
});