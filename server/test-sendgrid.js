// SendGrid Test Scripti
require('dotenv').config();
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

console.log('🔧 SendGrid Test Başlıyor...');
console.log('API Key:', SENDGRID_API_KEY ? `${SENDGRID_API_KEY.substring(0, 10)}...` : 'YOK');
console.log('From Email:', EMAIL_FROM);

async function testSendGrid() {
    try {
        // API Key'i ayarla
        sgMail.setApiKey(SENDGRID_API_KEY);
        
        // Test e-postası gönder
        const msg = {
            to: 'sibaha5005@hadvar.com', // Test e-posta adresi
            from: 'salihosmanli34@gmail.com', // Direct email without name
            subject: 'TEST - SendGrid Bağlantı Testi',
            html: `
                <h2>🧪 SendGrid Test E-postası</h2>
                <p>Bu e-posta SendGrid bağlantısını test etmek için gönderildi.</p>
                <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
                <p>Eğer bu e-postayı alıyorsanız, SendGrid bağlantısı çalışıyor! ✅</p>
            `
        };
        
        console.log('📤 E-posta gönderiliyor...');
        await sgMail.send(msg);
        
        console.log('✅ BAŞARILI! SendGrid e-posta gönderildi');
        console.log('📧 E-posta adresi: sibaha5005@hadvar.com');
        console.log('📥 Inbox ve Spam klasörünü kontrol edin');
        
    } catch (error) {
        console.error('❌ SendGrid HATASI:', error.message);
        
        if (error.response) {
            console.error('📊 Hata Detayları:', error.response.body);
        }
    }
}

testSendGrid();