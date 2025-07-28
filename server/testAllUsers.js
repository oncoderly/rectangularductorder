const axios = require('axios');
const { userDB } = require('./database');
console.log('🔍 userDB var mı?', typeof userDB?.createUser);

async function testAllUsers() {
    console.log('🧪 Testing password reset for all users...\n');
    
    // Tüm kullanıcıları al
    const users = userDB.getAllUsers();
    console.log(`👥 Found ${users.length} users in database\n`);
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        console.log(`${i + 1}. Testing user: ${user.email}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   ID: ${user.id}`);
        
        try {
            const response = await axios.post('http://localhost:5050/api/forgot-password', {
                email: user.email
            });
            
            console.log(`   ✅ API Response: ${response.data.message}`);
            console.log(`   📧 Check email: ${user.email}\n`);
            
            // 2 saniye bekle
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.response?.data?.error || error.message}\n`);
        }
    }
    
    console.log('🎯 Test completed! Check each email address for password reset emails.');
    console.log('💡 If some emails didn\'t arrive, they might be in SendGrid suppression list.');
}

testAllUsers();