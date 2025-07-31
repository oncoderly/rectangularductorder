const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 PostgreSQL Connection Checker');
console.log('================================');

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RENDER_SERVICE_NAME = process.env.RENDER_SERVICE_NAME;
const isProduction = NODE_ENV === 'production' || !!RENDER_SERVICE_NAME;

console.log('📍 Environment:', NODE_ENV);
console.log('🏭 Is Production:', isProduction);
console.log('🚀 Render Service:', RENDER_SERVICE_NAME || 'Not set');
console.log('🔗 DATABASE_URL exists:', !!DATABASE_URL);
console.log('🔗 DATABASE_URL length:', DATABASE_URL ? DATABASE_URL.length : 0);
console.log('🔍 First 50 chars of URL:', DATABASE_URL ? DATABASE_URL.substring(0, 50) + '...' : 'Not available');

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error('❌ This will cause data loss on Render.com!');
    process.exit(1);
}

async function testConnection() {
    try {
        console.log('\n🔧 Testing PostgreSQL connection...');
        
        const config = {
            connectionString: DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10
        };

        const pool = new Pool(config);
        
        // Test basic connection
        const client = await pool.connect();
        console.log('✅ PostgreSQL connection successful');
        
        // Test query
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Query test successful:', result.rows[0]);
        
        // Check if users table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        const tableExists = tableCheck.rows[0].exists;
        console.log('📊 Users table exists:', tableExists);
        
        if (tableExists) {
            // Count users
            const userCount = await client.query('SELECT COUNT(*) as count FROM users');
            console.log('📊 User count:', userCount.rows[0].count);
            
            // Show sample users
            const sampleUsers = await client.query('SELECT id, email, "firstName", "lastName", "createdAt" FROM users LIMIT 5');
            console.log('📊 Sample users:');
            sampleUsers.rows.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.email} (${user.firstName} ${user.lastName}) - ${user.createdAt}`);
            });
        } else {
            console.log('📊 Users table does not exist - will be created on first startup');
        }
        
        client.release();
        await pool.end();
        
        console.log('\n✅ PostgreSQL connection test completed successfully!');
        console.log('✅ Your DATABASE_URL is correctly configured');
        console.log('✅ Data will be persistent on Render.com');
        
    } catch (error) {
        console.error('\n❌ PostgreSQL connection failed:', error.message);
        console.error('❌ Error details:', {
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });
        
        if (error.code === 'ENOTFOUND') {
            console.error('❌ DNS resolution failed - check your DATABASE_URL');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Connection refused - database might be down');
        } else if (error.code === '28P01') {
            console.error('❌ Authentication failed - check username/password in DATABASE_URL');
        } else if (error.code === '3D000') {
            console.error('❌ Database does not exist - check database name in DATABASE_URL');
        }
        
        process.exit(1);
    }
}

testConnection(); 