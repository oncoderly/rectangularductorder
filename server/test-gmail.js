// Gmail SMTP Test
require('dotenv').config();
const { sendPasswordResetOTP } = require('./email-gmail-simple');

async function testGmail() {
    console.log('🧪 Gmail SMTP Test Starting...');
    console.log('GMAIL_USER:', process.env.GMAIL_USER);
    console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET (length: ' + process.env.GMAIL_APP_PASSWORD.length + ')' : 'NOT SET');
    
    try {
        const result = await sendPasswordResetOTP(
            'salihosmanli34@gmail.com', // Test email
            '123456', // Test OTP
            'Test User' // Test name
        );
        
        console.log('📧 Email Result:', result);
        
        if (result.success) {
            console.log('✅ Gmail SMTP çalışıyor!');
        } else if (result.demo) {
            console.log('🎯 Demo mode aktif - Gmail ayarları eksik');
        } else {
            console.log('❌ Email gönderim hatası:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test hatası:', error.message);
    }
}

testGmail();