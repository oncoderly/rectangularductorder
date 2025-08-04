const { Pool } = require('pg');
const fs = require('fs-extra');
const path = require('path');
const { deploymentMonitor } = require('./deployment-monitor');

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RENDER_SERVICE_NAME = process.env.RENDER_SERVICE_NAME;
const isProduction = NODE_ENV === 'production' || !!RENDER_SERVICE_NAME;

console.log('🐘 PostgreSQL Database initializing...');
console.log('📍 Environment:', NODE_ENV);
console.log('🏭 Is Production:', isProduction);
console.log('🚀 Render Service:', RENDER_SERVICE_NAME || 'Not set');
console.log('🔗 Database URL:', DATABASE_URL ? 'Set' : 'Not set');
console.log('🔍 First 50 chars of URL:', DATABASE_URL ? DATABASE_URL.substring(0, 50) + '...' : 'Not available');

// CRITICAL: Warn about data persistence
if (isProduction && DATABASE_URL) {
    console.log('🛡️ PRODUCTION MODE: PostgreSQL data will be persistent');
} else if (isProduction && !DATABASE_URL) {
    console.log('⚠️ WARNING: Production mode but no DATABASE_URL - data may be lost!');
}

// PostgreSQL connection pool
let pool;

function initPostgreSQL() {
    try {
        // Connection configuration
        if (!DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        
        // Optimized connection pool configuration
        const config = {
            connectionString: DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            // Connection timeouts - optimized for production
            connectionTimeoutMillis: 15000, // Increased for slower connections
            idleTimeoutMillis: 60000, // Keep connections alive longer
            query_timeout: 30000, // Query timeout
            
            // Pool size optimization
            max: isProduction ? 15 : 5, // More connections in production
            min: isProduction ? 2 : 1,  // Minimum idle connections
            
            // Advanced settings for reliability
            application_name: 'rectangular_duct_order',
            statement_timeout: 30000,
            idle_in_transaction_session_timeout: 60000,
            
            // Connection validation
            allowExitOnIdle: true,
            
            // Error handling
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        };

        pool = new Pool(config);

        // Test connection with timeout
        const testConnection = async () => {
            try {
                const client = await pool.connect();
                await client.query('SELECT NOW()');
                client.release();
                console.log('✅ PostgreSQL connected successfully');
                return true;
            } catch (error) {
                console.error('❌ PostgreSQL connection test failed:', error.message);
                throw error;
            }
        };
        
        // Run connection test and create tables
        return testConnection().then(async () => {
            await createTables(); // CRITICAL: Added await!
            return pool;
        });
        
    } catch (error) {
        console.error('❌ PostgreSQL initialization failed:', error);
        throw error;
    }
}

async function createTables() {
    try {
        console.log('🏗️ [DEPLOY-SAFE] Creating PostgreSQL tables SAFELY...');
        console.log('🏗️ [DEPLOY-SAFE] Timestamp:', new Date().toISOString());
        console.log('🏗️ [DEPLOY-SAFE] NODE_ENV:', process.env.NODE_ENV);
        console.log('🏗️ [DEPLOY-SAFE] Database URL exists:', !!DATABASE_URL);
        
        // CRITICAL: First create a persistent file-based backup
        console.log('🏗️ [DEPLOY-SAFE] Creating persistent backup...');
        await createPersistentBackup();
        
        // Check if users table exists and has data
        let existingUserCount = 0;
        let tableExists = false;
        let existingUsers = [];
        
        try {
            // Check if table exists
            console.log('🏗️ [DEPLOY-SAFE] Checking if users table exists...');
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                );
            `);
            tableExists = tableCheck.rows[0].exists;
            console.log('🏗️ [DEPLOY-SAFE] Users table exists:', tableExists);
            
            if (tableExists) {
                console.log('🏗️ [DEPLOY-SAFE] Getting user count...');
                const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
                existingUserCount = parseInt(countResult.rows[0].count);
                console.log(`🏗️ [DEPLOY-SAFE] Found ${existingUserCount} existing users in PostgreSQL`);
                
                // Track user count for monitoring
                await deploymentMonitor.trackUserCount(existingUserCount, 'before_table_operations');
                
                // If users exist, DO NOT recreate tables!
                if (existingUserCount > 0) {
                    console.log('🏗️ [DEPLOY-SAFE] ✅ USERS EXIST - SKIPPING TABLE RECREATION');
                    console.log('🏗️ [DEPLOY-SAFE] ✅ DATA SAFETY: Preserving existing user data');
                    
                    // Only create missing tables, not existing ones
                    await createMissingTablesOnly();
                    console.log('🏗️ [DEPLOY-SAFE] ✅ Only missing tables created, user data preserved');
                    
                    // Final verification
                    const verifyCount = await pool.query('SELECT COUNT(*) as count FROM users');
                    const finalVerifyCount = parseInt(verifyCount.rows[0].count);
                    await deploymentMonitor.trackUserCount(finalVerifyCount, 'after_missing_tables_only');
                    
                    return;
                }
                
                // Get all existing users for backup
                console.log('🏗️ [DEPLOY-SAFE] Getting all existing users for backup...');
                const existingUsersResult = await pool.query('SELECT * FROM users ORDER BY "createdAt" DESC');
                existingUsers = existingUsersResult.rows;
                console.log('🏗️ [DEPLOY-SAFE] Backed up existing users:', existingUsers.length);
                
                // Store user data in memory as backup
                global.userBackup = existingUsers;
            } else {
                console.log('🏗️ [DEPLOY-SAFE] Users table does not exist yet, safe to create');
            }
        } catch (err) {
            console.error('🏗️ [DEPLOY-SAFE] Users table check failed:', err.message);
            // Try to restore from persistent backup if possible
            await restoreFromPersistentBackup();
        }
        
        // Only create tables if no users exist
        if (existingUserCount === 0) {
            console.log('🏗️ [DEPLOY-SAFE] Safe to create tables - no existing users');
            await createAllTablesFromScratch();
        }
        
        // Always ensure all required tables exist
        await ensureAllRequiredTablesExist();
        
        console.log('🏗️ [DEPLOY-SAFE] ✅ Tables created/verified safely');
        
        // CRITICAL: Final verification - Check if users are still there
        const finalUserCount = await pool.query('SELECT COUNT(*) as count FROM users');
        const finalCount = parseInt(finalUserCount.rows[0].count);
        console.log('🏗️ [DEPLOY-SAFE] POST-DEPLOY VERIFICATION: Final user count:', finalCount);
        
        // Track final user count
        await deploymentMonitor.trackUserCount(finalCount, 'post_deploy_verification');
        
        // Verify data integrity
        if (existingUserCount > 0) {
            if (finalCount < existingUserCount) {
                console.error(`🏗️ [DEPLOY-SAFE] ❌ CRITICAL: User count dropped from ${existingUserCount} to ${finalCount}!`);
                
                // Create deployment alert
                await deploymentMonitor.createAlert('CRITICAL_USER_DATA_LOSS', {
                    previous: existingUserCount,
                    current: finalCount,
                    lost: existingUserCount - finalCount,
                    context: 'post_deploy_verification'
                });
                
                // Try to restore from persistent backup
                const restored = await restoreFromPersistentBackup();
                if (restored) {
                    console.log('🏗️ [DEPLOY-SAFE] ✅ Users restored from persistent backup');
                    
                    // Verify restore
                    const afterRestoreCount = await pool.query('SELECT COUNT(*) as count FROM users');
                    const restoredCount = parseInt(afterRestoreCount.rows[0].count);
                    await deploymentMonitor.trackUserCount(restoredCount, 'after_backup_restore');
                } else {
                    console.error('🏗️ [DEPLOY-SAFE] ❌ Failed to restore from persistent backup');
                }
            } else {
                console.log(`🏗️ [DEPLOY-SAFE] ✅ User data integrity verified: ${finalCount} users preserved`);
            }
        }
        
        // CRITICAL: Always check for SQLite users that need migration (only new ones)
        console.log('🏗️ [DEPLOY-SAFE] Checking for new SQLite users to migrate...');
        await migrateFromSQLiteNewUsersOnly();
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
}

// Create persistent file-based backup
async function createPersistentBackup() {
    try {
        console.log('💾 [BACKUP] Creating persistent backup...');
        
        // Check if users table exists first
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('💾 [BACKUP] No users table exists yet, skipping backup');
            return;
        }
        
        // Get all users
        const result = await pool.query('SELECT * FROM users ORDER BY "createdAt" DESC');
        const users = result.rows;
        
        if (users.length === 0) {
            console.log('💾 [BACKUP] No users to backup');
            return;
        }
        
        // Save to file with timestamp
        const backupFile = path.join(__dirname, `user_backup_${Date.now()}.json`);
        await fs.writeFile(backupFile, JSON.stringify(users, null, 2));
        
        // Also save to a standard backup file (overwrite previous)
        const standardBackupFile = path.join(__dirname, 'users_backup.json');
        await fs.writeFile(standardBackupFile, JSON.stringify(users, null, 2));
        
        console.log(`💾 [BACKUP] ✅ Backup created: ${users.length} users saved to ${backupFile}`);
        console.log(`💾 [BACKUP] ✅ Standard backup updated: ${standardBackupFile}`);
        
        // Keep only last 5 backup files
        await cleanupOldBackups();
        
    } catch (error) {
        console.error('💾 [BACKUP] ❌ Failed to create persistent backup:', error);
    }
}

// Restore from persistent backup if available
async function restoreFromPersistentBackup() {
    try {
        console.log('🔄 [RESTORE] Attempting to restore from persistent backup...');
        
        const standardBackupFile = path.join(__dirname, 'users_backup.json');
        
        if (!fs.existsSync(standardBackupFile)) {
            console.log('🔄 [RESTORE] No persistent backup file found');
            return false;
        }
        
        const backupData = await fs.readFile(standardBackupFile, 'utf8');
        const backupUsers = JSON.parse(backupData);
        
        if (!Array.isArray(backupUsers) || backupUsers.length === 0) {
            console.log('🔄 [RESTORE] Backup file is empty or invalid');
            return false;
        }
        
        console.log(`🔄 [RESTORE] Found backup with ${backupUsers.length} users`);
        
        // Restore users
        let restored = 0;
        for (const user of backupUsers) {
            try {
                const result = await pool.query(`
                    INSERT INTO users (id, email, password, "firstName", "lastName", "googleId", role, "createdAt", "updatedAt")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (email) DO UPDATE SET
                        password = EXCLUDED.password,
                        "firstName" = EXCLUDED."firstName",
                        "lastName" = EXCLUDED."lastName",
                        "googleId" = EXCLUDED."googleId",
                        role = EXCLUDED.role,
                        "updatedAt" = EXCLUDED."updatedAt"
                    RETURNING id
                `, [
                    user.id,
                    user.email,
                    user.password,
                    user.firstName,
                    user.lastName,
                    user.googleId,
                    user.role || 'user',
                    user.createdAt,
                    user.updatedAt || new Date().toISOString()
                ]);
                
                if (result.rowCount > 0) {
                    restored++;
                }
            } catch (err) {
                console.error(`🔄 [RESTORE] Failed to restore user ${user.email}:`, err.message);
            }
        }
        
        console.log(`🔄 [RESTORE] ✅ Restored ${restored} users from persistent backup`);
        return restored > 0;
        
    } catch (error) {
        console.error('🔄 [RESTORE] ❌ Failed to restore from persistent backup:', error);
        return false;
    }
}

// Clean up old backup files
async function cleanupOldBackups() {
    try {
        const files = await fs.readdir(__dirname);
        const backupFiles = files
            .filter(file => file.startsWith('user_backup_') && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(__dirname, file),
                time: parseInt(file.match(/user_backup_(\d+)\.json/)?.[1] || '0')
            }))
            .sort((a, b) => b.time - a.time); // newest first
        
        // Keep only last 5 backups
        const toDelete = backupFiles.slice(5);
        
        for (const backup of toDelete) {
            try {
                await fs.unlink(backup.path);
                console.log(`💾 [CLEANUP] Deleted old backup: ${backup.name}`);
            } catch (err) {
                console.error(`💾 [CLEANUP] Failed to delete ${backup.name}:`, err.message);
            }
        }
        
    } catch (error) {
        console.error('💾 [CLEANUP] ❌ Failed to cleanup old backups:', error);
    }
}

// Create only missing tables (safe approach)
async function createMissingTablesOnly() {
    try {
        console.log('🏗️ [SAFE-CREATE] Creating only missing tables...');
        
        // Check and create reset_tokens table
        const resetTokensExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'reset_tokens'
            );
        `);
        
        if (!resetTokensExists.rows[0].exists) {
            await pool.query(`
                CREATE TABLE reset_tokens (
                    token VARCHAR(255) PRIMARY KEY,
                    userid VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    expires BIGINT NOT NULL,
                    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userid) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
            console.log('🏗️ [SAFE-CREATE] Created reset_tokens table');
        }
        
        // Check and create analytics table
        const analyticsExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'analytics'
            );
        `);
        
        if (!analyticsExists.rows[0].exists) {
            await pool.query(`
                CREATE TABLE analytics (
                    id SERIAL PRIMARY KEY,
                    userid VARCHAR(255),
                    action VARCHAR(255) NOT NULL,
                    data JSONB,
                    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ip VARCHAR(45),
                    useragent TEXT
                )
            `);
            console.log('🏗️ [SAFE-CREATE] Created analytics table');
        }
        
        // Check and create sessions table
        const sessionsExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'sessions'
            );
        `);
        
        if (!sessionsExists.rows[0].exists) {
            await pool.query(`
                CREATE TABLE sessions (
                    sid VARCHAR(255) PRIMARY KEY,
                    sess JSON NOT NULL,
                    expire TIMESTAMP(6) NOT NULL
                )
            `);
            console.log('🏗️ [SAFE-CREATE] Created sessions table');
        }
        
        // Add any missing columns to users table
        await addMissingColumnsToUsers();
        
        // Create indexes
        await createIndexesSafely();
        
        console.log('🏗️ [SAFE-CREATE] ✅ All missing tables and columns created');
        
    } catch (error) {
        console.error('🏗️ [SAFE-CREATE] ❌ Error creating missing tables:', error);
        throw error;
    }
}

// Add missing columns to existing users table
async function addMissingColumnsToUsers() {
    try {
        console.log('🏗️ [COLUMN-ADD] Adding missing columns to users table...');
        
        // Check which columns exist
        const columnsResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
        `);
        
        const existingColumns = columnsResult.rows.map(row => row.column_name);
        console.log('🏗️ [COLUMN-ADD] Existing columns:', existingColumns);
        
        // Add missing columns one by one
        const requiredColumns = [
            { name: 'firstName', type: 'VARCHAR(255)' },
            { name: 'lastName', type: 'VARCHAR(255)' },
            { name: 'googleId', type: 'VARCHAR(255)' },
            { name: 'role', type: 'VARCHAR(50) DEFAULT \'user\'' },
            { name: 'createdAt', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
            { name: 'updatedAt', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
        ];
        
        for (const column of requiredColumns) {
            if (!existingColumns.includes(column.name)) {
                try {
                    await pool.query(`ALTER TABLE users ADD COLUMN "${column.name}" ${column.type}`);
                    console.log(`🏗️ [COLUMN-ADD] Added column: ${column.name}`);
                } catch (err) {
                    console.error(`🏗️ [COLUMN-ADD] Failed to add column ${column.name}:`, err.message);
                }
            }
        }
        
    } catch (error) {
        console.error('🏗️ [COLUMN-ADD] ❌ Error adding missing columns:', error);
    }
}

// Create all tables from scratch (only when no users exist)
async function createAllTablesFromScratch() {
    try {
        console.log('🏗️ [FROM-SCRATCH] Creating all tables from scratch...');
        
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                "firstName" VARCHAR(255),
                "lastName" VARCHAR(255),
                "googleId" VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Reset tokens table
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
        
        // Analytics table
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
        
        // Sessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR(255) PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            )
        `);
        
        console.log('🏗️ [FROM-SCRATCH] ✅ All tables created from scratch');
        
    } catch (error) {
        console.error('🏗️ [FROM-SCRATCH] ❌ Error creating tables from scratch:', error);
        throw error;
    }
}

// Ensure all required tables exist
async function ensureAllRequiredTablesExist() {
    try {
        console.log('🏗️ [ENSURE] Ensuring all required tables exist...');
        
        // List of required tables
        const requiredTables = ['users', 'reset_tokens', 'analytics', 'sessions'];
        
        for (const tableName of requiredTables) {
            const tableExists = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [tableName]);
            
            if (!tableExists.rows[0].exists) {
                console.log(`🏗️ [ENSURE] Table ${tableName} missing, creating...`);
                
                switch (tableName) {
                    case 'users':
                        await createAllTablesFromScratch();
                        break;
                    case 'reset_tokens':
                    case 'analytics':
                    case 'sessions':
                        await createMissingTablesOnly();
                        break;
                }
            }
        }
        
        // Create indexes
        await createIndexesSafely();
        
        console.log('🏗️ [ENSURE] ✅ All required tables verified');
        
    } catch (error) {
        console.error('🏗️ [ENSURE] ❌ Error ensuring tables exist:', error);
    }
}

// Create indexes safely
async function createIndexesSafely() {
    try {
        console.log('🏗️ [INDEX] Creating indexes safely...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_googleid ON users("googleId")',
            'CREATE INDEX IF NOT EXISTS idx_users_createdat ON users("createdAt")',
            'CREATE INDEX IF NOT EXISTS idx_reset_tokens_userid ON reset_tokens(userid)',
            'CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON reset_tokens(expires)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_userid ON analytics(userid)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_action ON analytics(action)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)'
        ];
        
        for (const indexSql of indexes) {
            try {
                await pool.query(indexSql);
            } catch (err) {
                // Ignore index creation errors (they might already exist)
                console.log('🏗️ [INDEX] Index already exists or failed to create:', err.message);
            }
        }
        
        console.log('🏗️ [INDEX] ✅ Indexes created safely');
        
    } catch (error) {
        console.error('🏗️ [INDEX] ❌ Error creating indexes:', error);
    }
}

// Restore users from backup (in case of data loss during deploy)
async function restoreUsersFromBackup(backupUsers) {
    try {
        console.log('🏗️ [DEPLOY-DEBUG] Starting user restore from backup...');
        console.log('🏗️ [DEPLOY-DEBUG] Backup contains', backupUsers.length, 'users');
        
        let restored = 0;
        for (const user of backupUsers) {
            try {
                console.log(`🏗️ [DEPLOY-DEBUG] Restoring user: ${user.email}`);
                const result = await pool.query(`
                    INSERT INTO users (id, email, password, "firstName", "lastName", "googleId", "createdAt")
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (email) DO NOTHING
                    RETURNING id, email
                `, [
                    user.id,
                    user.email,
                    user.password,
                    user.firstName,
                    user.lastName,
                    user.googleId,
                    user.createdAt
                ]);
                
                if (result.rowCount > 0) {
                    restored++;
                    console.log(`🏗️ [DEPLOY-DEBUG] ✅ User restored: ${user.email}`);
                } else {
                    console.log(`🏗️ [DEPLOY-DEBUG] ⚠️ User already exists, skipped: ${user.email}`);
                }
            } catch (err) {
                console.error(`🏗️ [DEPLOY-DEBUG] ❌ Failed to restore user ${user.email}:`, err.message);
            }
        }
        
        console.log(`🏗️ [DEPLOY-DEBUG] ✅ Restored ${restored} users from backup`);
        return restored;
        
    } catch (error) {
        console.error('🏗️ [DEPLOY-DEBUG] ❌ Backup restore error:', error);
        return 0;
    }
}

// Safe migration - only migrate new users, never overwrite existing ones
async function migrateFromSQLiteNewUsersOnly() {
    try {
        const sqliteDbPath = path.join(__dirname, 'users.db');
        
        if (!fs.existsSync(sqliteDbPath)) {
            console.log('ℹ️ [MIGRATE] No SQLite database found for migration');
            return;
        }
        
        console.log('🔄 [MIGRATE] Checking SQLite for NEW users to migrate...');
        
        // Import SQLite database safely
        const Database = require('better-sqlite3');
        let sqliteDb;
        
        try {
            sqliteDb = new Database(sqliteDbPath, { readonly: true });
        } catch (err) {
            console.error('❌ [MIGRATE] Failed to open SQLite database:', err.message);
            return;
        }
        
        // Get all users from SQLite
        let sqliteUsers;
        try {
            sqliteUsers = sqliteDb.prepare('SELECT * FROM users').all();
        } catch (err) {
            console.error('❌ [MIGRATE] Failed to read SQLite users:', err.message);
            sqliteDb.close();
            return;
        }
        
        console.log(`📊 [MIGRATE] Found ${sqliteUsers.length} users in SQLite`);
        
        if (sqliteUsers.length === 0) {
            sqliteDb.close();
            console.log('ℹ️ [MIGRATE] No users to migrate from SQLite');
            return;
        }
        
        let migrated = 0;
        let skipped = 0;
        
        for (const user of sqliteUsers) {
            try {
                // CRITICAL: Only add NEW users, never overwrite existing ones
                const existingUser = await pool.query(`
                    SELECT id, email FROM users WHERE email = $1
                `, [user.email]);
                
                if (existingUser.rows.length > 0) {
                    console.log(`⏭️ [MIGRATE] User already exists in PostgreSQL: ${user.email}`);
                    skipped++;
                    continue;
                }
                
                console.log(`🔄 [MIGRATE] Migrating NEW user: ${user.email}`);
                const result = await pool.query(`
                    INSERT INTO users (id, email, password, "firstName", "lastName", "googleId", "createdAt", role)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (email) DO NOTHING
                    RETURNING id, email
                `, [
                    user.id,
                    user.email,
                    user.password,
                    user.firstName,
                    user.lastName,
                    user.googleId,
                    user.createdAt,
                    user.role || 'user'
                ]);
                
                if (result.rowCount > 0) {
                    migrated++;
                    console.log(`✅ [MIGRATE] NEW User migrated: ${user.email}`);
                } else {
                    console.log(`⏭️ [MIGRATE] User already exists (conflict): ${user.email}`);
                    skipped++;
                }
            } catch (err) {
                console.error(`❌ [MIGRATE] Failed to migrate user ${user.email}:`, err.message);
            }
        }
        
        sqliteDb.close();
        console.log(`✅ [MIGRATE] Migration summary: ${migrated} new users migrated, ${skipped} users already existed`);
        
    } catch (error) {
        console.error('⚠️ [MIGRATE] Migration error:', error);
    }
}

// User operations for PostgreSQL
const userDB = {
    // Get all users
    getAllUsers: async () => {
        try {
            console.log('🔍 [USER-DEBUG] Getting all users from PostgreSQL...');
            const result = await pool.query('SELECT * FROM users ORDER BY "createdAt" DESC');
            console.log('🔍 [USER-DEBUG] Found', result.rows.length, 'users in PostgreSQL');
            
            if (result.rows.length === 0) {
                console.log('🔍 [USER-DEBUG] ⚠️ No users found! Checking if table exists...');
                const tableCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'users'
                    );
                `);
                console.log('🔍 [USER-DEBUG] Users table exists:', tableCheck.rows[0].exists);
                
                // Check if backup exists
                if (global.userBackup && global.userBackup.length > 0) {
                    console.log('🔍 [USER-DEBUG] Found backup with', global.userBackup.length, 'users');
                    console.log('🔍 [USER-DEBUG] Backup users:', global.userBackup.map(u => ({ email: u.email, id: u.id })));
                }
            } else {
                console.log('🔍 [USER-DEBUG] Users found:', result.rows.map(u => ({ 
                    email: u.email, 
                    id: u.id,
                    isGoogleUser: !!u.googleId 
                })));
            }
            
            return result.rows;
        } catch (error) {
            console.error('🔍 [USER-DEBUG] ❌ Error getting all users:', error);
            console.error('🔍 [USER-DEBUG] Error details:', error.message);
            return [];
        }
    },

    // Get user by email
    getUserByEmail: async (email) => {
        try {
            console.log('🔍 PostgreSQL: Looking for user with email:', email);
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0] || null;
            console.log('🔍 PostgreSQL: User found:', {
                found: !!user,
                id: user?.id,
                email: user?.email,
                hasPassword: !!user?.password,
                passwordLength: user?.password ? user.password.length : 0,
                isGoogleUser: !!user?.googleId || !!user?.googleid,
                firstName: user?.firstName || user?.firstname,
                lastName: user?.lastName || user?.lastname,
                createdAt: user?.createdAt || user?.createdat
            });
            return user;
        } catch (error) {
            console.error('❌ Error getting user by email:', error);
            console.error('❌ PostgreSQL error details:', {
                message: error.message,
                code: error.code,
                detail: error.detail
            });
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
            console.log('🔍 [USER-CREATE-DEBUG] Starting user creation...');
            console.log('🔍 [USER-CREATE-DEBUG] Input data:', {
                id: userData.id,
                email: userData.email,
                hasPassword: !!userData.password,
                passwordLength: userData.password ? userData.password.length : 0,
                firstName: userData.firstName,
                lastName: userData.lastName,
                googleId: userData.googleId,
                createdAt: userData.createdAt
            });

            // Validate required fields
            if (!userData.email) {
                console.error('❌ [USER-CREATE-DEBUG] Missing required field: email');
                return false;
            }
            if (!userData.id) {
                console.error('❌ [USER-CREATE-DEBUG] Missing required field: id');
                return false;
            }

            // CRITICAL: First check if user already exists to prevent data loss
            const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [userData.email]);
            if (existingUser.rows.length > 0) {
                console.log(`⚠️ User with email ${userData.email} already exists, updating instead of overwriting`);
                
                // Update existing user with new data, preserving existing data
                const updateResult = await pool.query(`
                    UPDATE users SET
                        password = CASE 
                            WHEN users.password IS NULL OR users.password = '' 
                            THEN $3 
                            ELSE users.password 
                        END,
                        "firstName" = COALESCE(users."firstName", $4),
                        "lastName" = COALESCE(users."lastName", $5),
                        "googleId" = COALESCE(users."googleId", $6),
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE email = $2
                    RETURNING *
                `, [
                    userData.id,
                    userData.email,
                    userData.password,
                    userData.firstName,
                    userData.lastName,
                    userData.googleId || null
                ]);
                
                console.log('✅ Existing user updated in PostgreSQL:', userData.email);
                
                // CRITICAL: Verify the update was successful
                const verifyUser = await pool.query('SELECT * FROM users WHERE email = $1', [userData.email]);
                if (verifyUser.rows.length > 0) {
                    console.log('✅ User update verified successfully');
                    return true;
                } else {
                    console.error('❌ User update verification failed');
                    return false;
                }
            }

            // Insert new user
            const result = await pool.query(`
                INSERT INTO users (id, email, password, "firstName", "lastName", "googleId", "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                userData.id,
                userData.email,
                userData.password,
                userData.firstName,
                userData.lastName,
                userData.googleId || null,
                userData.createdAt || new Date().toISOString()
            ]);

            console.log('📝 PostgreSQL: Insert result:', {
                rowCount: result.rowCount,
                returningData: result.rows[0] ? {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    hasPassword: !!result.rows[0].password,
                    passwordLength: result.rows[0].password ? result.rows[0].password.length : 0
                } : null
            });

            // CRITICAL: Verify the user was inserted correctly
            if (result.rowCount > 0) {
                const insertedUser = await pool.query('SELECT * FROM users WHERE email = $1', [userData.email]);
                const user = insertedUser.rows[0];
                console.log('📝 PostgreSQL: Verification - user retrieved after insert:', {
                    found: !!user,
                    id: user?.id,
                    email: user?.email,
                    hasPassword: !!user?.password,
                    passwordLength: user?.password ? user.password.length : 0,
                    createdAt: user?.createdAt
                });
                
                // CRITICAL: Final verification - check total user count  
                const totalCount = await pool.query('SELECT COUNT(*) as count FROM users');
                console.log('📝 PostgreSQL: Total user count after insert:', parseInt(totalCount.rows[0].count));
            }

            console.log('✅ User created in PostgreSQL:', userData.email);
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Error creating user:', error.message);
            console.error('❌ PostgreSQL error details:', {
                message: error.message,
                code: error.code,
                detail: error.detail,
                constraint: error.constraint
            });
            console.error('📦 userData:', userData);
            if (error.stack) console.error('🧠 Stack trace:', error.stack);
            return false;
        }
    },



    // Update user
    updateUser: async (id, updates) => {
        try {
            console.log('🔄 [USER-UPDATE-DEBUG] Starting user update...');
            console.log('🔄 [USER-UPDATE-DEBUG] User ID:', id);
            console.log('🔄 [USER-UPDATE-DEBUG] Updates:', updates);

            const fields = [];
            const values = [];
            let paramIndex = 1;

            // Map field names to quoted camelCase
            const fieldMap = {
                firstName: '"firstName"',
                lastName: '"lastName"',
                googleId: '"googleId"',
                createdAt: '"createdAt"',
                updatedAt: '"updatedAt"'
            };

            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    const fieldName = fieldMap[key] || key;
                    fields.push(`${fieldName} = $${paramIndex}`);
                    values.push(updates[key]);
                    paramIndex++;
                }
            });

            if (fields.length === 0) {
                console.log('⚠️ [USER-UPDATE-DEBUG] No fields to update');
                return false;
            }

            fields.push(`"updatedAt" = $${paramIndex}`);
            values.push(new Date().toISOString());
            values.push(id);

            const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex + 1}`;
            console.log('🔄 [USER-UPDATE-DEBUG] SQL Query:', query);
            console.log('🔄 [USER-UPDATE-DEBUG] SQL Values:', values);

            const result = await pool.query(query, values);
            console.log('🔄 [USER-UPDATE-DEBUG] Update result:', {
                rowCount: result.rowCount,
                success: result.rowCount > 0
            });
            
            // Verify the update
            if (result.rowCount > 0) {
                const verifyResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
                if (verifyResult.rows.length > 0) {
                    console.log('✅ [USER-UPDATE-DEBUG] Update verified, user data:', {
                        id: verifyResult.rows[0].id,
                        email: verifyResult.rows[0].email,
                        googleId: verifyResult.rows[0].googleId,
                        role: verifyResult.rows[0].role,
                        updatedAt: verifyResult.rows[0].updatedAt
                    });
                } else {
                    console.error('❌ [USER-UPDATE-DEBUG] Update verification failed - user not found');
                }
            }
            
            console.log('✅ [USER-UPDATE-DEBUG] User update completed for:', id);
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
            console.log('🔍 [USER-DEBUG] Getting user count from PostgreSQL...');
            const result = await pool.query('SELECT COUNT(*) as count FROM users');
            const count = parseInt(result.rows[0].count);
            console.log('🔍 [USER-DEBUG] User count:', count);
            
            if (count === 0) {
                console.log('🔍 [USER-DEBUG] ⚠️ User count is 0! Checking backup...');
                if (global.userBackup && global.userBackup.length > 0) {
                    console.log('🔍 [USER-DEBUG] Backup exists with', global.userBackup.length, 'users');
                    console.log('🔍 [USER-DEBUG] Should we restore from backup?');
                }
            }
            
            return count;
        } catch (error) {
            console.error('🔍 [USER-DEBUG] ❌ Error getting user count:', error);
            console.error('🔍 [USER-DEBUG] Error details:', error.message);
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
    // Get analytics summary (last 12 months)
    getAnalyticsSummary: async () => {
        try {
            // Main summary query - limited to last 12 months
            const summaryResult = await pool.query(`
                SELECT 
                    COUNT(DISTINCT userid) as total_users,
                    COUNT(*) FILTER (WHERE action = 'session_start') as total_sessions,
                    COUNT(*) FILTER (WHERE action = 'pdf_download') as total_pdf_downloads,
                    COUNT(*) FILTER (WHERE action = 'button_click') as total_button_clicks
                FROM analytics
                WHERE timestamp >= NOW() - INTERVAL '12 months'
            `);
            
            // Recent activities
            const recentResult = await pool.query(`
                SELECT id, userid, action, data, timestamp
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL '12 months'
                ORDER BY timestamp DESC 
                LIMIT 50
            `);
            
            // User activities grouped
            const userActivitiesResult = await pool.query(`
                SELECT 
                    userid,
                    COUNT(*) as totalActivities,
                    COUNT(*) FILTER (WHERE action = 'pdf_download') as pdfDownloads,
                    COUNT(*) FILTER (WHERE action = 'button_click') as buttonClicks,
                    MAX(timestamp) as lastActivity
                FROM analytics
                WHERE timestamp >= NOW() - INTERVAL '12 months'
                GROUP BY userid
                ORDER BY lastActivity DESC
            `);
            
            const summary = summaryResult.rows[0] || {
                total_users: 0,
                total_sessions: 0,
                total_pdf_downloads: 0,
                total_button_clicks: 0
            };
            
            const recentActivities = recentResult.rows.map(row => ({
                id: row.id.toString(),
                userId: row.userid,
                action: row.action,
                data: row.data,
                timestamp: row.timestamp.toISOString()
            }));
            
            const userActivities = userActivitiesResult.rows.map(row => ({
                userId: row.userid,
                totalActivities: parseInt(row.totalactivities),
                pdfDownloads: parseInt(row.pdfdownloads),
                buttonClicks: parseInt(row.buttonclicks),
                lastActivity: row.lastactivity.toISOString()
            }));
            
            return {
                summary: {
                    totalUsers: parseInt(summary.total_users),
                    totalSessions: parseInt(summary.total_sessions),
                    totalPDFDownloads: parseInt(summary.total_pdf_downloads),
                    totalButtonClicks: parseInt(summary.total_button_clicks),
                    averageSessionDuration: 0 // Calculate if needed
                },
                recentActivities,
                userActivities
            };
        } catch (error) {
            console.error('❌ Error getting analytics summary:', error);
            return {
                summary: {
                    totalUsers: 0,
                    totalSessions: 0,
                    totalPDFDownloads: 0,
                    totalButtonClicks: 0,
                    averageSessionDuration: 0
                },
                recentActivities: [],
                userActivities: []
            };
        }
    },

    // Get recent activities
    // Get recent activities (limited to last 12 months)
    getRecentActivities: async (limit = 50) => {
        try {
            const result = await pool.query(`
                SELECT id, userid, action, data, timestamp
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL '12 months'
                ORDER BY timestamp DESC 
                LIMIT $1
            `, [limit]);
            
            return result.rows.map(row => ({
                id: row.id.toString(),
                userId: row.userid,
                action: row.action,
                data: row.data,
                timestamp: row.timestamp.toISOString()
            }));
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