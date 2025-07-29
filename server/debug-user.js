require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const debugUser = async () => {
  try {
    console.log('=== DEBUGGING USER ===');
    
    // Check all users
    const allUsers = await pool.query('SELECT email, firstname, lastname, role, googleid FROM users');
    console.log('All users in database:');
    allUsers.rows.forEach(user => {
      console.log(`- ${user.email}: role=${user.role}, googleId=${user.googleid ? 'SET' : 'NULL'}, name=${user.firstname} ${user.lastname}`);
    });
    
    // Check specifically for admin email
    const adminUser = await pool.query('SELECT * FROM users WHERE email = $1', ['havakanalsiparis@gmail.com']);
    console.log('\nAdmin user check:');
    if (adminUser.rows.length > 0) {
      console.log('✅ Admin user found:', adminUser.rows[0]);
    } else {
      console.log('❌ Admin user NOT found');
    }
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
};

debugUser();