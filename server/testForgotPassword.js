const axios = require('axios');
require('dotenv').config();

async function testForgotPassword() {
    try {
        const response = await axios.post('http://localhost:5050/api/forgot-password', {
            email: 'salihosmanli34@gmail.com' // Kayıtlı email
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Data:', response.data);
    } catch (error) {
        console.error('❌ Error Status:', error.response?.status);
        console.error('❌ Error Data:', error.response?.data);
        console.error('❌ Error Message:', error.message);
    }
}

console.log('🧪 Testing forgot password endpoint...');
testForgotPassword();