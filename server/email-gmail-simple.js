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

            // Test SMTP connection (async)
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ SMTP bağlantı hatası:', error.message);
                    console.log('🔧 SMTP Konfigürasyonu:');
                    console.log(`   Host: ${SMTP_HOST}`);
                    console.log(`   Port: ${SMTP_PORT}`);
                    console.log(`   Secure: ${SMTP_SECURE}`);
                    console.log(`   User: ${SMTP_USER}`);
                    this.isConfigured = false;
                } else {
                    console.log(`✅ SMTP başarıyla yapılandırıldı (${SMTP_HOST}:${SMTP_PORT})`);
                    this.isConfigured = true;
                }
            });
            
            // Set as configured for immediate use (verify runs in background)
            this.isConfigured = true;

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
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Şifre Sıfırlama</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            background-color: #f8fafc;
                            color: #334155;
                        }
                        
                        .email-container {
                            max-width: 600px;
                            margin: 40px auto;
                            background: #ffffff;
                            border-radius: 16px;
                            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                            overflow: hidden;
                        }
                        
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-align: center;
                            padding: 40px 30px;
                        }
                        
                        .header-icon {
                            font-size: 48px;
                            margin-bottom: 16px;
                            display: block;
                        }
                        
                        .header h1 {
                            font-size: 28px;
                            font-weight: 600;
                            margin-bottom: 8px;
                        }
                        
                        .header p {
                            font-size: 16px;
                            opacity: 0.9;
                        }
                        
                        .content {
                            padding: 40px 30px;
                        }
                        
                        .greeting {
                            font-size: 18px;
                            font-weight: 500;
                            margin-bottom: 24px;
                            color: #1e293b;
                        }
                        
                        .message {
                            font-size: 16px;
                            margin-bottom: 32px;
                            color: #475569;
                            line-height: 1.7;
                        }
                        
                        .code-section {
                            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            padding: 24px;
                            text-align: center;
                            margin: 32px 0;
                            position: relative;
                        }
                        
                        .code-section::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            height: 4px;
                            background: linear-gradient(90deg, #667eea, #764ba2);
                            border-radius: 12px 12px 0 0;
                        }
                        
                        .code-label {
                            font-size: 14px;
                            color: #64748b;
                            font-weight: 500;
                            margin-bottom: 12px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .verification-code {
                            font-size: 36px;
                            font-weight: 700;
                            color: #1e293b;
                            letter-spacing: 8px;
                            font-family: 'Courier New', monospace;
                            background: white;
                            padding: 16px 24px;
                            border-radius: 8px;
                            border: 2px solid #e2e8f0;
                            display: inline-block;
                            margin: 8px 0;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        }
                        
                        .expiry-notice {
                            background: #fef3c7;
                            border: 1px solid #f59e0b;
                            border-radius: 8px;
                            padding: 16px;
                            margin: 24px 0;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        }
                        
                        .expiry-notice .icon {
                            font-size: 20px;
                            color: #d97706;
                        }
                        
                        .expiry-notice .text {
                            color: #92400e;
                            font-size: 14px;
                            font-weight: 500;
                        }
                        
                        .security-note {
                            background: #f0f9ff;
                            border: 1px solid #0ea5e9;
                            border-radius: 8px;
                            padding: 16px;
                            margin: 24px 0;
                            font-size: 14px;
                            color: #0c4a6e;
                        }
                        
                        .cta-button {
                            display: inline-block;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            padding: 14px 28px;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 16px;
                            margin: 20px 0;
                            transition: transform 0.2s ease, box-shadow 0.2s ease;
                            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                        }
                        
                        .cta-button:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                        }
                        
                        .footer {
                            background: #f8fafc;
                            padding: 30px;
                            text-align: center;
                            border-top: 1px solid #e2e8f0;
                        }
                        
                        .footer p {
                            font-size: 14px;
                            color: #64748b;
                            margin-bottom: 8px;
                        }
                        
                        .footer .company {
                            font-weight: 600;
                            color: #1e293b;
                        }
                        
                        .divider {
                            height: 1px;
                            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
                            margin: 24px 0;
                        }
                        
                        @media (max-width: 600px) {
                            .email-container {
                                margin: 20px;
                                border-radius: 12px;
                            }
                            
                            .header, .content, .footer {
                                padding: 24px 20px;
                            }
                            
                            .verification-code {
                                font-size: 28px;
                                letter-spacing: 4px;
                                padding: 12px 16px;
                            }
                            
                            .header h1 {
                                font-size: 24px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <span class="header-icon">🔒</span>
                            <h1>Şifre Sıfırlama</h1>
                            <p>Güvenli giriş sistemi</p>
                        </div>
                        
                        <div class="content">
                            <div class="greeting">
                                Merhaba ${userName},
                            </div>
                            
                            <div class="message">
                                Hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu kullanın:
                            </div>
                            
                            <div class="code-section">
                                <div class="code-label">Doğrulama Kodu</div>
                                <div class="verification-code">${otp}</div>
                            </div>
                            
                            <div class="expiry-notice">
                                <span class="icon">⏰</span>
                                <span class="text">Bu kod 15 dakika geçerlidir</span>
                            </div>
                            
                            <div class="security-note">
                                <strong>Güvenlik İpucu:</strong> Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz. Hesabınız güvende kalacaktır.
                            </div>
                            
                            <div class="divider"></div>
                            
                            <div class="message">
                                Alternatif olarak, aşağıdaki butona tıklayarak doğrudan şifre sıfırlama sayfasına gidebilirsiniz:
                            </div>
                            
                            <center>
                                <a href="${process.env.CLIENT_URL || 'https://rectangularductorder.onrender.com'}?forgot=true" class="cta-button">Şifreyi Sıfırla</a>
                            </center>
                        </div>
                        
                        <div class="footer">
                            <p class="company">Hava Kanalı Sipariş Sistemi</p>
                            <p>© 2024 Güvenli Şifre Sıfırlama Sistemi</p>
                            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
                        </div>
                    </div>
                </body>
                </html>
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