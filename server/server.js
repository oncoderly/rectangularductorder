// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
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
// Email functions implemented using nodemailer
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || process.env.GMAIL_USER,
            pass: process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD
        }
    });
};

const sendPasswordResetEmail = async (email, resetToken, userName) => {
    try {
        const transporter = createTransporter();
        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        
        await transporter.sendMail({
            from: process.env.SENDER_EMAIL || process.env.GMAIL_USER,
            to: email,
            subject: 'Şifre Sıfırlama',
            html: `
                <h2>Şifre Sıfırlama</h2>
                <p>Merhaba ${userName},</p>
                <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
                <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Şifreyi Sıfırla</a>
                <p>Bu bağlantı 1 saat geçerlidir.</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Email gönderme hatası:', error);
        return { success: false, error: error.message };
    }
};

const sendWelcomeEmail = async (email, firstName) => {
    try {
        const transporter = createTransporter();
        
        await transporter.sendMail({
            from: process.env.SENDER_EMAIL || process.env.GMAIL_USER,
            to: email,
            subject: 'Hoş Geldiniz!',
            html: `
                <h2>Hoş Geldiniz ${firstName}!</h2>
                <p>Hesabınız başarıyla oluşturuldu.</p>
                <p>Hizmetimizi kullanmaya başlayabilirsiniz.</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Email gönderme hatası:', error);
        return { success: false, error: error.message };
    }
};

const sendPasswordResetOTP = async (email, otp, userName) => {
    try {
        const transporter = createTransporter();
        
        await transporter.sendMail({
            from: process.env.SENDER_EMAIL || process.env.GMAIL_USER,
            to: email,
            subject: 'Şifre Sıfırlama Kodu',
            html: `
                <h2>Şifre Sıfırlama Kodu</h2>
                <p>Merhaba ${userName},</p>
                <p>Şifre sıfırlama kodunuz: <strong>${otp}</strong></p>
                <p>Bu kod 10 dakika geçerlidir.</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Email gönderme hatası:', error);
        return { success: false, error: error.message };
    }
};

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

// Firebase routes import
const firebaseAuthRoutes = require('./routes/firebase-auth');

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
                `${SERVER_URL}/auth/google/callback`
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
const isProductionEnv = process.env.NODE_ENV === 'production' || process.env.SERVER_URL?.startsWith('https://');

// Session store configuration
let sessionStore;

// Initialize session store asynchronously with database wait
async function initializeSessionStore() {
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
        try {
            console.log('🔧 SESSION STORE: Waiting for database initialization...');
            
            // Wait for database to be ready
            const databaseModule = require('./database-selector');
            await databaseModule.waitForInit();
            
            console.log('🔧 SESSION STORE: Database ready, configuring PostgreSQL session store...');
            
            // Use the same connection pool as the main database
            const dbInstance = db();
            
            // Create sessions table if it doesn't exist
            await dbInstance.query(`
                CREATE TABLE IF NOT EXISTS sessions (
                    sid VARCHAR NOT NULL PRIMARY KEY,
                    sess JSON NOT NULL,
                    expire TIMESTAMP(6) NOT NULL
                );
                CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON sessions("expire");
            `);
            
            // Use PostgreSQL session store in production
            sessionStore = new pgSession({
                pool: dbInstance,  // Use existing connection pool
                tableName: 'sessions',
                createTableIfMissing: false  // We created it manually above
            });
            
            console.log('✅ PostgreSQL session store configured successfully with shared connection pool');
            return true;
        } catch (error) {
            console.error('❌ PostgreSQL session store configuration failed:', error.message);
            console.log('⚠️ Falling back to memory session store');
            sessionStore = undefined;
            return false;
        }
    } else {
        // Use memory store in development
        sessionStore = undefined;
        console.log('⚠️ Using memory session store (development mode)');
        return true;
    }
}

// Configure session middleware immediately (synchronously)
console.log('🔧 SESSION SETUP: Configuring session middleware immediately');
console.log('🔧 SESSION SETUP: isProductionEnv:', isProductionEnv);
console.log('🔧 SESSION SETUP: Cookie secure:', isProductionEnv);

// Session configuration function
function createSessionMiddleware() {
    return session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: 'sessionId',
        store: sessionStore, // Will use current sessionStore value
        cookie: { 
            secure: isProductionEnv,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        },
        rolling: true
    });
}

// Initialize session store synchronously for production
async function setupApplication() {
    try {
        // Initialize session store first in production
        if (process.env.NODE_ENV === 'production') {
            console.log('🔧 Production mode: Initializing session store before middleware setup...');
            await initializeSessionStore();
        }
        
        // Configure session middleware with proper store
        app.use(createSessionMiddleware());
        console.log('✅ SESSION SETUP: Express session middleware configured with store:', 
                   sessionStore ? sessionStore.constructor.name : 'Memory Store');

        // Passport initialization
        console.log('🔧 Initializing Passport middleware...');
        app.use(passport.initialize());
        app.use(passport.session());
        console.log('✅ Passport middleware initialized');

        // CRITICAL: Register all routes AFTER session middleware is configured
        console.log('🔧 Registering all API routes after session middleware...');
        registerAllRoutes();

        // START SERVER
        startServer();
        
    } catch (error) {
        console.error('❌ Application setup failed:', error.message);
        console.log('⚠️ Continuing with memory session store...');
        
        // Fallback setup without PostgreSQL session store
        app.use(createSessionMiddleware());
        app.use(passport.initialize());
        app.use(passport.session());
        registerAllRoutes();
        startServer();
    }
}

// Start application setup
setupApplication();

// Debug: Environment variables
console.log('🔧 Google OAuth Config:');
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('🔧 URL Config:');
console.log('CLIENT_URL:', CLIENT_URL);
console.log('SERVER_URL:', SERVER_URL);
console.log('🔧 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Is Production:', isProductionEnv);
console.log('🔧 Expected Production URLs (Same Service):');
console.log('Should be CLIENT_URL: https://rectangularductorder.onrender.com'); 
console.log('Should be SERVER_URL: https://rectangularductorder.onrender.com');
console.log('🔧 Note: Both frontend and backend run on the same service URL');

// Passport Google Strategy
console.log('🔧 PASSPORT GOOGLE STRATEGY SETUP:');
console.log('🔧 GOOGLE_CLIENT_ID available:', !!GOOGLE_CLIENT_ID);
console.log('🔧 GOOGLE_CLIENT_SECRET available:', !!GOOGLE_CLIENT_SECRET);
console.log('🔧 SERVER_URL for callback:', SERVER_URL);

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    console.log('✅ Setting up Google Strategy...');
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔍 GoogleStrategy: Callback triggered');
        console.log('🔍 GoogleStrategy: Profile email:', profile.emails[0].value);
        console.log('🔍 GoogleStrategy: Profile ID:', profile.id);
        
        // Wait for database initialization
        await waitForInit();
        
        // Find user by Google ID first
        const allUsers = await userDB().getAllUsers();
        let user = allUsers.find(u => u.googleId === profile.id);
        console.log('🔍 GoogleStrategy: User found by Google ID:', !!user);
        
        // If user found, get fresh data from database to ensure role is current
        if (user) {
            user = await userDB().getUserById(user.id);
            console.log('🔍 GoogleStrategy: Fresh user data from DB:', user);
            console.log('🔍 GoogleStrategy: Fresh user role:', user?.role);
            
            // Check if user should be admin and update if needed
            const isAdmin = profile.emails[0].value === 'havakanalsiparis@gmail.com' || 
                           profile.emails[0].value === 'salihosmanli34@gmail.com';
            console.log('🔍 GoogleStrategy: Should be admin?', isAdmin);
            
            if (isAdmin && user.role !== 'admin') {
                console.log('🔄 GoogleStrategy: Updating existing user to admin');
                await userDB().updateUser(user.id, { role: 'admin' });
                user.role = 'admin';
                console.log('✅ GoogleStrategy: User updated to admin');
            }
        }
        
        if (!user) {
            console.log('🔍 GoogleStrategy: No user found by Google ID, checking by email');
            // Check if user exists with same email
            user = await userDB().getUserByEmail(profile.emails[0].value);
            console.log('🔍 GoogleStrategy: User found by email:', !!user);
            
            if (user) {
                console.log('🔄 GoogleStrategy: LINKING - Google account to existing user');
                console.log('🔄 GoogleStrategy: Existing user ID:', user.id);
                console.log('🔄 GoogleStrategy: Existing user email:', user.email);
                console.log('🔄 GoogleStrategy: Existing user role:', user.role);
                
                // Link Google account to existing user and update admin role if needed
                const isAdmin = profile.emails[0].value === 'havakanalsiparis@gmail.com' || 
                               profile.emails[0].value === 'salihosmanli34@gmail.com';
                console.log('🔄 GoogleStrategy: Is admin email?', isAdmin);
                
                const updateData = { 
                    googleId: profile.id,
                    role: isAdmin ? 'admin' : (user.role || 'user')
                };
                console.log('🔄 GoogleStrategy: Update data to save to DB:', updateData);
                
                const updateResult = await userDB().updateUser(user.id, updateData);
                console.log('🔄 GoogleStrategy: Update result from DB:', updateResult);
                
                if (updateResult) {
                    // Verify update by fetching fresh data from DB
                    const verifyUser = await userDB().getUserById(user.id);
                    if (verifyUser) {
                        user = verifyUser; // Use fresh DB data
                        console.log('✅ GoogleStrategy: User update verified from DB:', {
                            id: user.id,
                            email: user.email,
                            googleId: user.googleId,
                            role: user.role
                        });
                    } else {
                        console.error('❌ GoogleStrategy: User update verification failed - user not found');
                        return done(new Error('User update verification failed'), null);
                    }
                } else {
                    console.error('❌ GoogleStrategy: User update failed in database');
                    return done(new Error('Failed to update user in database'), null);
                }
            } else {
                // Create new user
                const isAdmin = profile.emails[0].value === 'havakanalsiparis@gmail.com' || 
                               profile.emails[0].value === 'salihosmanli34@gmail.com';
                const newUser = {
                    id: Date.now().toString(),
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    role: isAdmin ? 'admin' : 'user',
                    createdAt: new Date().toISOString()
                };
                
                console.log('🔄 GoogleStrategy: Creating new user in database...');
                const created = await userDB().createUser(newUser);
                console.log('🔍 GoogleStrategy: User creation result:', created);
                
                if (created) {
                    // Verify user was actually created by fetching from DB
                    const verifyUser = await userDB().getUserByEmail(newUser.email);
                    if (verifyUser && verifyUser.id) {
                        user = verifyUser; // Use actual DB user, not local object
                        console.log('✅ GoogleStrategy: New user verified in database:', user.email);
                    } else {
                        console.error('❌ GoogleStrategy: User creation verification failed');
                        return done(new Error('User creation verification failed'), null);
                    }
                } else {
                    console.error('❌ GoogleStrategy: Database user creation failed');
                    return done(new Error('Failed to create user in database'), null);
                }
            }
        }
        
        console.log('✅ GoogleStrategy: Final user object to return:', user);
        console.log('✅ GoogleStrategy: Final role to return:', user?.role);
        return done(null, user);
    } catch (error) {
        console.error('❌ GoogleStrategy: Error:', error);
        return done(error, null);
    }
}));

    console.log('✅ Google OAuth strategy configured successfully');
    console.log('✅ Callback URL set to:', `${SERVER_URL}/api/auth/google/callback`);
} else {
    console.log('❌ Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
    console.log('❌ Missing GOOGLE_CLIENT_ID:', !GOOGLE_CLIENT_ID);
    console.log('❌ Missing GOOGLE_CLIENT_SECRET:', !GOOGLE_CLIENT_SECRET);
}

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        await waitForInit();
        const user = await userDB().getUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// MOVED TO registerAllRoutes() function
// app.use('/images', express.static(path.join(__dirname, '../public/images')));
// app.use(express.static(path.join(__dirname, '../client/dist')));

console.log('🔧 Registering root route...');
// API status endpoint
app.get('/api/status', async (req, res) => {
    try {
        let dbStatus = 'unknown';
        let dbType = 'unknown';
        let dbError = null;
        
        try {
            await waitForInit();
            dbType = isPostgreSQL() ? 'PostgreSQL' : 'SQLite';
            
            // Test database connection
            if (userDB() && userDB().getUserCount) {
                const count = await userDB().getUserCount();
                dbStatus = 'connected';
            } else {
                dbStatus = 'userDB not available';
                dbError = 'userDB is null or getUserCount method missing';
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
                postgresAvailable: isPostgreSQL()
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

// Main debug endpoint
app.get('/api/debug', async (req, res) => {
    try {
        await waitForInit();
        
        const userCount = await userDB().getUserCount();
        
        res.json({
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
            USE_POSTGRESQL: process.env.USE_POSTGRESQL,
            isPostgreSQL: isPostgreSQL,
            databaseType: isPostgreSQL() ? 'PostgreSQL' : 'SQLite',
            userCount: userCount,
            timestamp: new Date().toISOString(),
            status: 'Database connected and working'
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            timestamp: new Date().toISOString(),
            status: 'Database connection failed'
        });
    }
});

// Debug environment variables
console.log('🔍 ENV DEBUG - DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔍 ENV DEBUG - DATABASE_URL first 30 chars:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('🔍 ENV DEBUG - NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 ENV DEBUG - USE_POSTGRESQL:', process.env.USE_POSTGRESQL);

// CRITICAL: Check for production environment and DATABASE_URL
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER_SERVICE_NAME;
if (isProduction && !process.env.DATABASE_URL) {
    console.error('❌ CRITICAL ERROR: Production environment detected but DATABASE_URL is not set!');
    console.error('❌ This will cause data loss on Render.com!');
    console.error('❌ Please set DATABASE_URL environment variable in Render.com dashboard');
}

// Deployment monitoring removed - not needed
console.log('✅ Starting server without deployment monitoring');

// Import database module  
const databaseModule = require('./database-selector');
const { waitForInit } = databaseModule;
// Create getter proxies for database objects to handle async initialization
const db = () => databaseModule.db;
const userDB = () => databaseModule.userDB;
const tokenDB = () => databaseModule.tokenDB;
const analyticsDB = () => databaseModule.analyticsDB;
const isPostgreSQL = () => databaseModule.isPostgreSQL;

// Analytics functions implemented inline
const trackSession = async (userId, action, data = {}) => {
    try {
        console.log(`📊 Analytics: ${action} by user ${userId}`, data);
        // Analytics tracking disabled - just log
        return { success: true };
    } catch (error) {
        console.error('Analytics tracking error:', error);
        return { success: false };
    }
};

const getAnalyticsSummary = async () => {
    try {
        console.log('📊 Analytics summary requested');
        // Return empty analytics data
        return {
            totalSessions: 0,
            uniqueUsers: 0,
            popularActions: [],
            recentActivity: []
        };
    } catch (error) {
        console.error('Analytics summary error:', error);
        return { totalSessions: 0, uniqueUsers: 0, popularActions: [], recentActivity: [] };
    }
};

const loadUsers = async () => {
    try {
        await waitForInit();
        const users = await userDB().getAllUsers();
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

// Analytics functions are now imported from analytics.js module

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
        try {
            await waitForInit();
        } catch (initError) {
            console.error('❌ Database initialization failed:', initError.message);
            return res.status(500).json({ 
                error: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.' 
            });
        }
        
        const { email, password, firstName, lastName } = req.body;
        
        // Check if user already exists
        const existingUser = await userDB().getUserByEmail(email);
        
        if (existingUser) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı' });
        }
        
        console.log('🔐 REGISTRATION DEBUG:');
        console.log('🔐 Raw password from request:', password);
        console.log('🔐 Raw password length:', password ? password.length : 0);
        
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔐 Generated hash:', hashedPassword);
        console.log('🔐 Generated hash length:', hashedPassword ? hashedPassword.length : 0);
        console.log('🔐 Hash starts with $2b$:', hashedPassword ? hashedPassword.startsWith('$2b$') : false);
        
        // Immediate verification test
        const immediateTest = await bcrypt.compare(password, hashedPassword);
        console.log('🔐 Immediate hash verification test:', immediateTest);
        
        // Check if this is admin email
        const isAdmin = email === 'havakanalsiparis@gmail.com' || email === 'salihosmanli34@gmail.com';
        
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
        console.log('⚙️ USER CREATION DEBUG:');
        console.log('⚙️ User object to save:', {
            id: newUser.id,
            email: newUser.email,
            hasPassword: !!newUser.password,
            passwordHash: newUser.password ? newUser.password.substring(0, 20) + '...' : 'NO PASSWORD',
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            createdAt: newUser.createdAt
        });
        
        const created = await userDB().createUser(newUser);
        console.log('⚙️ User creation result:', created);
        
        // Verify user was saved correctly
        if (created) {
            const savedUser = await userDB().getUserByEmail(email);
            console.log('⚙️ VERIFICATION - Saved user retrieved:', {
                found: !!savedUser,
                id: savedUser?.id,
                email: savedUser?.email,
                hasPassword: !!savedUser?.password,
                passwordHash: savedUser?.password ? savedUser.password.substring(0, 20) + '...' : 'NO PASSWORD',
                createdAt: savedUser?.createdAt
            });
            
            // Test password verification with stored user
            if (savedUser && savedUser.password) {
                const verificationTest = await bcrypt.compare(password, savedUser.password);
                console.log('⚙️ Post-save password verification test:', verificationTest);
            }
        }
        
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
        sendWelcomeEmail(newUser.email, newUser.firstName).catch(error => {
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
        try {
            await waitForInit();
        } catch (initError) {
            console.error('❌ Database initialization failed:', initError.message);
            return res.status(500).json({ 
                error: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.' 
            });
        }
        
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt:', { email, passwordProvided: !!password });
        
        console.log('👥 Total users in database:', await userDB().getUserCount());
        console.log('🗄️ Current database type:', isPostgreSQL() ? 'PostgreSQL' : 'SQLite');
        console.log('🔍 Database connection status:', isPostgreSQL);
        console.log('📧 Looking for user with email:', email);
        
        // Debug: List all users for troubleshooting
        const allUsers = await userDB().getAllUsers();
        console.log('🔍 All users in database:', allUsers.map(u => ({ 
            email: u.email, 
            id: u.id, 
            hasPassword: !!u.password,
            createdAt: u.createdAt 
        })));
        
        const user = await userDB().getUserByEmail(email);
        console.log('🔍 User found:', !!user);
        
        if (user) {
            console.log('🔍 User details:', {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                hasPassword: !!user.password,
                passwordHash: user.password ? user.password.substring(0, 20) + '...' : 'NO PASSWORD',
                createdAt: user.createdAt
            });
        }
        
        if (!user) {
            console.log('❌ No user found with email:', email);
            // Generic error message to prevent user enumeration
            return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
        }
        
        // Enhanced password debugging
        console.log('🔐 PASSWORD COMPARISON DEBUG:');
        console.log('🔐 Raw password from request:', password);
        console.log('🔐 Raw password length:', password ? password.length : 0);
        console.log('🔐 Stored hash from DB:', user.password);
        console.log('🔐 Stored hash length:', user.password ? user.password.length : 0);
        console.log('🔐 Hash starts with $2b$ (bcrypt):', user.password ? user.password.startsWith('$2b$') : false);
        console.log('🔐 Hash starts with $2a$ (bcrypt):', user.password ? user.password.startsWith('$2a$') : false);
        
        // Check if password exists
        if (!user.password) {
            console.log('❌ CRITICAL: User has no password stored in database!');
            console.log('❌ This user might have been created via Google OAuth without a password');
            return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
        }
        
        if (!password) {
            console.log('❌ No password provided in request');
            return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
        }
        
        try {
            const isValidPassword = await bcrypt.compare(password, user.password);
            console.log('🔐 Password comparison result:', isValidPassword);
            
            if (!isValidPassword) {
                console.log('❌ Invalid password for user:', email);
                console.log('❌ Password mismatch - either wrong password or hash corruption');
                
                // Additional debugging for password issues
                console.log('🔍 Trying to verify hash format...');
                const testHash = await bcrypt.hash('test123', 10);
                console.log('🔍 New test hash format:', testHash.substring(0, 20) + '...');
                
                return res.status(400).json({ error: 'Geçersiz kimlik bilgileri' });
            }
        } catch (bcryptError) {
            console.error('❌ BCRYPT COMPARISON ERROR:', bcryptError);
            console.error('❌ This indicates hash corruption or format issues');
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

// MOVED TO registerAllRoutes() function
// console.log('🔧 ROUTE REGISTRATION: Registering /api/me endpoint');

// app.get('/api/me', async (req, res) => {
//     console.log('🔍 /api/me: ENDPOINT HIT - Request received');
//     console.log('🔍 /api/me: Request headers:', req.headers);  
//     console.log('🔍 /api/me: Request URL:', req.url);
//     
//     try {
//         // Wait for database initialization
//         await waitForInit();
//         
//         // Debug session and database status
//         console.log('🔍 /api/me: Session debug info:', {
//             sessionExists: !!req.session,
//             sessionID: req.sessionID,
//             sessionUserId: req.session ? req.session.userId : 'NO_SESSION'
//         });
//         
//         console.log('🔍 /api/me: Database debug info:', {
//             userDB_exists: !!userDB,
//             userDB_type: userDB ? userDB().constructor.name : 'null',
//             isPostgreSQL: isPostgreSQL()
//         });
//         
//         if (!req.session) {
//             console.error('❌ /api/me: req.session is undefined - session middleware not working');
//             return res.status(500).json({ error: 'Session not available' });
//         }
//         
//         if (!req.session.userId) {
//             return res.status(401).json({ error: 'Oturum açılmamış' });
//         }
//         
//         if (!userDB) {
//             console.error('❌ /api/me: userDB is null/undefined');
//             return res.status(500).json({ error: 'Database not available' });
//         }
//         
//         if (!userDB().getUserById) {
//             console.error('❌ /api/me: userDB().getUserById is not a function');
//             return res.status(500).json({ error: 'Database method not available' });
//         }
//         
//         const user = await userDB().getUserById(req.session.userId);
//         
//         if (!user) {
//             return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
//         }
//         
//         res.json({ 
//             user: { 
//                 id: user.id, 
//                 email: user.email, 
//                 firstName: user.firstName, 
//                 lastName: user.lastName,
//                 role: user.role || 'user'
//             } 
//         });
//     } catch (error) {
//         console.error('❌ /api/me error:', error);
//         console.error('❌ /api/me error stack:', error.stack);
//         console.error('❌ /api/me error details:', {
//             message: error.message,
//             name: error.name,
//             sessionExists: !!req.session,
//             sessionUserId: req.session ? req.session.userId : 'NO_SESSION'
//         });
//         res.status(500).json({ error: 'Sunucu hatası' });
//     }
// }); // END OF COMMENTED /api/me route

// Moved to registerAllRoutes()

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
// MOVED TO registerAllRoutes() function  
// console.log('🔧 Registering Google auth route...');
// console.log('🔧 CRITICAL: About to register /api/auth/google route');
// console.log('🔧 CRITICAL: Current GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'EXISTS' : 'MISSING');
// console.log('🔧 CRITICAL: Current GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'EXISTS' : 'MISSING');

// app.get('/api/auth/google', (req, res, next) => {
//     console.log('🔍 Google auth endpoint hit');
//     console.log('🔍 DEBUG - Request URL:', req.url);
//     console.log('🔍 DEBUG - Request method:', req.method);
//     console.log('🔍 DEBUG - Request headers:', req.headers);
//     console.log('🔍 DEBUG - GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'EXISTS' : 'NOT FOUND');
//     console.log('🔍 DEBUG - GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'EXISTS' : 'NOT FOUND');
//     console.log('🔍 DEBUG - SERVER_URL:', SERVER_URL);
//     console.log('🔍 DEBUG - CLIENT_URL:', CLIENT_URL);
//     console.log('🔍 DEBUG - Callback URL will be:', `${SERVER_URL}/api/auth/google/callback`);
//     
//     if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
//         console.log('❌ DEBUG - Variables are falsy, returning error');
//         return res.status(500).json({ error: 'Google OAuth not configured' });
//     }
//     console.log('✅ DEBUG - Variables are truthy, proceeding with auth');
//     console.log('✅ DEBUG - Redirecting to Google OAuth...');
//     
//     try {
//         passport.authenticate('google', { 
//             scope: ['profile', 'email'] 
//         })(req, res, next);
//     } catch (error) {
//         console.error('❌ ERROR in passport.authenticate:', error);
//         res.status(500).json({ error: 'Authentication error', details: error.message });
//     }
// }); // END OF COMMENTED Google auth route

// MOVED TO registerAllRoutes() function  
// console.log('🔧 ROUTE REGISTRATION: Registering /api/auth/google/callback endpoint');

// app.get('/api/auth/google/callback', (req, res, next) => {
//     console.log('🔍 OAuth Callback HIT - Query params:', req.query);
//     console.log('🔍 OAuth Callback - Full URL:', req.url);
//     console.log('🔍 OAuth Callback - Headers:', req.headers);
//     
//     passport.authenticate('google', { 
//         failureRedirect: `${CLIENT_URL}/?error=google_auth_failed` 
//     })(req, res, (err) => {
//         if (err) {
//             console.log('❌ Passport authentication error:', err);
//             return res.redirect(`${CLIENT_URL}/?error=passport_error`);
//         }
//         
//         if (!req.user) {
//             console.log('❌ No user found after authentication');
//             return res.redirect(`${CLIENT_URL}/?error=no_user`);
//         }
//         
//         // Successful authentication, redirect to client  
//         console.log('✅ OAuth Callback - User authenticated:', req.user?.email);
//         console.log('✅ OAuth Callback - User role:', req.user?.role);
//         console.log('✅ OAuth Callback - User object:', JSON.stringify(req.user, null, 2));
//         
//         req.session.userId = req.user.id;
//         console.log('🔍 OAuth Callback - Setting session userId:', req.user.id);
//         console.log('🔍 OAuth Callback - Session before save:', {
//             sessionID: req.sessionID,
//             userId: req.session.userId,
//             sessionKeys: Object.keys(req.session)
//         });
//         
//         // Session'ı kaydet (ÇÖZÜM!)
//         req.session.save((err) => {
//             if (err) {
//                 console.error('❌ Session save error:', err);
//                 console.error('❌ Session save error details:', err.message);
//                 return res.redirect(`${CLIENT_URL}/?error=session_save_failed`);
//             }
//             
//             console.log('✅ Session saved successfully for user:', req.user.id);
//             console.log('✅ Session saved - SessionID:', req.sessionID);
//             console.log('✅ OAuth Callback - Redirecting to:', `${CLIENT_URL}/?google_auth=success`);
//             
//             // Track Google OAuth login
//             trackSession(req.user.id, 'user_login', {
//                 method: 'google',
//                 email: req.user.email
//             }).catch(err => console.error('Analytics tracking error:', err));
//             
//             res.redirect(`${CLIENT_URL}/?google_auth=success`);
//         });
//     });
// });

// Moved to registerAllRoutes()

// Analytics tracking endpoint
app.post('/api/track', 
    rateLimiters.analytics, 
    validationRules.analytics, 
    handleValidationErrors, 
    async (req, res) => {
    try {
        const { action, data } = req.body;
        
        // Debug session
        console.log('🔍 TRACK API: req.session exists:', !!req.session);
        console.log('🔍 TRACK API: req.session value:', req.session);
        console.log('🔍 TRACK API: req.sessionID:', req.sessionID);
        
        // Safe session access
        const userId = (req.session && req.session.userId) ? req.session.userId : 'guest';
        console.log('🔍 TRACK API: userId resolved to:', userId);
        
        if (!action) {
            return res.status(400).json({ error: 'Action is required' });
        }
        
        await trackSession(userId, action, data || {});
        res.json({ message: 'Tracking successful' });
    } catch (error) {
        console.error('Analytics tracking error:', error);
        console.error('Analytics error stack:', error.stack);
        console.error('Analytics error details:', {
            message: error.message,
            name: error.name,
            userId,
            action,
            data
        });
        res.status(500).json({ error: 'Tracking failed' });
    }
});

// Debug endpoint for analytics testing
app.post('/api/debug/track', async (req, res) => {
    try {
        const { action, data } = req.body;
        const userId = 'debug-user';
        
        console.log('🔍 DEBUG TRACK: Starting debug track...', { action, data, userId });
        
        console.log('🔍 DEBUG TRACK: Using inline trackSession function');
        
        // Test trackSession call
        await trackSession(userId, action || 'debug_test', data || {});
        console.log('🔍 DEBUG TRACK: trackSession completed successfully');
        
        res.json({ 
            success: true,
            message: 'Debug tracking successful',
            details: { userId, action, data }
        });
    } catch (error) {
        console.error('🔍 DEBUG TRACK ERROR:', error);
        console.error('🔍 DEBUG TRACK ERROR STACK:', error.stack);
        res.status(500).json({ 
            error: 'Debug tracking failed',
            message: error.message,
            stack: error.stack
        });
    }
});

// Admin analytics endpoint
app.get('/api/admin/analytics', async (req, res) => {
    try {
        // Check if user is authenticated (basic check)
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        await waitForInit();
        
        const summary = await getAnalyticsSummary();
        
        // Get all users to enrich the data with user details
        const allUsers = await userDB().getAllUsers();
        const userMap = {};
        allUsers.forEach(user => {
            userMap[user.id] = {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: `${user.firstName} ${user.lastName}`.trim() || user.email
            };
        });
        
        // Enrich analytics data with user details
        const enrichedSummary = {
            ...summary,
            databaseType: isPostgreSQL ? 'PostgreSQL' : 'SQLite'
        };
        
        // Enrich recent activities with user details
        if (enrichedSummary.recentActivities) {
            enrichedSummary.recentActivities = enrichedSummary.recentActivities.map(activity => ({
                ...activity,
                userDetails: activity.userId === 'guest' ? {
                    email: 'Misafir Kullanıcı',
                    displayName: 'Misafir Kullanıcı'
                } : userMap[activity.userId] || {
                    email: activity.userId,
                    displayName: activity.userId
                }
            }));
        }
        
        // Enrich user activities with user details
        if (enrichedSummary.userActivities) {
            enrichedSummary.userActivities = enrichedSummary.userActivities.map(userActivity => ({
                ...userActivity,
                userDetails: userActivity.userId === 'guest' ? {
                    email: 'Misafir Kullanıcı',
                    displayName: 'Misafir Kullanıcı'
                } : userMap[userActivity.userId] || {
                    email: userActivity.userId,
                    displayName: userActivity.userId
                }
            }));
        }
        
        res.json(enrichedSummary);
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Admin deployment status endpoint
app.get('/api/admin/deployment', async (req, res) => {
    try {
        // Check if user is authenticated (basic check)
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('🔍 Admin deployment status requested by user:', req.session.userId);

        // Generate deployment report (simplified without deployment monitor)
        const userCount = await db().getUserCount();
        
        res.json({
            success: true,
            report: { status: 'healthy', userCount },
            alerts: [],
            userHistory: [],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Admin deployment status error:', error);
        res.status(500).json({ error: 'Failed to get deployment status' });
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
        const users = await userDB().getAllUsers();
        
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
        
        const user = await userDB().getUserByEmail(email);
        
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
                
            } else {
                // Use nodemailer with current SMTP settings
                const userName = user.firstName || user.email.split('@')[0];
                const emailResult = await sendPasswordResetEmail(email, resetToken, userName);
                if (emailResult.success) {
                    console.log(`✅ Password reset email sent to ${email}`);
                } else {
                    throw new Error(emailResult.error);
                }
                
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
        
        const user = await userDB().getUserByEmail(email);
        
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
        const user = await userDB().getUserById(otpData.userId);
        
        if (!user) {
            return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        const updated = await userDB().updateUser(user.id, { 
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
        const user = await userDB().getUserById(tokenData.userId);
        
        if (!user) {
            return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user password in database
        const updated = await userDB().updateUser(user.id, { 
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
            `${SERVER_URL}/auth/google/callback`
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

// Moved to registerAllRoutes() function


// Error handler - en son middleware olmalı
app.use(errorHandler);

// Function to register all routes - called after session middleware is ready
function registerAllRoutes() {
    console.log('🔧 CRITICAL: Starting route registration AFTER session middleware');
    
    // Static files
    app.use('/images', express.static(path.join(__dirname, '../public/images')));
    app.use(express.static(path.join(__dirname, '../client/dist')));
    
    console.log('🔧 Registering root route...');
    
    // CRITICAL: /api/me endpoint - needs session
    console.log('🔧 ROUTE REGISTRATION: Registering /api/me endpoint');
    app.get('/api/me', async (req, res) => {
        console.log('🔍 /api/me: ENDPOINT HIT - Request received');
        console.log('🔍 /api/me: Request headers:', req.headers);  
        console.log('🔍 /api/me: Request URL:', req.url);
        
        try {
            // Wait for database initialization
            await waitForInit();
            
            // Debug session and database status
            console.log('🔍 /api/me: Session debug info:', {
                sessionExists: !!req.session,
                sessionID: req.sessionID,
                sessionUserId: req.session ? req.session.userId : 'NO_SESSION'
            });
            
            console.log('🔍 /api/me: Database debug info:', {
                userDB_exists: !!userDB(),
                userDB_type: userDB() ? userDB().constructor.name : 'null',
                isPostgreSQL: isPostgreSQL()
            });
            
            if (!req.session) {
                console.error('❌ /api/me: req.session is undefined - session middleware not working');
                return res.status(500).json({ error: 'Session not available' });
            }
            
            if (!req.session.userId) {
                return res.status(401).json({ error: 'Oturum açılmamış' });
            }
            
            if (!userDB()) {
                console.error('❌ /api/me: userDB is null/undefined');
                return res.status(500).json({ error: 'Database not available' });
            }
            
            if (!userDB().getUserById) {
                console.error('❌ /api/me: userDB().getUserById is not a function');
                return res.status(500).json({ error: 'Database method not available' });
            }
            
            const user = await userDB().getUserById(req.session.userId);
            
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
            console.error('❌ /api/me error:', error);
            console.error('❌ /api/me error stack:', error.stack);
            console.error('❌ /api/me error details:', {
                message: error.message,
                name: error.name,
                sessionExists: !!req.session,
                sessionUserId: req.session ? req.session.userId : 'NO_SESSION'
            });
            res.status(500).json({ error: 'Sunucu hatası' });
        }
    });
    
    // Google Auth routes that need session
    console.log('🔧 Registering Google auth route...');
    app.get('/api/auth/google', (req, res, next) => {
        console.log('🔍 Google auth endpoint hit');
        console.log('🔍 DEBUG - Request URL:', req.url);
        console.log('🔍 DEBUG - Request method:', req.method);
        console.log('🔍 DEBUG - Request headers:', req.headers);
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
        
        try {
            passport.authenticate('google', { 
                scope: ['profile', 'email'] 
            })(req, res, next);
        } catch (error) {
            console.error('❌ ERROR in passport.authenticate:', error);
            res.status(500).json({ error: 'Authentication error', details: error.message });
        }
    });

    console.log('🔧 ROUTE REGISTRATION: Registering /api/auth/google/callback endpoint');
    app.get('/api/auth/google/callback', (req, res, next) => {
        console.log('🔍 OAuth Callback HIT - Query params:', req.query);
        console.log('🔍 OAuth Callback - Full URL:', req.url);
        console.log('🔍 OAuth Callback - Headers:', req.headers);
        
        passport.authenticate('google', { 
            failureRedirect: `${CLIENT_URL}/?error=google_auth_failed` 
        })(req, res, (err) => {
            if (err) {
                console.error('❌ Passport authentication error:', err);
                return res.redirect(`${CLIENT_URL}/?error=passport_error`);
            }
            
            if (!req.user) {
                console.error('❌ OAuth Callback - No user data returned');
                return res.redirect(`${CLIENT_URL}/?error=no_user_data`);  
            }
            
            console.log('✅ OAuth Callback - User authenticated:', req.user?.email);
            console.log('✅ OAuth Callback - User role:', req.user?.role);
            console.log('✅ OAuth Callback - User object:', JSON.stringify(req.user, null, 2));
            
            req.session.userId = req.user.id;
            console.log('🔍 OAuth Callback - Setting session userId:', req.user.id);
            console.log('🔍 OAuth Callback - Session before save:', {
                sessionID: req.sessionID,
                userId: req.session.userId,
                sessionKeys: Object.keys(req.session)
            });
            
            // Session'ı kaydet (ÇÖZÜM!)
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err);
                    console.error('❌ Session save error details:', err.message);
                    return res.redirect(`${CLIENT_URL}/?error=session_save_failed`);
                }
                
                console.log('✅ Session saved successfully for user:', req.user.id);
                console.log('✅ Session saved - SessionID:', req.sessionID);
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
            console.log('🔍 Google Success: Endpoint called');
            console.log('🔍 Google Success: Session userId:', req.session.userId);
            
            if (!req.session.userId) {
                console.log('❌ Google Success: No session userId');
                return res.status(401).json({ error: 'Oturum açılmamış' });
            }
            
            // Wait for database initialization
            await waitForInit();
            
            const user = await userDB().getUserById(req.session.userId);
            console.log('👤 Google Success: User from DB:', user);
            console.log('🔑 Google Success: User role from DB:', user?.role);
            
            if (!user) {
                console.log('❌ Google Success: User not found in DB');
                return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
            }
            
            res.json({ 
                user: { 
                    id: user.id, 
                    email: user.email, 
                    firstName: user.firstName, 
                    lastName: user.lastName,
                    role: user.role
                } 
            });
        } catch (error) {
            console.error('❌ Google Success: Error:', error);
            res.status(500).json({ error: 'Sunucu hatası' });
        }
    });

    // Logout endpoint
    app.post('/api/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Çıkış yapılırken hata oluştu' });
            }
            res.json({ message: 'Başarıyla çıkış yapıldı' });
        });
    });
    
    // Handle client-side routing - catch-all route (MUST BE LAST!)
    app.use((req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        console.log('📄 Serving index.html for path:', req.path);
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
    
    // Firebase Auth Routes
    console.log('🔥 Registering Firebase Auth routes...');
    app.use('/api/firebase', firebaseAuthRoutes);
    
    console.log('✅ Critical routes registered successfully AFTER session middleware');
}


// Graceful shutdown handling
let serverInstance;

function startServer() {
    const server = app.listen(PORT, () => {
        console.log(`📍 Server URL: ${SERVER_URL}`);
        
        // DEBUG: List all registered routes (with safety check)
        console.log('🔍 REGISTERED ROUTES:');
        let routeCount = 0;
        
        if (app._router && app._router.stack) {
            app._router.stack.forEach((middleware, index) => {
                if (middleware.route) {
                    const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
                    console.log(`   ${methods} ${middleware.route.path}`);
                    routeCount++;
                } else if (middleware.name === 'router') {
                    console.log(`   Router middleware found at index ${index}`);
                } else {
                    console.log(`   Middleware: ${middleware.name || 'anonymous'} at index ${index}`);
                }
            });
        } else {
            console.log('   No router stack available yet');
        }
        console.log(`🔍 Total routes registered: ${routeCount}`);
        
        console.log(`Sunucu http://localhost:${PORT} portunda çalışıyor`);
        
        // Setup graceful shutdown handlers
        setupGracefulShutdown();
    });
    
    serverInstance = server;
}

// Graceful shutdown function
function setupGracefulShutdown() {
    process.on('SIGTERM', gracefulShutdown('SIGTERM'));
    process.on('SIGINT', gracefulShutdown('SIGINT'));
}

function gracefulShutdown(signal) {
    return () => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
        
        if (serverInstance) {
            serverInstance.close(() => {
                console.log('✅ HTTP server closed');
                
                // Close database connections
                const databaseModule = require('./database-selector');
                if (databaseModule.db && databaseModule.db.end) {
                    databaseModule.db.end(() => {
                        console.log('✅ Database connection closed');
                        process.exit(0);
                    });
                } else {
                    console.log('✅ No database connection to close');
                    process.exit(0);
                }
            });
            
            // Force close after 10 seconds
            setTimeout(() => {
                console.error('❌ Graceful shutdown timeout, forcing exit');
                process.exit(1);
            }, 10000);
        } else {
            process.exit(0);
        }
    };
}