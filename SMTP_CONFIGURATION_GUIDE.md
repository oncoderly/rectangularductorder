# SMTP Email Service Configuration Guide

This guide explains how to configure SMTP email service using Nodemailer for password reset and welcome email functionality.

## 📧 SMTP Provider Setup

### **Nodemailer Transporter Configuration**

The email service uses Nodemailer library with SMTP provider. A transporter object is created with the following configuration:

```javascript
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,        // SMTP server name
    port: SMTP_PORT,        // Port number (587 for TLS, 465 for SSL)
    secure: SMTP_SECURE,    // false for TLS, true for SSL
    auth: {
        user: SMTP_USER,    // Username (email address)
        pass: SMTP_PASSWORD // Password (App Password for Gmail)
    }
});
```

### **Environment Variables**

Configure these variables in your `.env` file:

```env
# SMTP Email Service Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=your-email@gmail.com
```

## 🔧 SMTP Provider Options

### **1. Gmail SMTP (Recommended - Free)**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
SENDER_EMAIL=your-gmail@gmail.com
```

**Requirements:**
- Gmail account with 2-Factor Authentication enabled
- App Password generated from Google Account settings
- Daily limit: 500 emails

### **2. Outlook/Hotmail SMTP**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
SENDER_EMAIL=your-email@outlook.com
```

### **3. Other SMTP Providers**
```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=your-smtp-password
SENDER_EMAIL=noreply@your-domain.com
```

## 📨 Email Sending Implementation

### **Mail Options Object**

The `transporter.sendMail()` method uses mail options with these parameters:

```javascript
const mailOptions = {
    from: '"Company Name" <sender@domain.com>',  // Sender (from)
    to: 'recipient@domain.com',                  // Recipient (to)
    subject: 'Email Subject',                    // Subject line
    text: 'Plain text content',                  // Plain text body
    html: '<p>HTML content</p>'                  // HTML body
};
```

### **Sending Password Reset OTP**

```javascript
async function sendPasswordResetOTP(email, otp, userName) {
    const mailOptions = {
        from: `"Hava Kanalı Sipariş Sistemi" <${SENDER_EMAIL}>`,
        to: email,
        subject: '🔑 Şifre Sıfırlama Kodu',
        html: `
            <div style="font-family: Arial, sans-serif;">
                <h2>Şifre Sıfırlama Kodu</h2>
                <p>Merhaba ${userName},</p>
                <p>Şifre sıfırlama kodunuz: <strong>${otp}</strong></p>
                <p>Bu kod 15 dakika geçerlidir.</p>
            </div>
        `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Message ID:', info.messageId);
}
```

## 🔒 Security Configuration

### **SMTP Authentication**
- **Username (SMTP_USER):** Email address used for authentication
- **Password (SMTP_PASSWORD):** 
  - Gmail: 16-digit App Password (spaces automatically removed)
  - Other providers: Account password or app-specific password

### **Connection Security**
- **Port 587 + SMTP_SECURE=false:** STARTTLS (recommended)
- **Port 465 + SMTP_SECURE=true:** SSL/TLS
- **Port 25:** Unencrypted (not recommended)

### **Gmail App Password Setup**
1. Enable 2-Factor Authentication
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" application
4. Generate 16-digit password
5. Copy password with spaces (automatically cleaned)

## 📊 Environment Variables Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` | Yes |
| `SMTP_PORT` | SMTP server port | `587` | Yes |
| `SMTP_SECURE` | Use SSL (true/false) | `false` | Yes |
| `SMTP_USER` | Authentication username | `user@gmail.com` | Yes |
| `SMTP_PASSWORD` | Authentication password | `abcd efgh ijkl mnop` | Yes |
| `SENDER_EMAIL` | Sender email address | `noreply@company.com` | Optional |

## 🧪 Testing Configuration

Test your SMTP configuration:

```javascript
// Test SMTP connection
await transporter.verify();
console.log('SMTP connection successful');

// Send test email
const testMail = {
    from: SENDER_EMAIL,
    to: 'test@example.com',
    subject: 'SMTP Test',
    text: 'SMTP configuration is working!'
};

const info = await transporter.sendMail(testMail);
console.log('Test email sent:', info.messageId);
```

## 🔄 Demo Mode

If SMTP credentials are not configured, the system operates in demo mode:

```
🎯 DEMO MODE: SMTP yapılandırılmamış
📧 user@example.com adresine OTP gönderilecekti: 123456
```

## 📝 Production Deployment

For production deployment (e.g., Render.com):

1. **Set Environment Variables:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-production-email@gmail.com
   SMTP_PASSWORD=your-production-app-password
   SENDER_EMAIL=noreply@your-domain.com
   ```

2. **Verify Configuration:**
   - Check server logs for SMTP connection success
   - Test password reset functionality
   - Monitor email delivery

## 🚨 Troubleshooting

### **Common Issues:**

**Authentication Failed:**
```
❌ SMTP bağlantı hatası: Invalid login
```
- Verify SMTP_USER and SMTP_PASSWORD
- For Gmail: Ensure 2FA is enabled and App Password is correct
- Check if account is locked or requires additional verification

**Connection Timeout:**
```
❌ SMTP bağlantı hatası: Connection timeout
```
- Verify SMTP_HOST and SMTP_PORT
- Check firewall/network restrictions
- Try different port (465 for SSL)

**TLS/SSL Errors:**
```
❌ SMTP bağlantı hatası: TLS/SSL error
```
- Verify SMTP_SECURE setting matches port
- Use port 587 with SMTP_SECURE=false
- Use port 465 with SMTP_SECURE=true

This comprehensive SMTP configuration ensures reliable email delivery for all users of the password reset system.