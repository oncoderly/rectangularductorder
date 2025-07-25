const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testSendGrid() {
    console.log('🔑 API Key:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET');
    console.log('📧 From Email:', process.env.SENDGRID_FROM_EMAIL);
    
    const msg = {
        to: 'test@example.com', // Test email
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'SendGrid Test',
        text: 'Test email from SendGrid',
        html: '<p>Test email from SendGrid</p>'
    };

    try {
        console.log('📤 Sending test email...');
        const response = await sgMail.send(msg);
        console.log('✅ SUCCESS:', response[0].statusCode);
        console.log('✅ Response:', response[0].headers);
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Body:', JSON.stringify(error.response.body, null, 2));
        }
    }
}

testSendGrid();