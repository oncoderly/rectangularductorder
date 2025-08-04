// Database manager - PostgreSQL only
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ CRITICAL: DATABASE_URL environment variable is required');
    console.error('❌ This application requires PostgreSQL database');
    console.error('❌ Please set DATABASE_URL in environment variables');
    
    // Don't crash immediately, let the error be handled gracefully
    setTimeout(() => {
        console.error('❌ FATAL: Cannot continue without DATABASE_URL');
        process.exit(1);
    }, 5000);
}

let isInitialized = false; // Will be set to true only after complete PostgreSQL initialization

console.log('🔧 DATABASE-SELECTOR: Module loading, isInitialized =', isInitialized);

console.log('🔍 Initializing PostgreSQL database...');
console.log('📍 DATABASE_URL length:', DATABASE_URL.length);
console.log('🏁 Starting PostgreSQL initialization...');

let db, userDB, tokenDB, analyticsDB;

// Initialize variables to prevent undefined errors
db = null;
userDB = null; 
tokenDB = null;
analyticsDB = null;

// Initialize PostgreSQL connection
async function initializePostgreSQL() {
    try {
        console.log('🐘 Initializing PostgreSQL connection...');
        const postgres = require('./database-postgres');
        
        // Wait for PostgreSQL to initialize
        if (!postgres.pool) {
            console.log('⏳ Waiting for PostgreSQL pool to initialize...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!postgres.pool) {
            throw new Error('PostgreSQL pool not initialized - check DATABASE_URL');
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
        
        console.log('✅ PostgreSQL connection and data integrity verified');
        
        // Set database references
        db = postgres.pool;
        userDB = postgres.userDB;
        tokenDB = postgres.tokenDB;
        analyticsDB = postgres.analyticsDB;
        
        console.log('✅ PostgreSQL database initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL initialization failed:', error.message);
        console.error('❌ Application cannot continue without PostgreSQL');
        process.exit(1);
    }
}

// Start PostgreSQL initialization
console.log('🔧 Starting PostgreSQL initialization...');
(async () => {
    try {
        await initializePostgreSQL();
        console.log('✅ Database initialization completed successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    }
    
    // Mark as initialized
    isInitialized = true;
    console.log('🎯 Database ready - isInitialized set to true');
})();

console.log('🔄 Database manager loading...');

// Wait for initialization wrapper
function waitForInit() {
    return new Promise((resolve, reject) => {
        console.log('🔍 WAITFORINIT: Called, current isInitialized =', isInitialized);
        
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds timeout
        
        const checkInit = () => {
            console.log('🔍 WAITFORINIT: Checking isInitialized =', isInitialized, `(attempt ${attempts + 1}/${maxAttempts})`);
            
            if (isInitialized) {
                console.log('✅ WAITFORINIT: Resolved! Database is ready');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('❌ WAITFORINIT: Timeout! Database initialization took too long');
                reject(new Error('Database initialization timeout'));
            } else {
                attempts++;
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
        // Always return true since we only use PostgreSQL now
        return true;
    },
    waitForInit
};