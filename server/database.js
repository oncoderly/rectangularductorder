const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database dosya yolu
const DB_PATH = path.join(__dirname, 'users.db');

console.log('🗄️ Database path:', DB_PATH);

// Database bağlantısı
let db;

function initDatabase() {
    try {
        // Database'i aç (yoksa oluştur)
        db = new Database(DB_PATH);
        
        console.log('📊 Database connected successfully');
        
        // Users tablosunu oluştur
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT,
                firstName TEXT,
                lastName TEXT,
                googleId TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT
            )
        `);
        
        // Password reset tokens tablosu
        db.exec(`
            CREATE TABLE IF NOT EXISTS reset_tokens (
                token TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                email TEXT NOT NULL,
                expires INTEGER NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id)
            )
        `);
        
        console.log('✅ Database tables created/verified');
        
        // Mevcut users.json'dan migration yap
        migrateFromJSON();
        
        return db;
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

function migrateFromJSON() {
    const USERS_FILE = path.join(__dirname, 'users.json');
    
    try {
        if (fs.existsSync(USERS_FILE)) {
            const jsonUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            
            console.log(`🔄 Migrating ${jsonUsers.length} users from JSON to database...`);
            
            const insertUser = db.prepare(`
                INSERT OR IGNORE INTO users 
                (id, email, password, firstName, lastName, googleId, createdAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            let migrated = 0;
            for (const user of jsonUsers) {
                const result = insertUser.run(
                    user.id,
                    user.email,
                    user.password,
                    user.firstName,
                    user.lastName,
                    user.googleId || null,
                    user.createdAt
                );
                if (result.changes > 0) migrated++;
            }
            
            console.log(`✅ Migrated ${migrated} new users to database`);
            
            // Backup JSON file
            const backupPath = USERS_FILE + '.backup';
            fs.copyFileSync(USERS_FILE, backupPath);
            console.log(`💾 JSON backup created: ${backupPath}`);
            
        } else {
            console.log('ℹ️ No users.json file found for migration');
        }
    } catch (error) {
        console.error('⚠️ Migration error:', error);
    }
}

// User CRUD operations
const userDB = {
    // Tüm kullanıcıları getir
    getAllUsers: () => {
        try {
            const stmt = db.prepare('SELECT * FROM users ORDER BY createdAt DESC');
            return stmt.all();
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            return [];
        }
    },
    
    // Email ile kullanıcı bul
    getUserByEmail: (email) => {
        try {
            const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
            return stmt.get(email);
        } catch (error) {
            console.error('❌ Error getting user by email:', error);
            return null;
        }
    },
    
    // ID ile kullanıcı bul
    getUserById: (id) => {
        try {
            const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('❌ Error getting user by ID:', error);
            return null;
        }
    },
    
    // Yeni kullanıcı oluştur
    createUser: (userData) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO users (id, email, password, firstName, lastName, googleId, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                userData.id,
                userData.email,
                userData.password,
                userData.firstName,
                userData.lastName,
                userData.googleId || null,
                userData.createdAt
            );
            
            console.log('✅ User created:', userData.email);
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Error creating user:', error);
            return false;
        }
    },
    
    // Kullanıcı güncelle
    updateUser: (id, updates) => {
        try {
            const fields = [];
            const values = [];
            
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(updates[key]);
                }
            });
            
            if (fields.length === 0) return false;
            
            values.push(new Date().toISOString()); // updatedAt
            values.push(id);
            
            const stmt = db.prepare(`
                UPDATE users 
                SET ${fields.join(', ')}, updatedAt = ?
                WHERE id = ?
            `);
            
            const result = stmt.run(...values);
            console.log('✅ User updated:', id);
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Error updating user:', error);
            return false;
        }
    },
    
    // Kullanıcı sil
    deleteUser: (id) => {
        try {
            const stmt = db.prepare('DELETE FROM users WHERE id = ?');
            const result = stmt.run(id);
            console.log('🗑️ User deleted:', id);
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            return false;
        }
    },
    
    // Kullanıcı sayısı
    getUserCount: () => {
        try {
            const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
            return stmt.get().count;
        } catch (error) {
            console.error('❌ Error getting user count:', error);
            return 0;
        }
    }
};

// Reset token operations
const tokenDB = {
    // Token kaydet
    saveResetToken: (token, userId, email, expires) => {
        try {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO reset_tokens (token, userId, email, expires, createdAt)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(token, userId, email, expires, new Date().toISOString());
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Error saving reset token:', error);
            return false;
        }
    },
    
    // Token getir
    getResetToken: (token) => {
        try {
            const stmt = db.prepare('SELECT * FROM reset_tokens WHERE token = ?');
            return stmt.get(token);
        } catch (error) {
            console.error('❌ Error getting reset token:', error);
            return null;
        }
    },
    
    // Token sil
    deleteResetToken: (token) => {
        try {
            const stmt = db.prepare('DELETE FROM reset_tokens WHERE token = ?');
            const result = stmt.run(token);
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Error deleting reset token:', error);
            return false;
        }
    },
    
    // Eski tokenları temizle
    cleanupExpiredTokens: () => {
        try {
            const now = Date.now();
            const stmt = db.prepare('DELETE FROM reset_tokens WHERE expires < ?');
            const result = stmt.run(now);
            if (result.changes > 0) {
                console.log(`🧹 Cleaned up ${result.changes} expired tokens`);
            }
            return result.changes;
        } catch (error) {
            console.error('❌ Error cleaning up tokens:', error);
            return 0;
        }
    }
};

// Database'i başlat
initDatabase();

// Expired tokenları düzenli temizle
setInterval(() => {
    tokenDB.cleanupExpiredTokens();
}, 15 * 60 * 1000); // 15 dakikada bir

module.exports = {
    db,
    userDB,
    tokenDB,
    initDatabase
};