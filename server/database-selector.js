// Database selector - PostgreSQL or SQLite fallback
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true' || !!DATABASE_URL;

console.log('🔍 Database selection...');
console.log('📍 DATABASE_URL:', DATABASE_URL ? 'Set' : 'Not set');
console.log('🐘 USE_POSTGRESQL:', USE_POSTGRESQL);

let db, userDB, tokenDB, analyticsDB;

if (USE_POSTGRESQL) {
    console.log('🐘 Loading PostgreSQL database...');
    try {
        const postgres = require('./database-postgres');
        db = postgres.pool;
        userDB = postgres.userDB;
        tokenDB = postgres.tokenDB;
        analyticsDB = postgres.analyticsDB;
        console.log('✅ PostgreSQL database loaded');
    } catch (error) {
        console.error('❌ PostgreSQL failed, falling back to SQLite:', error);
        const sqlite = require('./database');
        db = sqlite.db;
        userDB = sqlite.userDB;  
        tokenDB = sqlite.tokenDB;
        analyticsDB = null; // SQLite doesn't have analytics DB
    }
} else {
    console.log('📝 Loading SQLite database...');
    const sqlite = require('./database');
    db = sqlite.db;
    userDB = sqlite.userDB;
    tokenDB = sqlite.tokenDB;
    analyticsDB = null; // SQLite doesn't have analytics DB
}

// Wrapper to make SQLite functions async-compatible
const makeAsync = (syncFn) => {
    return async (...args) => {
        return syncFn(...args);
    };
};

// Ensure all functions are async
if (!USE_POSTGRESQL) {
    // Convert SQLite sync functions to async
    const originalUserDB = { ...userDB };
    userDB.getAllUsers = makeAsync(originalUserDB.getAllUsers);
    userDB.getUserByEmail = makeAsync(originalUserDB.getUserByEmail);
    userDB.getUserById = makeAsync(originalUserDB.getUserById);
    userDB.createUser = makeAsync(originalUserDB.createUser);
    userDB.updateUser = makeAsync(originalUserDB.updateUser);
    userDB.deleteUser = makeAsync(originalUserDB.deleteUser);
    userDB.getUserCount = makeAsync(originalUserDB.getUserCount);

    const originalTokenDB = { ...tokenDB };
    tokenDB.saveResetToken = makeAsync(originalTokenDB.saveResetToken);
    tokenDB.getResetToken = makeAsync(originalTokenDB.getResetToken);
    tokenDB.deleteResetToken = makeAsync(originalTokenDB.deleteResetToken);
    tokenDB.cleanupExpiredTokens = makeAsync(originalTokenDB.cleanupExpiredTokens);

    // Add basic analytics for SQLite
    analyticsDB = {
        saveAnalytics: async () => true, // No-op for SQLite
        getAnalyticsSummary: async () => ({
            total_users: await userDB.getUserCount(),
            total_sessions: 0,
            total_pdf_downloads: 0,
            total_button_clicks: 0
        }),
        getRecentActivities: async () => []
    };
}

console.log('✅ Database selector initialized');

module.exports = {
    db,
    userDB,
    tokenDB,
    analyticsDB,
    isPostgreSQL: USE_POSTGRESQL
};