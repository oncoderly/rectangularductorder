// OAuth2 Token Alma Scripti - Manuel Kullanım
const { google } = require('googleapis');

// .env değerlerinizi buraya yazın
const OAUTH2_CLIENT_ID = '781991570845-o0a0radjv944bjo7utgmrfsca3ts78m2.apps.googleusercontent.com';
const OAUTH2_CLIENT_SECRET = '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';
const AUTH_CODE = 'BURAYA-ALDIGINIZ-KODU-YAPISTIRIN';

async function getToken() {
    try {
        const oauth2Client = new google.auth.OAuth2(
            OAUTH2_CLIENT_ID,
            OAUTH2_CLIENT_SECRET,
            'http://localhost:5050/auth/google/callback'
        );

        const { tokens } = await oauth2Client.getToken(AUTH_CODE);
        
        console.log('\n🎉 OAuth2 Refresh Token:');
        console.log(`OAUTH2_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\n📝 Bu satırı .env dosyanıza ekleyin!');
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
    }
}

getToken();