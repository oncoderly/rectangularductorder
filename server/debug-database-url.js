// Debug DATABASE_URL kullanımı
console.log('🔍 DATABASE_URL DEBUG:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('USE_POSTGRESQL:', process.env.USE_POSTGRESQL);

// Load .env file
require('dotenv').config();
console.log('\n🔍 AFTER DOTENV:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Test what database-selector.js sees
const databaseModule = require('./database-selector');
console.log('\n🔍 DATABASE SELECTOR:');
console.log('isPostgreSQL:', databaseModule.isPostgreSQL);

setTimeout(() => {
    console.log('\n🔍 AFTER TIMEOUT:');
    console.log('Final DB type:', databaseModule.isPostgreSQL ? 'PostgreSQL' : 'SQLite');
}, 3000);