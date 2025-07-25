// SendGrid Guide'dan minimal test kodu
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// API Key set et
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'salihosmanli34@gmail.com', // Gerçek email adresin
  from: 'karekanalsiparisuygulamasi@yaani.com', // Verified sender identity
  subject: 'SendGrid Test Email',
  text: 'Hello plain world!',
  html: '<p>Hello HTML world!</p>',
};

console.log('🔑 API Key:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET');
console.log('📧 From:', msg.from);
console.log('📧 To:', msg.to);

sgMail
  .send(msg)
  .then((response) => {
    console.log('✅ Email sent!');
    console.log('📊 Status Code:', response[0].statusCode);
    console.log('📊 Headers:', response[0].headers);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Body:', JSON.stringify(error.response.body, null, 2));
    }
  });