// SendGrid Sender Identity kontrol
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function checkSenderIdentity() {
    console.log('🔍 Checking sender identity verification...');
    
    // Farklı from adresleri ile test
    const testEmails = [
        'karekanalsiparisuygulamasi@yaani.com',
        'noreply@yourdomain.com', // Default fallback
        'test@sendgrid.net' // SendGrid test domain
    ];
    
    for (const fromEmail of testEmails) {
        try {
            console.log(`\n📧 Testing from: ${fromEmail}`);
            
            const msg = {
                to: 'salihosmanli34@gmail.com',
                from: fromEmail,
                subject: `Test from ${fromEmail}`,
                text: `Test email from ${fromEmail}`,
                html: `<p>Test email from <strong>${fromEmail}</strong></p>`
            };
            
            const response = await sgMail.send(msg);
            console.log(`✅ Success with ${fromEmail} - Status: ${response[0].statusCode}`);
            
        } catch (error) {
            console.log(`❌ Failed with ${fromEmail}:`);
            console.log(`   Error: ${error.message}`);
            
            if (error.response && error.response.body && error.response.body.errors) {
                error.response.body.errors.forEach(err => {
                    console.log(`   Detail: ${err.message}`);
                });
            }
        }
    }
}

checkSenderIdentity();