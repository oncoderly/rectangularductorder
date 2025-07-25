const axios = require('axios');

async function testWithServerRunning() {
    console.log('🧪 Testing forgot password with server running...');
    
    // Kayıtlı bir email ile test
    const testEmail = 'salihamz3101@gmail.com';
    
    try {
        console.log(`📧 Testing with registered email: ${testEmail}`);
        
        const response = await axios.post('http://localhost:5050/api/forgot-password', {
            email: testEmail
        });
        
        console.log('✅ API Response Status:', response.status);
        console.log('✅ API Response:', response.data);
        console.log('\n📋 Check server logs for SendGrid details...');
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Data:', error.response.data);
        }
    }
}

// Biraz bekle server başlasın diye
setTimeout(testWithServerRunning, 2000);