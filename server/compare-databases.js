// Compare SQLite vs PostgreSQL data
const { Pool } = require('pg');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '../.env' });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rectangularduct_user:WvlaSwkbrZlDVBV1gc34RCKCO5PF3aGC@dpg-d23m9kali9vc73f85n40-a.frankfurt-postgres.render.com/rectangularductorder_db';

async function compareDatabases() {
    console.log('🔍 COMPARING SQLITE VS POSTGRESQL DATA\n');
    
    // 1. Check SQLite
    console.log('📁 SQLite Database:');
    try {
        const sqliteDb = new Database('./users.db', { readonly: true });
        const sqliteUsers = sqliteDb.prepare('SELECT * FROM users').all();
        console.log(`   Users: ${sqliteUsers.length}`);
        sqliteUsers.forEach((user, i) => {
            console.log(`   ${i+1}. ${user.email} (${user.id})`);
        });
        sqliteDb.close();
    } catch (error) {
        console.log('   ERROR:', error.message);
    }
    
    // 2. Check PostgreSQL
    console.log('\n🐘 PostgreSQL Database:');
    try {
        const pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const result = await pool.query('SELECT * FROM users ORDER BY "createdAt"');
        console.log(`   Users: ${result.rows.length}`);
        result.rows.forEach((user, i) => {
            console.log(`   ${i+1}. ${user.email} (${user.id})`);
        });
        
        await pool.end();
    } catch (error) {
        console.log('   ERROR:', error.message);
    }
    
    // 3. Check which database the app is actually using
    console.log('\n🤔 WHICH DATABASE IS THE APP USING?');
    console.log('   This requires running the app to see...');
}

compareDatabases();