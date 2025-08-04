// Database selector - PostgreSQL or SQLite fallback
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true' || !!DATABASE_URL;

// Test PostgreSQL connection before using it
let postgresAvailable = false;
let isInitialized = false; // Will be set to true only after complete PostgreSQL initialization

// Track all assignments to postgresAvailable
const originalPostgresAvailable = postgresAvailable;
function setPostgresAvailable(value, reason = 'unknown') {
    console.log(`🚨 TRACE: postgresAvailable changing from ${postgresAvailable} to ${value} (reason: ${reason})`);
    postgresAvailable = value;
}

console.log('🔧 DATABASE-SELECTOR: Module loading, isInitialized =', isInitialized);

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
        
        // Wait for PostgreSQL to initialize
        if (!postgres.pool) {
            console.log('⏳ Waiting for PostgreSQL pool to initialize...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!postgres.pool) {
            throw new Error('PostgreSQL pool not initialized');
        }
        
        // Test query with timeout
        const testPromise = postgres.pool.query('SELECT 1 as test');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PostgreSQL connection timeout')), 10000)
        );
        
        await Promise.race([testPromise, timeoutPromise]);
        
        // CRITICAL: Test user operations to ensure data persistence
        console.log('🧪 Testing PostgreSQL user operations...');
        const userCount = await postgres.userDB.getUserCount();
        console.log('🧪 PostgreSQL user count test:', userCount);
        
        // Test getting users to ensure no data loss
        const users = await postgres.userDB.getAllUsers();
        console.log('🧪 PostgreSQL users test:', users.length, 'users found');
        
        // Log sample users to verify data integrity
        if (users.length > 0) {
            const sampleUsers = users.slice(0, 3).map(u => ({
                id: u.id,
                email: u.email,
                hasPassword: !!u.password,
                createdAt: u.createdAt
            }));
            console.log('🧪 Sample PostgreSQL users:', sampleUsers);
        }
        
        setPostgresAvailable(true, 'testPostgreSQL success');
        console.log('✅ PostgreSQL connection and data integrity verified');
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        setPostgresAvailable(false, 'testPostgreSQL failed');
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
            
            // Verify we can perform basic operations
            const userCount = await postgres.userDB.getUserCount();
            console.log('🧪 PostgreSQL user count:', userCount);
            
            db = postgres.pool;
            userDB = postgres.userDB;
            tokenDB = postgres.tokenDB;
            analyticsDB = postgres.analyticsDB;
            setPostgresAvailable(true, 'PostgreSQL upgrade success');
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
            console.log('📝 PostgreSQL not available, using SQLite fallback');
            setPostgresAvailable(false, 'SQLite fallback (PostgreSQL not available)');
            
            // Initialize SQLite fallback ONLY when PostgreSQL is not available
            console.log('🔄 PostgreSQL not available, initializing SQLite fallback...');
            initializeFallback();
        }
    } catch (error) {
        console.error('❌ PostgreSQL upgrade failed:', error.message);
        console.log('📝 Fallback to SQLite');
        setPostgresAvailable(false, 'PostgreSQL upgrade failed');
        
        // Initialize SQLite fallback ONLY when PostgreSQL fails
        console.log('🔄 PostgreSQL failed, initializing SQLite fallback...');
        initializeFallback();
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
console.log('🔧 STARTING: Async wrapper for PostgreSQL initialization...');
(async () => {
    try {
        console.log('🔧 CALLING: await initializeDatabase()...');
        await initializeDatabase();
        console.log('🎯 ASYNC: Database initialization completed successfully');
    } catch (error) {
        console.error('❌ ASYNC WRAPPER: Database initialization failed:', error.message);
        console.error('❌ ASYNC WRAPPER: Error stack:', error.stack);
        
        // Ensure fallback exists if upgrade fails
        if (!userDB) initializeFallback();
    }
    
    // CRITICAL: Only mark as initialized AFTER everything is done
    isInitialized = true;
    console.log('🎯 ASYNC: isInitialized set to true - waitForInit() will now resolve');
})().catch(error => {
    console.error('❌ FATAL: Async wrapper crashed:', error.message);
    console.error('❌ FATAL: Async wrapper stack:', error.stack);
    // Emergency fallback
    isInitialized = true;
});

console.log('🔄 Database selector loading...');

// Wait for initialization wrapper
function waitForInit() {
    return new Promise((resolve) => {
        console.log('🔍 WAITFORINIT: Called, current isInitialized =', isInitialized);
        const checkInit = () => {
            console.log('🔍 WAITFORINIT: Checking isInitialized =', isInitialized);
            if (isInitialized) {
                console.log('✅ WAITFORINIT: Resolved! Database is ready');
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