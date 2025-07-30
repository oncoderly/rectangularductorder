const axios = require('axios');

async function testSimpleLogin() {
    try {
        const SERVER_URL = 'http://localhost:5050';
        
        console.log('🧪 Testing simple GET request first...');
        
        // Test if server is responsive
        const healthResponse = await axios.get(`${SERVER_URL}/api/health`, {
            timeout: 5000
        });
        
        console.log('✅ Health check successful:', healthResponse.status);
        
        // Now test login
        console.log('🧪 Testing login...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/login`, {
            email: 'Salihamz3101@gmail.com',
            password: 'www'
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Login successful:', {
            status: loginResponse.status,
            data: loginResponse.data
        });
        
    } catch (error) {
        console.error('❌ Test failed:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

// Wait for server startup, then test
setTimeout(testSimpleLogin, 5000);