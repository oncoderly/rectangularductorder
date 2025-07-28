// Database selector - PostgreSQL or SQLite fallback
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true' || !!DATABASE_URL;

// Test PostgreSQL connection before using it
let postgresAvailable = false;

console.log('🔍 Database selection...');
console.log('📍 DATABASE_URL:', DATABASE_URL ? 'Set' : 'Not set');
console.log('🐘 USE_POSTGRESQL:', USE_POSTGRESQL);

let db, userDB, tokenDB, analyticsDB;

// Test PostgreSQL connection first
async function testPostgreSQL() {
    if (!USE_POSTGRESQL) return false;
    
    try {
        console.log('🐘 Testing PostgreSQL connection...');
        const postgres = require('./database-postgres');
        
        // Test query
        const result = await postgres.pool.query('SELECT 1');
        postgresAvailable = true;
        console.log('✅ PostgreSQL connection successful');
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        postgresAvailable = false;
        return false;
    }
}

// Initialize database
async function initializeDatabase() {
    const canUsePostgreSQL = await testPostgreSQL();
    
    if (canUsePostgreSQL) {
        console.log('🐘 Loading PostgreSQL database...');
        const postgres = require('./database-postgres');
        db = postgres.pool;
        userDB = postgres.userDB;
        tokenDB = postgres.tokenDB;
        analyticsDB = postgres.analyticsDB;
        console.log('✅ PostgreSQL database loaded');
    } else {
        console.log('📝 Falling back to SQLite database...');
        const sqlite = require('./database');
        db = sqlite.db;
        userDB = sqlite.userDB;
        tokenDB = sqlite.tokenDB;
        analyticsDB = null; // SQLite doesn't have analytics DB
        
        // Convert SQLite sync functions to async
        const originalUserDB = { ...userDB };
        userDB.getAllUsers = async (...args) => originalUserDB.getAllUsers(...args);
        userDB.getUserByEmail = async (...args) => originalUserDB.getUserByEmail(...args);
        userDB.getUserById = async (...args) => originalUserDB.getUserById(...args);
        userDB.createUser = async (...args) => originalUserDB.createUser(...args);
        userDB.updateUser = async (...args) => originalUserDB.updateUser(...args);
        userDB.deleteUser = async (...args) => originalUserDB.deleteUser(...args);
        userDB.getUserCount = async (...args) => originalUserDB.getUserCount(...args);

        const originalTokenDB = { ...tokenDB };
        tokenDB.saveResetToken = async (...args) => originalTokenDB.saveResetToken(...args);
        tokenDB.getResetToken = async (...args) => originalTokenDB.getResetToken(...args);
        tokenDB.deleteResetToken = async (...args) => originalTokenDB.deleteResetToken(...args);
        tokenDB.cleanupExpiredTokens = async (...args) => originalTokenDB.cleanupExpiredTokens(...args);

        // Add basic analytics for SQLite
        analyticsDB = {
            saveAnalytics: async () => true,
            getAnalyticsSummary: async () => ({
                total_users: await userDB.getUserCount(),
                total_sessions: 0,
                total_pdf_downloads: 0,
                total_button_clicks: 0
            }),
            getRecentActivities: async () => []
        };
    }
}

// Initialize immediately
initializeDatabase().catch(console.error);

console.log('✅ Database selector initialized');

module.exports = {
    get db() { return db; },
    get userDB() { return userDB; },
    get tokenDB() { return tokenDB; },
    get analyticsDB() { return analyticsDB; },
    get isPostgreSQL() { return postgresAvailable; }
};