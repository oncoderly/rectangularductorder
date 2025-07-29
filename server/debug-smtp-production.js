// Production SMTP Debug Test for Render.com
require('dotenv').config();

console.log('🔍 Production SMTP Debug Test');
console.log('===============================');

// Check all SMTP-related environment variables
const envVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SENDER_EMAIL',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD'
];

console.log('\n📋 Environment Variables Status:');
envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        if (varName.includes('PASSWORD')) {
            console.log(`✅ ${varName}: SET (length: ${value.length})`);
        } else {
            console.log(`✅ ${varName}: ${value}`);
        }
    } else {
        console.log(`❌ ${varName}: NOT SET`);
    }
});

// Test SMTP service configuration
console.log('\n🧪 Testing SMTP Service...');

try {
    const { smtpService } = require('./email-gmail-simple');
    
    console.log('\n📧 SMTP Service Status:');
    console.log('Is Configured:', smtpService.isConfigured);
    console.log('Sender Email:', smtpService.senderEmail);
    
    if (smtpService.isConfigured) {
        console.log('✅ SMTP Service is properly configured');
    } else {
        console.log('❌ SMTP Service is NOT configured - will run in DEMO mode');
    }
    
} catch (error) {
    console.error('❌ Error loading SMTP service:', error.message);
}

// Environment-specific instructions
console.log('\n📝 Render.com Environment Variables:');
console.log('Set these in Render.com dashboard:');
console.log('');
console.log('SMTP_HOST=smtp.gmail.com');
console.log('SMTP_PORT=587');  
console.log('SMTP_SECURE=false');
console.log('SMTP_USER=havakanalsiparis@gmail.com');
console.log('SMTP_PASSWORD=qumo dlhm npcg jjhn');
console.log('SENDER_EMAIL=havakanalsiparis@gmail.com');
console.log('');
console.log('Legacy compatibility (optional):');
console.log('GMAIL_USER=havakanalsiparis@gmail.com');
console.log('GMAIL_APP_PASSWORD=qumo dlhm npcg jjhn');