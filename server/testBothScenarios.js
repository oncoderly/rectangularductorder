const axios = require('axios');
require('dotenv').config();

async function testForgotPassword(email, description) {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📧 Email: ${email}`);
    
    try {
        const response = await axios.post('http://localhost:5050/api/forgot-password', {
            email: email
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Message:', response.data.message);
        
        // Kayıtlı kullanıcı için email gönderilir, rastgele için gönderilmez
        
    } catch (error) {
        console.error('❌ Error Status:', error.response?.status);
        console.error('❌ Error Data:', error.response?.data);
    }
}

async function runTests() {
    console.log('📋 Testing both scenarios...\n');
    
    // Test 1: Kayıtlı email
    await testForgotPassword('salihamz3101@gmail.com', 'Registered user');
    
    // Test 2: Rastgele email
    await testForgotPassword('randomuser@example.com', 'Random/Non-registered email');
    
    console.log('\n📝 Not: Her iki durumda da aynı mesaj döndürülür (güvenlik için)');
    console.log('📝 Ancak email sadece kayıtlı kullanıcıya gönderilir!');
}

runTests();