// Gmail SMTP Service with Nodemailer
const nodemailer = require('nodemailer');

// Gmail SMTP Provider Configuration
class GmailSMTPService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.senderEmail = null;
        this.init();
    }

    init() {
        // SMTP Credentials from environment variables
        const SMTP_USER = process.env.GMAIL_USER || process.env.SMTP_USER;
        const SMTP_PASSWORD = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;
        const SENDER_EMAIL = process.env.SENDER_EMAIL || SMTP_USER;
        
        // Gmail SMTP Server Configuration
        const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
        const SMTP_PORT = process.env.SMTP_PORT || 587;
        const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || false; // TLS
        
        if (!SMTP_USER || !SMTP_PASSWORD) {
            console.log('⚠️ SMTP yapılandırılmamış (SMTP_USER, SMTP_PASSWORD eksik)');
            console.log('📋 Gerekli environment variables:');
            console.log('   - GMAIL_USER veya SMTP_USER');
            console.log('   - GMAIL_APP_PASSWORD veya SMTP_PASSWORD'); 
            console.log('   - SENDER_EMAIL (isteğe bağlı)');
            return;
        }

        try {
            // Clean password (remove spaces from Gmail App Password)
            const cleanPassword = SMTP_PASSWORD.replace(/\s/g, '');
            
            // Create Nodemailer transporter with SMTP configuration
            this.transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: parseInt(SMTP_PORT),
                secure: SMTP_SECURE, // false for 587 (STARTTLS), true for 465 (SSL)
                auth: {
                    user: SMTP_USER,
                    pass: cleanPassword
                },
                // Gmail specific settings
                service: SMTP_HOST.includes('gmail.com') ? 'gmail' : undefined
            });
            
            this.senderEmail = SENDER_EMAIL;

            // Test SMTP connection
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ SMTP bağlantı hatası:', error.message);
                    console.log('🔧 SMTP Konfigürasyonu:');
                    console.log(`   Host: ${SMTP_HOST}`);
                    console.log(`   Port: ${SMTP_PORT}`);
                    console.log(`   Secure: ${SMTP_SECURE}`);
                    console.log(`   User: ${SMTP_USER}`);
                } else {
                    console.log(`✅ SMTP başarıyla yapılandırıldı (${SMTP_HOST}:${SMTP_PORT})`);
                    this.isConfigured = true;
                }
            });

        } catch (error) {
            console.error('❌ SMTP kurulum hatası:', error.message);
        }
    }

    async sendPasswordResetOTP(email, otp, userName = 'Kullanıcı') {
        if (!this.isConfigured) {
            console.log('🎯 DEMO MODE: SMTP yapılandırılmamış');
            console.log(`📧 ${email} adresine OTP gönderilecekti: ${otp}`);
            return { success: true, demo: true };
        }

        // Mail options for transporter.sendMail method
        const mailOptions = {
            from: `"Hava Kanalı Sipariş Sistemi" <${this.senderEmail}>`,
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
            // Send email using transporter.sendMail method
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Şifre sıfırlama OTP gönderildi: ${email}`);
            console.log(`📬 Message ID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ SMTP e-posta gönderme hatası:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendWelcomeEmail(email, userName = 'Kullanıcı') {
        if (!this.isConfigured) {
            console.log(`🎯 DEMO: ${email} adresine hoş geldin e-postası gönderilecekti`);
            return { success: true, demo: true };
        }

        // Welcome email mail options
        const mailOptions = {
            from: `"Hava Kanalı Sipariş Sistemi" <${this.senderEmail}>`,
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
            // Send welcome email using transporter.sendMail method
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Hoş geldin e-postası gönderildi: ${email}`);
            console.log(`📬 Message ID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Hoş geldin e-postası hatası:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Singleton SMTP Service instance
const smtpService = new GmailSMTPService();

module.exports = {
    smtpService,
    sendPasswordResetOTP: (email, otp, userName) => smtpService.sendPasswordResetOTP(email, otp, userName),
    sendWelcomeEmail: (email, userName) => smtpService.sendWelcomeEmail(email, userName)
};