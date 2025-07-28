const sgMail = require('@sendgrid/mail');
const { sendPasswordResetEmail } = require('./sendEmail');
require('dotenv').config();

console.log('🔍 SendGrid Debug Analysis Started...\n');

// 1. Environment Variables Kontrolü
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('🔑 SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
console.log('📤 SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || 'NOT SET');
console.log('🌐 CLIENT_URL:', process.env.CLIENT_URL || 'NOT SET');
console.log('📧 EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'NOT SET');

if (process.env.SENDGRID_API_KEY) {
    console.log('🔑 API Key format:', process.env.SENDGRID_API_KEY.startsWith('SG.') ? 'CORRECT (SG.*)' : 'WRONG FORMAT');
    console.log('🔑 API Key length:', process.env.SENDGRID_API_KEY.length);
}

console.log('\n=== POTENTIAL ISSUES ANALYSIS ===');

// 2. Common SendGrid Issues Check
const issues = [];

if (!process.env.SENDGRID_API_KEY) {
    issues.push('❌ SENDGRID_API_KEY is not set in environment variables');
}

if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    issues.push('❌ SENDGRID_API_KEY does not start with SG. - Invalid format');
}

if (!process.env.SENDGRID_FROM_EMAIL) {
    issues.push('❌ SENDGRID_FROM_EMAIL is not set - Required for sending emails');
}

if (process.env.SENDGRID_FROM_EMAIL && !process.env.SENDGRID_FROM_EMAIL.includes('@')) {
    issues.push('❌ SENDGRID_FROM_EMAIL is not a valid email format');
}

if (!process.env.CLIENT_URL) {
    issues.push('❌ CLIENT_URL is not set - Reset links will be broken');
}

if (process.env.EMAIL_SERVICE !== 'sendgrid') {
    issues.push(`⚠️ EMAIL_SERVICE is '${process.env.EMAIL_SERVICE}' - Should be 'sendgrid' for SendGrid to work`);
}

if (issues.length === 0) {
    console.log('✅ No configuration issues found');
} else {
    console.log('Found', issues.length, 'issue(s):');
    issues.forEach(issue => console.log(issue));
}

// 3. SendGrid API Test
console.log('\n=== SENDGRID API TEST ===');

async function testSendGridAPI() {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        console.log('❌ Cannot test API - Missing required environment variables');
        return;
    }

    try {
        console.log('🧪 Testing SendGrid API connection...');
        
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        // Test email message
        const testMsg = {
            to: 'test@example.com', // SendGrid test email
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'SendGrid Test - Do Not Deliver',
            text: 'This is a test email to check SendGrid configuration.',
            html: '<p>This is a test email to check SendGrid configuration.</p>',
            mail_settings: {
                sandbox_mode: {
                    enable: true // Sandbox mode - won't actually send
                }
            }
        };

        console.log('📧 Sending test email in sandbox mode...');
        const response = await sgMail.send(testMsg);
        console.log('✅ SendGrid API test successful!');
        console.log('📊 Response status:', response[0].statusCode);
        
    } catch (error) {
        console.log('❌ SendGrid API test failed:');
        console.log('Error:', error.message);
        
        if (error.response) {
            console.log('Status Code:', error.response.status);
            console.log('Response Body:', JSON.stringify(error.response.body, null, 2));
            
            // Common error analysis
            if (error.response.status === 401) {
                console.log('💡 SOLUTION: API Key is invalid or expired');
            } else if (error.response.status === 403) {
                console.log('💡 SOLUTION: API Key does not have mail send permissions');
            } else if (error.response.status === 400) {
                console.log('💡 SOLUTION: Check from email - it might not be verified');
            }
        }
    }
}

// 4. Password Reset Email Test
console.log('\n=== PASSWORD RESET EMAIL TEST ===');

async function testPasswordResetEmail() {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        console.log('❌ Cannot test password reset email - Missing required environment variables');
        return;
    }

    try {
        console.log('🧪 Testing password reset email function...');
        
        const testEmail = 'test@example.com';
        const testToken = 'test-reset-token-123';
        const testUserName = 'Test User';
        
        console.log('📧 Calling sendPasswordResetEmail function...');
        const result = await sendPasswordResetEmail(testEmail, testToken, testUserName);
        
        if (result.success) {
            console.log('✅ Password reset email function works correctly');
        } else {
            console.log('❌ Password reset email function failed:', result.message);
            console.log('Error details:', result.error);
        }
        
    } catch (error) {
        console.log('❌ Password reset email test failed:');
        console.log('Error:', error.message);
    }
}

// 5. Domain and DNS Check
console.log('\n=== DOMAIN VERIFICATION CHECK ===');

function checkDomainIssues() {
    if (!process.env.SENDGRID_FROM_EMAIL) {
        console.log('❌ Cannot check domain - SENDGRID_FROM_EMAIL not set');
        return;
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const domain = fromEmail.split('@')[1];
    
    console.log('📧 From Email:', fromEmail);
    console.log('🌐 Domain:', domain);
    
    console.log('\n💡 COMMON DOMAIN ISSUES TO CHECK:');
    console.log('1. Domain must be verified in SendGrid dashboard');
    console.log('2. Single Sender Verification must be completed');
    console.log('3. SPF, DKIM records should be configured (for custom domains)');
    console.log('4. Check if domain is in SendGrid suppression list');
    
    if (domain === 'gmail.com' || domain === 'yahoo.com' || domain === 'hotmail.com') {
        console.log('⚠️ WARNING: Using free email domain - may have delivery issues');
        console.log('💡 RECOMMENDATION: Use a custom domain or SendGrid verified domain');
    }
}

// Run all tests
async function runAllTests() {
    checkDomainIssues();
    await testSendGridAPI();
    await testPasswordResetEmail();
    
    console.log('\n=== FINAL RECOMMENDATIONS ===');
    console.log('1. ✅ Check SendGrid dashboard for domain verification status');
    console.log('2. ✅ Verify Single Sender identity in SendGrid');
    console.log('3. ✅ Check SendGrid Activity Feed for email delivery status');
    console.log('4. ✅ Review SendGrid suppression lists (bounces, blocks, spam reports)');
    console.log('5. ✅ Ensure EMAIL_SERVICE=sendgrid in .env file');
    console.log('6. ✅ Test with a different email address');
    console.log('7. ✅ Check spam folder in recipient email');
    
    console.log('\n🔍 Debug Analysis Complete!');
}

runAllTests().catch(error => {
    console.error('Debug script failed:', error);
});