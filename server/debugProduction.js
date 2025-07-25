// Production environment debug
console.log('🔧 Production Environment Debug:');
console.log('================================');

console.log('📧 EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'NOT SET');
console.log('🔑 SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
console.log('📤 SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || 'NOT SET');
console.log('🌐 CLIENT_URL:', process.env.CLIENT_URL || 'NOT SET');
console.log('🏭 NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

// Eğer hiçbiri yoksa .env yükle
if (!process.env.SENDGRID_API_KEY) {
    console.log('\n🔄 Loading .env file...');
    require('dotenv').config();
    
    console.log('📧 EMAIL_SERVICE (after .env):', process.env.EMAIL_SERVICE || 'STILL NOT SET');
    console.log('🔑 SENDGRID_API_KEY exists (after .env):', !!process.env.SENDGRID_API_KEY);
    console.log('📤 SENDGRID_FROM_EMAIL (after .env):', process.env.SENDGRID_FROM_EMAIL || 'STILL NOT SET');
}

console.log('\n🎯 Status:');
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    console.log('✅ SendGrid configuration looks good!');
} else {
    console.log('❌ SendGrid configuration is missing!');
    console.log('💡 Add environment variables to Render dashboard');
}