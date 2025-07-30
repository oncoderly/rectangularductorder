const { Pool } = require('pg');

async function debugProductionUsers() {
    console.log('🔍 DEBUGGING PRODUCTION USERS');
    console.log('================================');
    
    const DATABASE_URL = process.env.DATABASE_URL;
    console.log('🔗 DATABASE_URL exists:', !!DATABASE_URL);
    console.log('🔗 DATABASE_URL length:', DATABASE_URL ? DATABASE_URL.length : 0);
    console.log('🔗 First 50 chars:', DATABASE_URL ? DATABASE_URL.substring(0, 50) + '...' : 'Not set');
    
    if (!DATABASE_URL) {
        console.log('❌ No DATABASE_URL found!');
        return;
    }
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        // Test connection
        console.log('🧪 Testing PostgreSQL connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connection successful');
        
        // Check if users table exists
        console.log('🔍 Checking if users table exists...');
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        console.log('👥 Users table exists:', tableExists.rows[0].exists);
        
        if (tableExists.rows[0].exists) {
            // Get user count
            const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
            console.log('📊 Total users in PostgreSQL:', userCount.rows[0].count);
            
            // Get all users
            const users = await pool.query('SELECT id, email, "firstName", "lastName", "googleId", "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 10');
            console.log('👤 Recent users:');
            users.rows.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.email} | ${user.firstName} ${user.lastName} | Created: ${user.createdAt}`);
            });
            
            // Check for email users specifically
            const emailUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE "googleId" IS NULL');
            console.log('📧 Email-registered users count:', emailUsers.rows[0].count);
            
            // Check table schema
            console.log('🏗️ Checking table schema...');
            const schema = await pool.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position;
            `);
            console.log('📋 Table columns:');
            schema.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('❌ Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

debugProductionUsers().catch(console.error);