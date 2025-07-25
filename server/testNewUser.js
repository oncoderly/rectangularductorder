const axios = require('axios');

async function testNewUserFlow() {
    const testUser = {
        email: `test${Date.now()}@example.com`,
        password: 'test123456',
        firstName: 'Test',
        lastName: 'User'
    };
    
    console.log('🧪 Testing new user registration and login flow...');
    console.log('📧 Test user email:', testUser.email);
    
    try {
        // 1. Register new user
        console.log('\n1️⃣ Registering new user...');
        const registerResponse = await axios.post('http://localhost:5050/api/register', testUser, {
            withCredentials: true
        });
        console.log('✅ Registration successful:', registerResponse.data.message);
        console.log('👤 User created:', registerResponse.data.user);
        
        // 2. Login with new user
        console.log('\n2️⃣ Testing login with new user...');
        const loginResponse = await axios.post('http://localhost:5050/api/login', {
            email: testUser.email,
            password: testUser.password
        }, {
            withCredentials: true
        });
        console.log('✅ Login successful!');
        console.log('👤 Logged in user:', loginResponse.data.user);
        
        // 3. Test password reset
        console.log('\n3️⃣ Testing password reset...');
        const forgotResponse = await axios.post('http://localhost:5050/api/forgot-password', {
            email: testUser.email
        });
        console.log('✅ Password reset requested:', forgotResponse.data.message);
        
        console.log('\n🎉 All tests passed! Database system is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.error || error.message);
        console.error('📊 Status:', error.response?.status);
    }
}

testNewUserFlow();