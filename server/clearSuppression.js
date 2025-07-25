// SendGrid Suppression listesini temizleme
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function clearSuppressionList() {
    console.log('🧹 Clearing SendGrid suppression lists...');
    
    const emailToClear = 'salihosmanli34@gmail.com';
    
    try {
        // Invalid emails suppression'ı temizle
        const client = sgMail.client;
        
        console.log(`🗑️ Removing ${emailToClear} from Invalid Emails suppression...`);
        
        const request = {
            url: `/v3/suppression/invalid_emails`,
            method: 'DELETE',
            body: {
                emails: [emailToClear]
            }
        };
        
        const response = await client.request(request);
        console.log('✅ Suppression cleared successfully!');
        console.log('📊 Response:', response[1]);
        
        // Şimdi test emaili gönder
        console.log('\n📧 Sending test email to cleared address...');
        
        const msg = {
            to: emailToClear,
            from: 'karekanalsiparisuygulamasi@yaani.com',
            subject: 'Test After Suppression Clear',
            text: 'This email was sent after clearing suppression list',
            html: '<p>This email was sent after clearing suppression list ✅</p>'
        };
        
        const emailResponse = await sgMail.send(msg);
        console.log('✅ Test email sent!');
        console.log('📊 Status:', emailResponse[0].statusCode);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Body:', JSON.stringify(error.response.body, null, 2));
        }
    }
}

clearSuppressionList();