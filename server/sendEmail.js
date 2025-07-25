const sgMail = require('@sendgrid/mail');

// SendGrid API Key'i .env dosyasından alın
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendPasswordResetEmail = async (toEmail, resetToken) => {
  try {
    // Reset link'i oluştur
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com', // doğruladığınız adres
      subject: 'Şifre Sıfırlama Talebi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">
              🔐 Şifre Sıfırlama Talebi
            </h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Merhaba,
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Hava Kanalı Sipariş Sistemi hesabınız için şifre sıfırlama talebinde bulundunuz. 
              Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #3498db; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block; font-size: 16px;">
                ŞİFREMİ SIFIRLA
              </a>
            </div>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:
            </p>
            
            <p style="color: #3498db; font-size: 14px; word-break: break-all; 
                      background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
              ${resetLink}
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="color: #999; font-size: 12px; line-height: 1.4;">
                ⚠️ <strong>Önemli:</strong> Bu bağlantı güvenlik nedeniyle <strong>30 dakika</strong> içinde geçerliliğini yitirecektir.
              </p>
              
              <p style="color: #999; font-size: 12px; line-height: 1.4;">
                Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz. 
                Hesabınız güvende kalacaktır.
              </p>
              
              <p style="color: #999; font-size: 12px; line-height: 1.4; margin-top: 20px; text-align: center;">
                📧 Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.
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