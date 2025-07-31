// Database selector - PostgreSQL or SQLite fallback
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true' || !!DATABASE_URL;

// Test PostgreSQL connection before using it
let postgresAvailable = false;
let isInitialized = false;

console.log('🔍 Database selection...');
console.log('📍 DATABASE_URL:', DATABASE_URL ? 'Set' : 'Not set');
console.log('📍 DATABASE_URL length:', DATABASE_URL ? DATABASE_URL.length : 0);
console.log('🐘 USE_POSTGRESQL:', USE_POSTGRESQL);
console.log('🏁 Starting database initialization...');

let db, userDB, tokenDB, analyticsDB;

// Test PostgreSQL connection first
async function testPostgreSQL() {
    console.log('🧪 testPostgreSQL: postgresAvailable =', postgresAvailable);
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

// Initialize database - try PostgreSQL upgrade
async function initializeDatabase() {
    try {
        const canUsePostgreSQL = await testPostgreSQL();
        console.log('🧪 testPostgreSQL result:', canUsePostgreSQL);

        if (canUsePostgreSQL) {
            console.log('🐘 Upgrading to PostgreSQL database...');
            const postgres = require('./database-postgres');
            
            // Test that postgres module loaded correctly
            if (!postgres.userDB || !postgres.userDB.getAllUsers) {
                throw new Error('PostgreSQL userDB not properly initialized');
            }
            
            // Test PostgreSQL connection with a real query
            const testUsers = await postgres.userDB.getAllUsers();
            console.log('🧪 PostgreSQL test query successful, users:', testUsers.length);
            
            db = postgres.pool;
            userDB = postgres.userDB;
            tokenDB = postgres.tokenDB;
            analyticsDB = postgres.analyticsDB;
            postgresAvailable = true;
            console.log('✅ PostgreSQL database upgraded successfully');
            console.log('🔒 FORCING PostgreSQL usage - SQLite disabled');
            
            // DEBUG: Verify variables are set correctly
            console.log('🧪 DEBUG: Variables after PostgreSQL upgrade:');
            console.log('🧪 DEBUG: db set:', !!db);
            console.log('🧪 DEBUG: userDB set:', !!userDB);
            console.log('🧪 DEBUG: tokenDB set:', !!tokenDB);
            console.log('🧪 DEBUG: analyticsDB set:', !!analyticsDB);
            console.log('🧪 DEBUG: postgresAvailable:', postgresAvailable);
        } else {
            console.log('📝 Staying with SQLite fallback (already initialized)');
            // DON'T override postgresAvailable if it was set to true by upgrade
            if (!postgresAvailable) {
                postgresAvailable = false;
                console.log('🔧 Setting postgresAvailable to false (not upgraded)');
            } else {
                console.log('🔒 Keeping postgresAvailable true (already upgraded)');
            }
        }
    } catch (error) {
        console.error('❌ PostgreSQL upgrade failed:', error.message);
        console.log('📝 Continuing with SQLite fallback');
        postgresAvailable = false;
        
        // Ensure SQLite fallback is working ONLY in development
        if (process.env.NODE_ENV !== 'production' && (!userDB || !userDB.getAllUsers)) {
            console.error('❌ Critical: Both PostgreSQL and SQLite failed!');
            initializeFallback(); // Re-initialize SQLite
        }
    }
    
    // NOTE: isInitialized is set outside after await
    console.log('✅ Database initialization completed');
    console.log('🗄️ Final database type:', postgresAvailable ? 'PostgreSQL' : 'SQLite');
}

// Initialize fallback first - CRITICAL for production
function initializeFallback() {
    console.log('🔄 Initializing SQLite fallback...');
    const sqlite = require('./database');
    db = sqlite.db;
    
    // Convert SQLite sync functions to async
    const originalUserDB = { ...sqlite.userDB };
    userDB = {
        getAllUsers: async (...args) => originalUserDB.getAllUsers(...args),
        getUserByEmail: async (...args) => originalUserDB.getUserByEmail(...args),
        getUserById: async (...args) => originalUserDB.getUserById(...args),
        createUser: async (...args) => originalUserDB.createUser(...args),
        updateUser: async (...args) => originalUserDB.updateUser(...args),
        deleteUser: async (...args) => originalUserDB.deleteUser(...args),
        getUserCount: async (...args) => originalUserDB.getUserCount(...args)
    };

    const originalTokenDB = { ...sqlite.tokenDB };
    tokenDB = {
        saveResetToken: async (...args) => originalTokenDB.saveResetToken(...args),
        getResetToken: async (...args) => originalTokenDB.getResetToken(...args),
        deleteResetToken: async (...args) => originalTokenDB.deleteResetToken(...args),
        cleanupExpiredTokens: async (...args) => originalTokenDB.cleanupExpiredTokens(...args)
    };

    // Use file-based analytics for SQLite fallback
    const { trackSession, getAnalyticsSummary } = require('./analytics');
    analyticsDB = {
        saveAnalytics: async (userId, action, data) => trackSession(userId, action, data),
        getAnalyticsSummary: async () => getAnalyticsSummary(),
        getRecentActivities: async () => {
            const analytics = require('./analytics');
            return await analytics.getRecentActivities();
        }
    };
    
    console.log('✅ SQLite fallback initialized');
}

// Initialize fallback FIRST to ensure userDB is never undefined
initializeFallback();

// Then try to upgrade to PostgreSQL (async but properly awaited)
(async () => {
    try {
        await initializeDatabase();
        console.log('🎯 ASYNC: Database initialization completed successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        
        // Ensure fallback exists if upgrade fails
        if (!userDB) initializeFallback();
    }
    
    // CRITICAL: Only mark as initialized AFTER everything is done
    isInitialized = true;
    console.log('🎯 ASYNC: isInitialized set to true');
})();

console.log('🔄 Database selector loading...');

// Wait for initialization wrapper
function waitForInit() {
    return new Promise((resolve) => {
        const checkInit = () => {
            if (isInitialized) {
                resolve();
            } else {
                setTimeout(checkInit, 100);
            }
        };
        checkInit();
    });
}

module.exports = {
    get db() { return db; },
    get userDB() { return userDB; },
    get tokenDB() { return tokenDB; },
    get analyticsDB() { return analyticsDB; },
    get isPostgreSQL() {
        console.log('🧪 isPostgreSQL getter called:', postgresAvailable);
        console.log('🧪 isPostgreSQL getter - userDB type:', userDB ? (userDB.constructor.name || 'Unknown') : 'null');
        console.log('🧪 isPostgreSQL getter - db type:', db ? (db.constructor.name || 'Unknown') : 'null');
        return postgresAvailable; },
    waitForInit
};