// Test PostgreSQL users table with direct SQL query
const { Pool } = require('pg');

// Load environment variables from .env file
require('dotenv').config({ path: '../.env' });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rectangularduct_user:WvlaSwkbrZlDVBV1gc34RCKCO5PF3aGC@dpg-d23m9kali9vc73f85n40-a.frankfurt-postgres.render.com/rectangularductorder_db';

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
}

async function testUsersSQL() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Connecting to PostgreSQL...');
        console.log('🔗 Database URL exists:', !!DATABASE_URL);
        console.log('🔗 First 50 chars:', DATABASE_URL ? DATABASE_URL.substring(0, 50) + '...' : 'Not available');
        
        // Test connection
        await pool.query('SELECT 1 as test');
        console.log('✅ PostgreSQL connection successful');
        
        // Execute SELECT * FROM users;
        console.log('\n🧪 Executing: SELECT * FROM users;');
        const result = await pool.query('SELECT * FROM users');
        
        console.log(`\n📊 Found ${result.rows.length} users:`);
        console.log('=' .repeat(80));
        
        if (result.rows.length === 0) {
            console.log('❌ NO USERS FOUND! Table is empty.');
        } else {
            result.rows.forEach((user, index) => {
                console.log(`\n👤 User ${index + 1}:`);
                console.log(`   ID: ${user.id}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   First Name: ${user.firstName || 'NULL'}`);
                console.log(`   Last Name: ${user.lastName || 'NULL'}`);
                console.log(`   Google ID: ${user.googleId || 'NULL'}`);
                console.log(`   Role: ${user.role || 'NULL'}`);
                console.log(`   Has Password: ${user.password ? 'YES' : 'NO'}`);
                console.log(`   Created At: ${user.createdAt}`);
                console.log(`   Updated At: ${user.updatedAt || 'NULL'}`);
            });
        }
        
        // Check table structure
        console.log('\n🏗️ Table structure:');
        const tableInfo = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        tableInfo.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // Check other tables
        console.log('\n📋 All tables in database:');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('❌ Full error:', error);
    } finally {
        await pool.end();
        console.log('\n✅ Connection closed');
    }
}

testUsersSQL();