// Gmail Debug Test
require('dotenv').config();
const nodemailer = require('nodemailer');

async function debugGmail() {
    console.log('🔍 Gmail Debug Test');
    console.log('================');
    
    const EMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    
    console.log('📧 Email:', EMAIL_USER);
    console.log('🔑 App Password Length:', GMAIL_APP_PASSWORD ? GMAIL_APP_PASSWORD.length : 'NOT SET');
    console.log('🔑 App Password First 4 chars:', GMAIL_APP_PASSWORD ? GMAIL_APP_PASSWORD.substring(0, 4) + '...' : 'NOT SET');
    
    if (!EMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.log('❌ Credentials missing!');
        return;
    }
    
    // Test different auth configurations
    console.log('\n🧪 Testing Gmail SMTP connection...');
    
    try {
        // Remove spaces from app password
        const cleanPassword = GMAIL_APP_PASSWORD.replace(/\s/g, '');
        console.log('🧹 Cleaned Password Length:', cleanPassword.length);
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: cleanPassword
            }
        });
        
        console.log('📨 Testing connection...');
        await transporter.verify();
        console.log('✅ Gmail SMTP connection successful!');
        
        // Send test email
        console.log('📤 Sending test email...');
        const info = await transporter.sendMail({
            from: EMAIL_USER,
            to: 'salihosmanli34@gmail.com', // Replace with your test email
            subject: '🧪 Gmail SMTP Test',
            text: 'Bu bir test emailidir. Gmail SMTP çalışıyor!',
            html: '<p>Bu bir test emailidir. <b>Gmail SMTP çalışıyor!</b></p>'
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('📬 Message ID:', info.messageId);
        
    } catch (error) {
        console.error('❌ Gmail SMTP Error:', error.message);
        
        if (error.message.includes('Invalid login')) {
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Gmail hesabında 2FA aktif mi?');
            console.log('2. App Password doğru oluşturuldu mu?');
            console.log('3. App Password kopyalarken boşluk kaldı mı?');
            console.log('4. Hesap güvenlik ayarları "Less secure app access" kapalı mı?');
        }
    }
}

debugGmail();