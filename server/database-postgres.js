const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🐘 PostgreSQL Database initializing...');
console.log('📍 Environment:', NODE_ENV);
console.log('🔗 Database URL:', DATABASE_URL ? 'Set' : 'Not set');

// PostgreSQL connection pool
let pool;

function initPostgreSQL() {
    try {
        // Connection configuration
        const config = DATABASE_URL ? {
            connectionString: DATABASE_URL,
            ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        } : {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'rectangularduct',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: false
        };

        pool = new Pool(config);

        // Test connection
        pool.connect((err, client, release) => {
            if (err) {
                console.error('❌ PostgreSQL connection failed:', err);
                throw err;
            } else {
                console.log('✅ PostgreSQL connected successfully');
                release();
            }
        });

        // Create tables
        createTables();
        
        return pool;
        
    } catch (error) {
        console.error('❌ PostgreSQL initialization failed:', error);
        throw error;
    }
}

async function createTables() {
    try {
        console.log('🏗️ Creating PostgreSQL tables...');
        
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                firstname VARCHAR(255),
                lastname VARCHAR(255),
                googleid VARCHAR(255),
                createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create reset_tokens table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reset_tokens (
                token VARCHAR(255) PRIMARY KEY,
                userid VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                expires BIGINT NOT NULL,
                createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userid) REFERENCES users (id) ON DELETE CASCADE
            )
        `);

        // Create analytics table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS analytics (
                id SERIAL PRIMARY KEY,
                userid VARCHAR(255),
                action VARCHAR(255) NOT NULL,
                data JSONB,
                timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ip VARCHAR(45),
                useragent TEXT
            )
        `);

        // Create indexes for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_googleid ON users(googleid);
            CREATE INDEX IF NOT EXISTS idx_users_createdat ON users(createdat);
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_userid ON reset_tokens(userid);
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON reset_tokens(expires);
            CREATE INDEX IF NOT EXISTS idx_analytics_userid ON analytics(userid);
            CREATE INDEX IF NOT EXISTS idx_analytics_action ON analytics(action);
            CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
        `);

        console.log('✅ PostgreSQL tables created successfully');

        // Migrate from SQLite if needed
        await migrateFromSQLite();
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
}

async function migrateFromSQLite() {
    try {
        const sqliteDbPath = path.join(__dirname, 'users.db');
        
        if (fs.existsSync(sqliteDbPath)) {
            console.log('🔄 Migrating data from SQLite to PostgreSQL...');
            
            // Import SQLite database
            const Database = require('better-sqlite3');
            const sqliteDb = new Database(sqliteDbPath, { readonly: true });
            
            // Get all users from SQLite
            const sqliteUsers = sqliteDb.prepare('SELECT * FROM users').all();
            
            console.log(`📊 Found ${sqliteUsers.length} users in SQLite`);
            
            let migrated = 0;
            for (const user of sqliteUsers) {
                try {
                    await pool.query(`
                        INSERT INTO users (id, email, password, firstname, lastname, googleid, createdat)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (email) DO NOTHING
                    `, [
                        user.id,
                        user.email,
                        user.password,
                        user.firstName,
                        user.lastName,
                        user.googleId,
                        user.createdAt
                    ]);
                    migrated++;
                } catch (err) {
                    console.log(`⚠️ Skipping duplicate user: ${user.email}`);
                }
            }
            
            sqliteDb.close();
            console.log(`✅ Migrated ${migrated} users to PostgreSQL`);
            
        } else {
            console.log('ℹ️ No SQLite database found for migration');
        }
        
    } catch (error) {
        console.error('⚠️ Migration error:', error);
    }
}

// User operations for PostgreSQL
const userDB = {
    // Get all users
    getAllUsers: async () => {
        try {
            const result = await pool.query('SELECT * FROM users ORDER BY createdat DESC');
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            return [];
        }
    },

    // Get user by email
    getUserByEmail: async (email) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting user by email:', error);
            return null;
        }
    },

    // Get user by ID
    getUserById: async (id) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting user by ID:', error);
            return null;
        }
    },

    // Create user
    createUser: async (userData) => {
        try {
            const result = await pool.query(`
                INSERT INTO users (id, email, password, firstname, lastname, googleid, createdat)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                userData.id,
                userData.email,
                userData.password,
                userData.firstName,
                userData.lastName,
                userData.googleId || null,
                userData.createdAt
            ]);
            
            console.log('✅ User created in PostgreSQL:', userData.email);
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Error creating user:', error);
            return false;
        }
    },

    // Update user
    updateUser: async (id, updates) => {
        try {
            const fields = [];
            const values = [];
            let paramIndex = 1;

            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    fields.push(`${key.toLowerCase()} = $${paramIndex}`);
                    values.push(updates[key]);
                    paramIndex++;
                }
            });

            if (fields.length === 0) return false;

            fields.push(`updatedat = $${paramIndex}`);
            values.push(new Date().toISOString());
            values.push(id);

            const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex + 1}`;
            const result = await pool.query(query, values);
            
            console.log('✅ User updated in PostgreSQL:', id);
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Error updating user:', error);
            return false;
        }
    },

    // Delete user
    deleteUser: async (id) => {
        try {
            const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
            console.log('🗑️ User deleted from PostgreSQL:', id);
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            return false;
        }
    },

    // Get user count
    getUserCount: async () => {
        try {
            const result = await pool.query('SELECT COUNT(*) as count FROM users');
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('❌ Error getting user count:', error);
            return 0;
        }
    }
};

// Token operations for PostgreSQL
const tokenDB = {
    // Save reset token
    saveResetToken: async (token, userId, email, expires) => {
        try {
            const result = await pool.query(`
                INSERT INTO reset_tokens (token, userid, email, expires, createdat)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (token) DO UPDATE SET
                    userid = $2, email = $3, expires = $4, createdat = $5
            `, [token, userId, email, expires, new Date().toISOString()]);
            
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Error saving reset token:', error);
            return false;
        }
    },

    // Get reset token
    getResetToken: async (token) => {
        try {
            const result = await pool.query('SELECT * FROM reset_tokens WHERE token = $1', [token]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting reset token:', error);
            return null;
        }
    },

    // Delete reset token
    deleteResetToken: async (token) => {
        try {
            const result = await pool.query('DELETE FROM reset_tokens WHERE token = $1', [token]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Error deleting reset token:', error);
            return false;
        }
    },

    // Cleanup expired tokens
    cleanupExpiredTokens: async () => {
        try {
            const now = Date.now();
            const result = await pool.query('DELETE FROM reset_tokens WHERE expires < $1', [now]);
            if (result.rowCount > 0) {
                console.log(`🧹 Cleaned up ${result.rowCount} expired tokens`);
            }
            return result.rowCount;
        } catch (error) {
            console.error('❌ Error cleaning up tokens:', error);
            return 0;
        }
    }
};

// Analytics operations for PostgreSQL
const analyticsDB = {
    // Save analytics data
    saveAnalytics: async (userId, action, data, ip, userAgent) => {
        try {
            await pool.query(`
                INSERT INTO analytics (userid, action, data, ip, useragent)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, action, JSON.stringify(data), ip, userAgent]);
            return true;
        } catch (error) {
            console.error('❌ Error saving analytics:', error);
            return false;
        }
    },

    // Get analytics summary
    getAnalyticsSummary: async () => {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(DISTINCT userid) as total_users,
                    COUNT(*) FILTER (WHERE action = 'session_start') as total_sessions,
                    COUNT(*) FILTER (WHERE action = 'pdf_download') as total_pdf_downloads,
                    COUNT(*) FILTER (WHERE action = 'button_click') as total_button_clicks
                FROM analytics
            `);
            
            return result.rows[0] || {
                total_users: 0,
                total_sessions: 0,
                total_pdf_downloads: 0,
                total_button_clicks: 0
            };
        } catch (error) {
            console.error('❌ Error getting analytics summary:', error);
            return null;
        }
    },

    // Get recent activities
    getRecentActivities: async (limit = 50) => {
        try {
            const result = await pool.query(`
                SELECT * FROM analytics 
                ORDER BY timestamp DESC 
                LIMIT $1
            `, [limit]);
            
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting recent activities:', error);
            return [];
        }
    }
};

// Initialize PostgreSQL
if (DATABASE_URL || process.env.USE_POSTGRESQL === 'true') {
    initPostgreSQL();
    console.log('🐘 Using PostgreSQL database');
} else {
    console.log('📝 PostgreSQL not configured, using SQLite fallback');
}

module.exports = {
    pool,
    userDB,
    tokenDB,
    analyticsDB,
    initPostgreSQL
};