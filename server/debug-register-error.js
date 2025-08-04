// Debug register endpoint error
require('dotenv').config({ path: '../.env' });

console.log('🔍 DEBUGGING REGISTER ERROR');

// Test database initialization
console.log('\n1. Testing database initialization...');
try {
    const databaseModule = require('./database-selector');
    console.log('✅ Database module loaded');
    
    setTimeout(async () => {
        try {
            await databaseModule.waitForInit();
            console.log('✅ Database initialized');
            console.log('Database type:', databaseModule.isPostgreSQL ? 'PostgreSQL' : 'Other');
            console.log('userDB exists:', !!databaseModule.userDB);
            
            if (databaseModule.userDB) {
                console.log('Testing userDB.createUser function...');
                console.log('createUser function exists:', typeof databaseModule.userDB.createUser);
                
                // Test user count
                const count = await databaseModule.userDB.getUserCount();
                console.log('Current user count:', count);
            }
            
        } catch (error) {
            console.error('❌ Database error:', error.message);
        }
    }, 3000);
    
} catch (error) {
    console.error('❌ Failed to load database module:', error.message);
    console.error('Error stack:', error.stack);
}

// Test if bcrypt is working
console.log('\n2. Testing bcrypt...');
try {
    const bcrypt = require('bcryptjs');
    console.log('✅ bcrypt loaded');
    
    bcrypt.hash('test123', 10, (err, hash) => {
        if (err) {
            console.error('❌ bcrypt error:', err.message);
        } else {
            console.log('✅ bcrypt working - hash length:', hash.length);
        }
    });
} catch (error) {
    console.error('❌ bcrypt load error:', error.message);
}

// Test if server can start (just the basic requirements)
console.log('\n3. Testing basic server requirements...');
try {
    const express = require('express');
    console.log('✅ express loaded');
    const session = require('express-session');
    console.log('✅ express-session loaded');
} catch (error) {
    console.error('❌ Server requirements error:', error.message);
}