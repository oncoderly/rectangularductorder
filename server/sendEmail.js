const sgMail = require('@sendgrid/mail');
require('dotenv').config(); // .env dosyasını yükle

// SendGrid API Key'i .env dosyasından alın
// API key'i lazy olarak set et (fonksiyon çağrıldığında)
let isApiKeySet = false;

function ensureApiKey() {
    if (!isApiKeySet) {
        console.log('🔧 SendGrid API Key loading...');
        console.log('🔑 API Key exists:', !!process.env.SENDGRID_API_KEY);
        console.log('🔑 API Key starts with SG:', process.env.SENDGRID_API_KEY?.startsWith('SG.'));
        
        if (!process.env.SENDGRID_API_KEY) {
            console.error('❌ SENDGRID_API_KEY not found in environment variables!');
            console.error('🔍 Available env vars:', Object.keys(process.env).filter(k => k.includes('SEND')));
            console.error('🔍 NODE_ENV:', process.env.NODE_ENV);
            throw new Error('SENDGRID_API_KEY not configured');
        }
        
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        isApiKeySet = true;
        console.log('✅ SendGrid API Key configured successfully');
    }
}

const sendPasswordResetEmail = async (toEmail, resetToken, userName = '') => {
  try {
    // API key'i kontrol et ve set et
    ensureApiKey();
    
    // Debug bilgileri
    console.log('🔧 SendGrid Debug Info:');
    console.log('📧 To Email:', toEmail);
    console.log('🔑 API Key exists:', !!process.env.SENDGRID_API_KEY);
    console.log('📤 From Email:', process.env.SENDGRID_FROM_EMAIL);
    console.log('🌐 Client URL:', process.env.CLIENT_URL);
    
    // Reset link'i oluştur
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    console.log('🔗 Reset Link:', resetLink);

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com', // doğruladığınız adres
      subject: '[Hava Kanalı Sistemi] Şifre Sıfırlama Talebi',
      headers: {
        'List-Unsubscribe': '<mailto:karekanalsiparisuygulamasi@yaani.com>',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High'
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9fa;">
          <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="color: #667eea; margin: 0; font-size: 28px; font-weight: bold;">
                🏭 Hava Kanalı Sipariş Sistemi
              </h1>
              <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #667eea, #764ba2); margin: 15px auto; border-radius: 2px;"></div>
            </div>
            
            <!-- Title -->
            <h2 style="color: #2c3e50; text-align: center; margin-bottom: 30px; font-size: 22px;">
              🔐 Şifre Sıfırlama Talebi
            </h2>
            
            <!-- Content -->
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #667eea;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Merhaba${userName ? ' ' + userName : ''},
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Hava Kanalı Sipariş Sistemi hesabınız için şifre sıfırlama talebinde bulundunuz. 
                Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:
              </p>
              
              <!-- Reset Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 18px 40px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          display: inline-block; 
                          font-size: 16px;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                          transition: all 0.3s ease;">
                  🔑 ŞİFREMİ SIFIRLA
                </a>
              </div>
              
              <!-- Alternative Link -->
              <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                Eğer buton çalışmıyorsa, aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırabilirsiniz:
              </p>
              
              <div style="background-color: #e9ecef; padding: 15px; border-radius: 6px; margin-top: 10px; border: 1px dashed #ced4da;">
                <p style="color: #667eea; font-size: 13px; word-break: break-all; margin: 0; font-family: monospace;">
                  ${resetLink}
                </p>
              </div>
            </div>
            
            <!-- Important Notes -->
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h4 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">
                ⚠️ Önemli Güvenlik Bilgileri:
              </h4>
              <ul style="color: #856404; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
                <li>Bu bağlantı güvenlik nedeniyle <strong>30 dakika</strong> içinde geçerliliğini yitirecektir.</li>
                <li>Bağlantı sadece bir kez kullanılabilir.</li>
                <li>Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</li>
              </ul>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 2px solid #e9ecef; padding-top: 25px; text-align: center;">
              <p style="color: #999; font-size: 13px; line-height: 1.4; margin: 0 0 10px 0;">
                📧 Bu e-posta karekanalsiparisuygulamasi@yaani.com adresinden güvenli olarak gönderilmiştir.
              </p>
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
                Bu e-postayı istemiyorsanız: karekanalsiparisuygulamasi@yaani.com
              </p>
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2024 Hava Kanalı Sipariş Sistemi | Güvenli ve Hızlı Sipariş Yönetimi
              </p>
            </div>
            
          </div>
        </div>
      `,
    };

    console.log('📧 SendGrid: Şifre sıfırlama e-postası gönderiliyor...', toEmail);
    await sgMail.send(msg);
    console.log('✅ SendGrid: E-posta başarıyla gönderildi!');
    
    return { success: true, message: 'E-posta başarıyla gönderildi' };
  } catch (error) {
    console.error('❌ SendGrid: E-posta gönderme hatası:', error);
    
    // SendGrid hata detaylarını logla
    if (error.response) {
      console.error('SendGrid Response:', error.response.body);
    }
    
    return { 
      success: false, 
      message: 'E-posta gönderilirken hata oluştu',
      error: error.message 
    };
  }
};

const sendWelcomeEmail = async (toEmail, firstName) => {
  try {
    // API key'i kontrol et ve set et
    ensureApiKey();
    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com',
      subject: 'Hoş Geldiniz! - Hava Kanalı Sipariş Sistemi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">
              🎉 Hoş Geldiniz ${firstName}!
            </h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Hava Kanalı Sipariş Sistemi'ne başarıyla kayıt oldunuz. 
              Artık kolayca parça siparişi verebilir ve PDF raporları oluşturabilirsiniz.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">🔧 Neler Yapabilirsiniz?</h3>
              <ul style="color: #555; line-height: 1.8;">
                <li>15+ farklı hava kanalı parçası seçimi</li>
                <li>Detaylı ölçü ve seçenek girişi</li>
                <li>PDF sipariş raporu oluşturma</li>
                <li>WhatsApp ile kolay paylaşım</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}" 
                 style="background-color: #28a745; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block; font-size: 16px;">
                SİPARİŞE BAŞLA
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              📧 Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log('✅ SendGrid: Hoş geldin e-postası gönderildi!');
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid: Hoş geldin e-postası hatası:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};