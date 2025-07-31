// Debug script to check PostgreSQL data integrity
require('dotenv').config();
const { Pool } = require('pg');

async function debugPostgreSQLData() {
    console.log('🔍 PostgreSQL Data Debug Script');
    console.log('================================');
    
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL not set');
        return;
    }
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        console.log('🔗 Connecting to PostgreSQL...');
        const client = await pool.connect();
        
        // Check if tables exist
        console.log('\n📊 Checking table existence...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'sessions', 'analytics', 'reset_tokens')
        `);
        
        console.log('📋 Existing tables:', tablesResult.rows.map(r => r.table_name));
        
        // Check users table
        if (tablesResult.rows.some(r => r.table_name === 'users')) {
            console.log('\n👥 Checking users table...');
            
            // Get user count
            const countResult = await client.query('SELECT COUNT(*) as count FROM users');
            const userCount = parseInt(countResult.rows[0].count);
            console.log(`📊 Total users: ${userCount}`);
            
            if (userCount > 0) {
                // Get sample users
                const usersResult = await client.query(`
                    SELECT id, email, "firstName", "lastName", "googleId", "createdAt", "updatedAt", role
                    FROM users 
                    ORDER BY "createdAt" DESC 
                    LIMIT 10
                `);
                
                console.log('\n📋 Sample users:');
                usersResult.rows.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.email} (${user.firstName || ''} ${user.lastName || ''})`);
                    console.log(`   ID: ${user.id}`);
                    console.log(`   Google ID: ${user.googleId || 'None'}`);
                    console.log(`   Role: ${user.role || 'user'}`);
                    console.log(`   Created: ${user.createdAt}`);
                    console.log(`   Updated: ${user.updatedAt}`);
                    console.log('');
                });
                
                // Check for email users vs Google users
                const emailUsers = await client.query('SELECT COUNT(*) as count FROM users WHERE "googleId" IS NULL');
                const googleUsers = await client.query('SELECT COUNT(*) as count FROM users WHERE "googleId" IS NOT NULL');
                
                console.log(`📊 Email users: ${emailUsers.rows[0].count}`);
                console.log(`📊 Google users: ${googleUsers.rows[0].count}`);
            }
        }
        
        // Check sessions table
        if (tablesResult.rows.some(r => r.table_name === 'sessions')) {
            console.log('\n🔐 Checking sessions table...');
            const sessionsCount = await client.query('SELECT COUNT(*) as count FROM sessions');
            console.log(`📊 Active sessions: ${sessionsCount.rows[0].count}`);
        }
        
        // Check analytics table
        if (tablesResult.rows.some(r => r.table_name === 'analytics')) {
            console.log('\n📈 Checking analytics table...');
            const analyticsCount = await client.query('SELECT COUNT(*) as count FROM analytics');
            console.log(`📊 Analytics records: ${analyticsCount.rows[0].count}`);
        }
        
        // Check reset_tokens table
        if (tablesResult.rows.some(r => r.table_name === 'reset_tokens')) {
            console.log('\n🔑 Checking reset_tokens table...');
            const tokensCount = await client.query('SELECT COUNT(*) as count FROM reset_tokens');
            console.log(`📊 Reset tokens: ${tokensCount.rows[0].count}`);
        }
        
        client.release();
        console.log('\n✅ Debug completed successfully');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

// Run the debug script
debugPostgreSQLData().catch(console.error); 