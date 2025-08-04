// Script to add the missing yaani user to PostgreSQL
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL not set!');
    process.exit(1);
}

async function addYaaniUser() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Connecting to PostgreSQL...');
        
        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT email FROM users WHERE email = $1',
            ['karekanalsiparisuygulamasi@yaani.com']
        );

        if (existingUser.rows.length > 0) {
            console.log('✅ User already exists: karekanalsiparisuygulamasi@yaani.com');
            return;
        }

        // Create the user
        const hashedPassword = await bcrypt.hash('123456', 10); // Default password
        const userId = Date.now().toString();

        const result = await pool.query(`
            INSERT INTO users (id, email, password, "firstName", "lastName", role, "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, email
        `, [
            userId,
            'karekanalsiparisuygulamasi@yaani.com',
            hashedPassword,
            'Yaani',
            'User',
            'user',
            new Date().toISOString()
        ]);

        if (result.rowCount > 0) {
            console.log('✅ User created successfully!');
            console.log('📧 Email: karekanalsiparisuygulamasi@yaani.com');
            console.log('🔑 Password: 123456');
            console.log('👤 User ID:', userId);
        }

        // Verify user count
        const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log('👥 Total users now:', totalUsers.rows[0].count);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

addYaaniUser();