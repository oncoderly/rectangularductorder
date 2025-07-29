require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const makeAdmin = async () => {
  try {
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', 'salihosmanli34@gmail.com']);
    console.log('✅ salihosmanli34@gmail.com admin yapıldı');
    
    const user = await pool.query('SELECT email, firstname, lastname, role FROM users WHERE email = $1', ['salihosmanli34@gmail.com']);
    console.log('Updated user:', user.rows[0]);
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
};

makeAdmin();