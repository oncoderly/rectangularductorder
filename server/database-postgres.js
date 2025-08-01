const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
        
        const config = {
            connectionString: DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10
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
        return testConnection().then(() => {
            createTables();
            return pool;
        });
        
    } catch (error) {
        console.error('❌ PostgreSQL initialization failed:', error);
        throw error;
    }
}

async function createTables() {
    try {
        console.log('🏗️ [DEPLOY-DEBUG] Creating PostgreSQL tables...');
        console.log('🏗️ [DEPLOY-DEBUG] Timestamp:', new Date().toISOString());
        console.log('🏗️ [DEPLOY-DEBUG] NODE_ENV:', process.env.NODE_ENV);
        console.log('🏗️ [DEPLOY-DEBUG] Database URL exists:', !!DATABASE_URL);
        
        // First, check if users table exists and has data
        let existingUserCount = 0;
        let tableExists = false;
        let existingUsers = [];
        
        try {
            // Check if table exists
            console.log('🏗️ [DEPLOY-DEBUG] Checking if users table exists...');
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                );
            `);
            tableExists = tableCheck.rows[0].exists;
            console.log('🏗️ [DEPLOY-DEBUG] Users table exists:', tableExists);
            
            if (tableExists) {
                console.log('🏗️ [DEPLOY-DEBUG] Getting user count...');
                const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
                existingUserCount = parseInt(countResult.rows[0].count);
                console.log(`🏗️ [DEPLOY-DEBUG] Found ${existingUserCount} existing users in PostgreSQL`);
                
                // CRITICAL: Log ALL existing users to verify data persistence
                if (existingUserCount > 0) {
                    console.log('🏗️ [DEPLOY-DEBUG] Getting all existing users...');
                    const existingUsersResult = await pool.query('SELECT id, email, "firstName", "lastName", "googleId", "createdAt" FROM users ORDER BY "createdAt" DESC');
                    existingUsers = existingUsersResult.rows;
                    console.log('🏗️ [DEPLOY-DEBUG] ALL existing users before table operations:');
                    existingUsers.forEach((u, index) => {
                        console.log(`🏗️ [DEPLOY-DEBUG] User ${index + 1}:`, {
                            id: u.id,
                            email: u.email,
                            name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                            isGoogleUser: !!u.googleId,
                            createdAt: u.createdAt
                        });
                    });
                    
                    // Store user data in memory as backup
                    console.log('🏗️ [DEPLOY-DEBUG] Creating user data backup in memory...');
                    global.userBackup = existingUsers;
                    console.log('🏗️ [DEPLOY-DEBUG] Backup created with', existingUsers.length, 'users');
                }
            } else {
                console.log('🏗️ [DEPLOY-DEBUG] Users table does not exist yet, will create');
            }
        } catch (err) {
            console.error('🏗️ [DEPLOY-DEBUG] Users table check failed:', err.message);
            console.error('🏗️ [DEPLOY-DEBUG] Error details:', err);
        }
        
        // Create users table with consistent naming - SAFELY
        console.log('🏗️ [DEPLOY-DEBUG] About to run CREATE TABLE IF NOT EXISTS...');
        console.log('🏗️ [DEPLOY-DEBUG] This should NOT delete existing data!');
        
        // CRITICAL: Use a transaction to ensure atomicity
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Check one more time before creating
            const preCreateCount = await client.query('SELECT COUNT(*) as count FROM users');
            const preCount = parseInt(preCreateCount.rows[0].count);
            console.log('🏗️ [DEPLOY-DEBUG] User count BEFORE CREATE TABLE:', preCount);
            
            await client.query(`
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
            
            // Check immediately after creating
            const postCreateCount = await client.query('SELECT COUNT(*) as count FROM users');
            const postCount = parseInt(postCreateCount.rows[0].count);
            console.log('🏗️ [DEPLOY-DEBUG] User count AFTER CREATE TABLE:', postCount);
            
            if (postCount !== preCount) {
                console.error('🏗️ [DEPLOY-DEBUG] ❌ CRITICAL: CREATE TABLE IF NOT EXISTS deleted data!');
                console.error('🏗️ [DEPLOY-DEBUG] Rolling back transaction...');
                await client.query('ROLLBACK');
                
                // Try to restore from backup
                if (global.userBackup && global.userBackup.length > 0) {
                    console.log('🏗️ [DEPLOY-DEBUG] Emergency restore from backup...');
                    await restoreUsersFromBackup(global.userBackup);
                }
                throw new Error(`CREATE TABLE IF NOT EXISTS deleted ${preCount - postCount} users!`);
            } else {
                console.log('🏗️ [DEPLOY-DEBUG] ✅ CREATE TABLE IF NOT EXISTS safe - no data lost');
                await client.query('COMMIT');
            }
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
        console.log('🏗️ [DEPLOY-DEBUG] Users table created/verified safely');
        
        // CRITICAL: Check if users are still there after table creation
        const afterTableCreateCount = await pool.query('SELECT COUNT(*) as count FROM users');
        const afterCount = parseInt(afterTableCreateCount.rows[0].count);
        console.log('🏗️ [DEPLOY-DEBUG] User count AFTER table creation:', afterCount);
        
        if (afterCount !== existingUserCount) {
            console.error('🏗️ [DEPLOY-DEBUG] ❌ CRITICAL: User count changed from', existingUserCount, 'to', afterCount, 'after table creation!');
            
            // Try to restore from backup if we have it
            if (global.userBackup && global.userBackup.length > 0) {
                console.log('🏗️ [DEPLOY-DEBUG] Attempting to restore users from backup...');
                await restoreUsersFromBackup(global.userBackup);
            }
        } else {
            console.log('🏗️ [DEPLOY-DEBUG] ✅ User count stable after table creation');
        }
        
        // Migration: Add new columns if they don't exist and copy data from old columns
        try {
            console.log('🏗️ [DEPLOY-DEBUG] Starting column migration...');
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255)`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255)`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255)`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP`);
            
            // Check user count after adding columns
            const afterColumnsCount = await pool.query('SELECT COUNT(*) as count FROM users');
            const afterColumnsTotal = parseInt(afterColumnsCount.rows[0].count);
            console.log('🏗️ [DEPLOY-DEBUG] User count AFTER adding columns:', afterColumnsTotal);
            
            // Copy data from lowercase columns to camelCase columns if needed
            console.log('🏗️ [DEPLOY-DEBUG] Copying data from old columns...');
            await pool.query(`UPDATE users SET "firstName" = firstname WHERE "firstName" IS NULL AND firstname IS NOT NULL`);
            await pool.query(`UPDATE users SET "lastName" = lastname WHERE "lastName" IS NULL AND lastname IS NOT NULL`);
            await pool.query(`UPDATE users SET "googleId" = googleid WHERE "googleId" IS NULL AND googleid IS NOT NULL`);
            await pool.query(`UPDATE users SET "createdAt" = createdat WHERE "createdAt" IS NULL AND createdat IS NOT NULL`);
            await pool.query(`UPDATE users SET "updatedAt" = updatedat WHERE "updatedAt" IS NULL AND updatedat IS NOT NULL`);
            
            // Check user count after data copy
            const afterCopyCount = await pool.query('SELECT COUNT(*) as count FROM users');
            const afterCopyTotal = parseInt(afterCopyCount.rows[0].count);
            console.log('🏗️ [DEPLOY-DEBUG] User count AFTER data copy:', afterCopyTotal);
            
            // Drop old lowercase columns if they exist and data has been migrated
            console.log('🏗️ [DEPLOY-DEBUG] Dropping old columns...');
            const columnsToCheck = ['firstname', 'lastname', 'googleid', 'createdat', 'updatedat'];
            for (const column of columnsToCheck) {
                try {
                    // Check if old column exists
                    const checkColumn = await pool.query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = $1
                    `, [column]);
                    
                    if (checkColumn.rows.length > 0) {
                        await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS ${column}`);
                        console.log(`🏗️ [DEPLOY-DEBUG] Dropped old column: ${column}`);
                    }
                } catch (dropError) {
                    console.error(`🏗️ [DEPLOY-DEBUG] Could not drop column ${column}:`, dropError.message);
                }
            }
            
            // Final check after dropping columns
            const finalCount = await pool.query('SELECT COUNT(*) as count FROM users');
            const finalTotal = parseInt(finalCount.rows[0].count);
            console.log('🏗️ [DEPLOY-DEBUG] User count AFTER dropping old columns:', finalTotal);
            
            console.log('🏗️ [DEPLOY-DEBUG] ✅ PostgreSQL column migration completed');
        } catch (migrationError) {
            console.error('🏗️ [DEPLOY-DEBUG] ⚠️ Column migration error:', migrationError.message);
            console.error('🏗️ [DEPLOY-DEBUG] Migration error details:', migrationError);
        }

        // Add role column if it doesn't exist (for existing databases)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
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

        // Create sessions table for PostgreSQL session store
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR(255) PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            )
        `);
        console.log('✅ Sessions table created/verified');

        // Create indexes for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_googleid ON users("googleId");
            CREATE INDEX IF NOT EXISTS idx_users_createdat ON users("createdAt");
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_userid ON reset_tokens(userid);
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON reset_tokens(expires);
            CREATE INDEX IF NOT EXISTS idx_analytics_userid ON analytics(userid);
            CREATE INDEX IF NOT EXISTS idx_analytics_action ON analytics(action);
            CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
            CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
        `);

        console.log('✅ PostgreSQL tables created successfully');

        // CRITICAL: Only migrate from SQLite if PostgreSQL is completely empty
        if (existingUserCount === 0 && !tableExists) {
            console.log('🏗️ [DEPLOY-DEBUG] PostgreSQL is empty, performing SQLite migration...');
            await migrateFromSQLite();
        } else if (existingUserCount > 0) {
            console.log(`🏗️ [DEPLOY-DEBUG] PostgreSQL has ${existingUserCount} users, skipping migration to prevent data loss`);
            
            // CRITICAL: Verify data integrity after deploy
            const finalUserCount = await pool.query('SELECT COUNT(*) as count FROM users');
            const finalCount = parseInt(finalUserCount.rows[0].count);
            console.log(`🏗️ [DEPLOY-DEBUG] POST-DEPLOY VERIFICATION: Final user count: ${finalCount}`);
            
            if (finalCount !== existingUserCount) {
                console.error(`🏗️ [DEPLOY-DEBUG] ❌ CRITICAL: User count changed from ${existingUserCount} to ${finalCount} during deploy!`);
                
                // Try to restore from backup
                if (global.userBackup && global.userBackup.length > 0) {
                    console.log('🏗️ [DEPLOY-DEBUG] Attempting emergency restore from backup...');
                    await restoreUsersFromBackup(global.userBackup);
                    
                    // Verify restore
                    const restoredCount = await pool.query('SELECT COUNT(*) as count FROM users');
                    const restoredTotal = parseInt(restoredCount.rows[0].count);
                    console.log(`🏗️ [DEPLOY-DEBUG] User count after restore: ${restoredTotal}`);
                } else {
                    console.error('🏗️ [DEPLOY-DEBUG] ❌ No backup available for restore!');
                }
            } else {
                console.log(`🏗️ [DEPLOY-DEBUG] ✅ POST-DEPLOY VERIFICATION: User count stable at ${finalCount}`);
                
                // Log all users to verify they are still there
                const allUsersAfter = await pool.query('SELECT id, email, "firstName", "lastName", "googleId" FROM users ORDER BY "createdAt" DESC');
                console.log('🏗️ [DEPLOY-DEBUG] ALL users after deployment:');
                allUsersAfter.rows.forEach((u, index) => {
                    console.log(`🏗️ [DEPLOY-DEBUG] User ${index + 1}:`, {
                        id: u.id,
                        email: u.email,
                        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                        isGoogleUser: !!u.googleId
                    });
                });
            }
        } else {
            console.log('🏗️ [DEPLOY-DEBUG] PostgreSQL table exists but empty, skipping migration to prevent conflicts');
        }
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
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
            let updated = 0;
            for (const user of sqliteUsers) {
                try {
                    console.log(`🔄 Migrating user: ${user.email}`);
                    const result = await pool.query(`
                        INSERT INTO users (id, email, password, "firstName", "lastName", "googleId", "createdAt")
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (email) DO UPDATE SET
                            password = EXCLUDED.password,
                            "firstName" = EXCLUDED."firstName",
                            "lastName" = EXCLUDED."lastName",
                            "googleId" = EXCLUDED."googleId",
                            "createdAt" = EXCLUDED."createdAt"
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
                        migrated++;
                        console.log(`✅ User migrated/updated: ${user.email}`);
                    }
                } catch (err) {
                    console.error(`❌ Failed to migrate user ${user.email}:`, err.message);
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

            if (fields.length === 0) return false;

            fields.push(`"updatedAt" = $${paramIndex}`);
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