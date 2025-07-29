// Basit Gmail SMTP - App Password ile
const nodemailer = require('nodemailer');

// Gmail App Password ile e-posta gönderimi
class GmailSimple {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.init();
    }

    init() {
        const EMAIL_USER = process.env.GMAIL_USER; // Gmail adresiniz
        const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD; // Gmail App Password

        if (!EMAIL_USER || !GMAIL_APP_PASSWORD) {
            console.log('⚠️ Gmail SMTP yapılandırılmamış (GMAIL_USER, GMAIL_APP_PASSWORD eksik)');
            return;
        }

        try {
            this.transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: EMAIL_USER,
                    pass: GMAIL_APP_PASSWORD
                }
            });

            // Bağlantıyı test et
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ Gmail SMTP bağlantı hatası:', error.message);
                } else {
                    console.log('✅ Gmail SMTP başarıyla yapılandırıldı');
                    this.isConfigured = true;
                }
            });

        } catch (error) {
            console.error('❌ Gmail SMTP kurulum hatası:', error.message);
        }
    }

    async sendPasswordResetOTP(email, otp, userName = 'Kullanıcı') {
        if (!this.isConfigured) {
            console.log('🎯 DEMO MODE: Gmail SMTP yapılandırılmamış');
            console.log(`📧 ${email} adresine OTP gönderilecekti: ${otp}`);
            return { success: true, demo: true };
        }

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: '🔑 Şifre Sıfırlama Kodu - Hava Kanalı Sipariş Sistemi',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #667eea; margin-bottom: 10px;">🏭 Hava Kanalı Sipariş Sistemi</h1>
                            <h2 style="color: #2c3e50; margin-bottom: 20px;">🔑 Şifre Sıfırlama Kodu</h2>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                            <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                Merhaba <strong>${userName}</strong>,<br><br>
                                Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu kullanın:
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                           color: white; 
                                           font-size: 32px; 
                                           font-weight: bold; 
                                           padding: 20px; 
                                           border-radius: 10px; 
                                           letter-spacing: 8px;
                                           font-family: 'Courier New', monospace;">
                                    ${otp}
                                </div>
                            </div>
                            
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-top: 20px;">
                                <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
                                    ⏰ Bu kod 15 dakika geçerlidir
                                </p>
                            </div>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 20px;">
                                Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz.
                                Hesabınız güvende kalacaktır.
                            </p>
                        </div>
                        
                        <div style="text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e9ecef; padding-top: 20px;">
                            <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                            <p>© 2024 Hava Kanalı Sipariş Sistemi | Güvenli Şifre Sıfırlama</p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Şifre sıfırlama OTP gönderildi: ${email}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Gmail SMTP e-posta gönderme hatası:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendWelcomeEmail(email, userName = 'Kullanıcı') {
        if (!this.isConfigured) {
            console.log(`🎯 DEMO: ${email} adresine hoş geldin e-postası gönderilecekti`);
            return { success: true, demo: true };
        }

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: '🎉 Hoş Geldiniz - Hava Kanalı Sipariş Sistemi',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #667eea;">🏭 Hava Kanalı Sipariş Sistemi</h1>
                        <h2 style="color: #2c3e50;">🎉 Hoş Geldiniz!</h2>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 25px; border-radius: 10px;">
                        <p style="color: #2c3e50; font-size: 16px;">
                            Merhaba <strong>${userName}</strong>,<br><br>
                            Hesabınız başarıyla oluşturuldu! Artık sistemimizi kullanmaya başlayabilirsiniz.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.CLIENT_URL}" 
                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      text-decoration: none; 
                                      padding: 15px 30px; 
                                      border-radius: 8px; 
                                      font-weight: bold;">
                                🚀 Sisteme Giriş Yap
                            </a>
                        </div>
                    </div>
                    
                    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                        <p>© 2024 Hava Kanalı Sipariş Sistemi</p>
                    </div>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Hoş geldin e-postası gönderildi: ${email}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Hoş geldin e-postası hatası:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Singleton instance
const gmailService = new GmailSimple();

module.exports = {
    gmailService,
    sendPasswordResetOTP: (email, otp, userName) => gmailService.sendPasswordResetOTP(email, otp, userName),
    sendWelcomeEmail: (email, userName) => gmailService.sendWelcomeEmail(email, userName)
};