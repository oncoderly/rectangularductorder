// OAuth2 Token Alma Scripti - Manuel Kullanım
const { google } = require('googleapis');

// .env değerlerinizi buraya yazın
const OAUTH2_CLIENT_ID = 'your-client-id-here';
const OAUTH2_CLIENT_SECRET = 'your-client-secret-here';
const AUTH_CODE = 'buraya-url-deki-code-parametresini-yapistirin';

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