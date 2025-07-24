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


process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} portunda çalışıyor`);
});