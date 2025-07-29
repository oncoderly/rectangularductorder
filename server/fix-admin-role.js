require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const fixAdminRole = async () => {
  try {
    console.log('Fixing admin roles...');
    
    // Update both users to admin
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', 'havakanalsiparis@gmail.com']);
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', 'salihosmanli34@gmail.com']);
    
    console.log('✅ Both users updated to admin');
    
    // Verify updates
    const users = await pool.query('SELECT email, firstname, lastname, role FROM users WHERE email IN ($1, $2)', 
      ['havakanalsiparis@gmail.com', 'salihosmanli34@gmail.com']);
    
    console.log('Updated users:');
    users.rows.forEach(user => console.log(`- ${user.email}: ${user.role}`));
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
};

fixAdminRole();