require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const checkAndUpdateAdmin = async () => {
  try {
    console.log('Checking for admin user...');
    
    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE email = $1', ['havakanalsiparis@gmail.com']);
    
    if (result.rows.length > 0) {
      console.log('✅ User found in PostgreSQL:');
      console.log(result.rows[0]);
      
      // Update role to admin
      await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', 'havakanalsiparis@gmail.com']);
      console.log('✅ Role updated to admin');
      
      // Verify update
      const updatedUser = await pool.query('SELECT email, firstname, lastname, role FROM users WHERE email = $1', ['havakanalsiparis@gmail.com']);
      console.log('Updated user:', updatedUser.rows[0]);
      
    } else {
      console.log('❌ User NOT found in PostgreSQL');
      
      // Show all users
      const allUsers = await pool.query('SELECT email, firstname, lastname, role FROM users');
      console.log('All users in database:');
      allUsers.rows.forEach(user => console.log(user));
    }
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
};

checkAndUpdateAdmin();