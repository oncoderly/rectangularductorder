// Debug script to test Google login flow
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Test database connection
async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
        const databaseModule = require('./database-selector');
        console.log('✅ Database module loaded');
        
        await databaseModule.waitForInit();
        console.log('✅ Database initialization completed');
        
        const { userDB } = databaseModule;
        console.log('✅ userDB available:', !!userDB);
        
        if (userDB) {
            const userCount = await userDB.getUserCount();
            console.log('✅ User count:', userCount);
            
            const users = await userDB.getAllUsers();
            console.log('✅ Users loaded:', users.length);
            
            if (users.length > 0) {
                console.log('✅ Sample user:', {
                    id: users[0].id,
                    email: users[0].email,
                    role: users[0].role
                });
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Test session store
async function testSessionStore() {
    console.log('🔍 Testing session store...');
    
    try {
        if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
            const { Pool } = require('pg');
            const testPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            
            const client = await testPool.connect();
            await client.query('SELECT 1');
            client.release();
            testPool.end();
            
            const sessionStore = new pgSession({
                conObject: {
                    connectionString: process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                },
                tableName: 'sessions'
            });
            
            console.log('✅ PostgreSQL session store configured');
            return true;
        } else {
            console.log('✅ Using memory session store (development)');
            return true;
        }
    } catch (error) {
        console.error('❌ Session store configuration failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Test Google OAuth configuration
function testGoogleOAuth() {
    console.log('🔍 Testing Google OAuth configuration...');
    
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5050';
    
    console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('SERVER_URL:', SERVER_URL);
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('❌ Google OAuth not configured');
        return false;
    }
    
    console.log('✅ Google OAuth configuration looks good');
    return true;
}

// Test Passport serialization
async function testPassportSerialization() {
    console.log('🔍 Testing Passport serialization...');
    
    try {
        const databaseModule = require('./database-selector');
        await databaseModule.waitForInit();
        const { userDB } = databaseModule;
        
        // Test with a sample user
        const users = await userDB.getAllUsers();
        if (users.length > 0) {
            const testUser = users[0];
            console.log('✅ Testing with user:', testUser.email);
            
            // Test serialization
            const serialized = testUser.id;
            console.log('✅ Serialized user ID:', serialized);
            
            // Test deserialization
            const deserialized = await userDB.getUserById(serialized);
            console.log('✅ Deserialized user:', deserialized ? deserialized.email : 'null');
            
            return true;
        } else {
            console.log('⚠️ No users found for testing');
            return true;
        }
    } catch (error) {
        console.error('❌ Passport serialization test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Main test function
async function runAllTests() {
    console.log('🚀 Starting Google login debug tests...');
    console.log('=====================================');
    
    const results = {
        database: await testDatabaseConnection(),
        sessionStore: await testSessionStore(),
        googleOAuth: testGoogleOAuth(),
        passportSerialization: await testPassportSerialization()
    };
    
    console.log('\n📊 Test Results:');
    console.log('================');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (!allPassed) {
        console.log('\n🔧 Recommendations:');
        if (!results.database) {
            console.log('- Check DATABASE_URL environment variable');
            console.log('- Verify PostgreSQL connection');
        }
        if (!results.sessionStore) {
            console.log('- Check session store configuration');
            console.log('- Verify sessions table exists');
        }
        if (!results.googleOAuth) {
            console.log('- Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
        }
        if (!results.passportSerialization) {
            console.log('- Check userDB.getUserById function');
            console.log('- Verify database user data');
        }
    }
}

// Run tests
runAllTests().catch(console.error); 