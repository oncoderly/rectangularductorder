const axios = require('axios');

async function testEmailAuth() {
    try {
        const SERVER_URL = 'http://localhost:5050';
        
        console.log('🧪 Testing email authentication...');
        
        // Test login with existing email user
        const loginResponse = await axios.post(`${SERVER_URL}/api/login`, {
            email: 'Salihamz3101@gmail.com',
            password: 'www'
        }, {
            withCredentials: true,
            timeout: 10000
        });
        
        console.log('✅ Login successful:', {
            status: loginResponse.status,
            success: loginResponse.data.success,
            user: loginResponse.data.user?.email,
            message: loginResponse.data.message
        });
        
    } catch (error) {
        console.error('❌ Login failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            error: error.response?.data?.error
        });
    }
}

// Wait a bit for server to start, then test
setTimeout(testEmailAuth, 3000);