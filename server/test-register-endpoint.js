// Test register endpoint directly
const axios = require('axios');

async function testRegister() {
    console.log('🧪 Testing register endpoint...');
    
    try {
        const response = await axios.post('https://rectangularductorder.onrender.com/api/register', {
            email: 'test' + Date.now() + '@example.com',
            password: 'Test123!',
            firstName: 'Test',
            lastName: 'User'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Register successful!');
        console.log('Response:', response.data);
        
    } catch (error) {
        console.error('❌ Register failed!');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data || error.message);
        
        // Get more details from the response
        if (error.response) {
            console.error('Response headers:', error.response.headers);
        }
    }
}

// Also test /api/me endpoint
async function testMe() {
    console.log('\n🧪 Testing /api/me endpoint...');
    
    try {
        const response = await axios.get('https://rectangularductorder.onrender.com/api/me');
        console.log('✅ /api/me successful!');
        console.log('Response:', response.data);
        
    } catch (error) {
        console.error('❌ /api/me failed!');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data || error.message);
    }
}

// Test both
testMe().then(() => testRegister());