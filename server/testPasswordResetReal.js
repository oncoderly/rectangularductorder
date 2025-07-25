// Gerçek password reset fonksiyonunu test et
const { sendPasswordResetEmail } = require('./sendEmail');
require('dotenv').config();

async function testPasswordReset() {
    console.log('🧪 Testing actual password reset function...');
    
    const testEmail = 'salihamz3101@gmail.com'; // users.json'daki diğer email
    const testToken = 'test-token-123456789';
    const testUserName = 'SALİH';
    
    try {
        const result = await sendPasswordResetEmail(testEmail, testToken, testUserName);
        
        console.log('✅ Result:', result);
        
        if (result.success) {
            console.log('✅ Password reset email sent successfully!');
            console.log('📧 Check your email:', testEmail);
        } else {
            console.log('❌ Password reset failed:', result.message);
            console.log('❌ Error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Exception:', error.message);
        console.error('❌ Stack:', error.stack);
    }
}

testPasswordReset();