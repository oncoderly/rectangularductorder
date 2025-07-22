const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');
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

const USERS_FILE = path.join(__dirname, 'users.json');

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

// PDF endpoint - NO SESSION CHECK - PUPPETEER BACK
app.post('/api/generate-pdf', async (req, res) => {
    try {
        console.log('PDF endpoint called');
        const { htmlContent } = req.body;
        
        if (!htmlContent) {
            return res.status(400).json({ error: 'HTML içeriği bulunamadı' });
        }
        
        console.log('Starting Puppeteer...');
        
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        await browser.close();
        
        console.log('PDF generated successfully');
        
        const fileName = `siparis_${new Date().toISOString().split('T')[0]}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        res.status(500).json({ error: 'PDF oluşturulurken hata oluştu: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} portunda çalışıyor`);
});