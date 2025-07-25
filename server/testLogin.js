const axios = require('axios');

async function testLogin() {
    const loginData = {
        email: 'salihosmanli34@gmail.com',
        password: 'yourpassword' // Gerçek şifrenizi girin
    };
    
    console.log('🧪 Testing login with:', loginData.email);
    
    try {
        const response = await axios.post('http://localhost:5050/api/login', loginData, {
            withCredentials: true
        });
        
        console.log('✅ Login successful!');
        console.log('👤 User:', response.data.user);
        
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data?.error || error.message);
        console.error('📊 Status:', error.response?.status);
    }
}

testLogin();