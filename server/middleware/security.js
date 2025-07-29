const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        handler: (req, res) => {
            console.log(`⚠️ Rate limit exceeded: ${req.ip} - ${req.originalUrl}`);
            res.status(429).json({ error: message });
        }
    });
};

// Different rate limits for different endpoints
const rateLimiters = {
    // Genel API rate limit - daha gevşek
    general: createRateLimiter(15 * 60 * 1000, 500, 'Çok fazla istek. 15 dakika sonra tekrar deneyin.'),
    
    // Auth endpoints - güvenlik için sıkılaştırıldı
    auth: createRateLimiter(15 * 60 * 1000, 10, 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'),
    
    // Password reset - sıkı
    passwordReset: createRateLimiter(60 * 60 * 1000, 10, 'Saatte en fazla 10 şifre sıfırlama isteği gönderebilirsiniz.'),
    
    // SMS/OTP - çok sıkı, IP bazlı koruma
    sms: createRateLimiter(60 * 60 * 1000, 5, 'Saatte en fazla 5 SMS gönderebilirsiniz. Güvenlik amacıyla kısıtlanmıştır.'),
    
    // Analytics - gevşek
    analytics: createRateLimiter(60 * 1000, 100, 'Çok fazla analytics isteği.', true)
};

// Input validation rules
const validationRules = {
    register: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Geçerli bir e-posta adresi girin'),
        body('password')
            .isLength({ min: 6, max: 128 })
            .withMessage('Şifre en az 6, en fazla 128 karakter olmalıdır')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
        body('firstName')
            .trim()
            .isLength({ min: 1, max: 50 })
            .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
            .withMessage('Ad sadece harflerden oluşmalıdır'),
        body('lastName')
            .trim()
            .isLength({ min: 1, max: 50 })
            .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
            .withMessage('Soyad sadece harflerden oluşmalıdır')
    ],
    
    login: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Geçerli bir e-posta adresi girin'),
        body('password')
            .isLength({ min: 1, max: 128 })
            .withMessage('Şifre gereklidir')
    ],
    
    forgotPassword: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Geçerli bir e-posta adresi girin')
    ],
    
    resetPassword: [
        body('token')
            .isLength({ min: 32, max: 128 })
            .isAlphanumeric()
            .withMessage('Geçersiz token'),
        body('newPassword')
            .isLength({ min: 6, max: 128 })
            .withMessage('Şifre en az 6, en fazla 128 karakter olmalıdır')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir')
    ],
    
    phoneAuth: [
        body('phone')
            .matches(/^(\+90|90|0)?[5][0-9]{9}$/)
            .withMessage('Geçerli bir Türk telefon numarası girin'),
        body('otp')
            .optional()
            .isLength({ min: 6, max: 6 })
            .isNumeric()
            .withMessage('OTP 6 haneli rakam olmalıdır'),
        body('firstName')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
            .withMessage('Ad sadece harflerden oluşmalıdır'),
        body('lastName')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
            .withMessage('Soyad sadece harflerden oluşmalıdır')
    ],
    
    analytics: [
        body('action')
            .isLength({ min: 1, max: 100 })
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('Geçersiz action formatı'),
        body('data')
            .optional()
            .isObject()
            .withMessage('Data objesi olmalıdır')
    ]
};

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        console.log('❌ Validation error:', firstError);
        return res.status(400).json({ 
            error: firstError.msg,
            field: firstError.param 
        });
    }
    next();
};

// Enhanced security headers configuration
const securityHeaders = helmet({
    contentSecurityPolicy: false, // Temporarily disable CSP for PDF generation debugging
    // contentSecurityPolicy: {
    //     directives: {
    //         defaultSrc: ["'self'"],
    //         styleSrc: ["'self'", "'unsafe-inline'"], // Sadece gerektiğinde unsafe-inline
    //         scriptSrc: ["'self'", "'wasm-unsafe-eval'", "'unsafe-eval'", "blob:"], // WebAssembly support for PDF generation
    //         imgSrc: ["'self'", "data:", "https:", "blob:"],
    //         connectSrc: ["'self'", "blob:", "data:", "https:", "wss:", "ws:"], // Allow all HTTPS connections for PDF generation
    //         fontSrc: ["'self'", "https:", "data:", "blob:"],
    //         objectSrc: ["'self'", "blob:", "data:"], // PDF object support
    //         mediaSrc: ["'self'", "blob:", "data:"],
    //         frameSrc: ["'none'"],
    //         workerSrc: ["'self'", "blob:", "data:"], // PDF Web Workers support
    //         childSrc: ["'self'", "blob:", "data:"], // Child contexts for PDF
    //         baseUri: ["'self'"], // Base URI sınırlandırıldı
    //         formAction: ["'self'"], // Form action sınırlandırıldı
    //     },
    // },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000, // 1 yıl HSTS
        includeSubDomains: true,
        preload: true
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Sanitize user input to prevent XSS
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                // Basic XSS prevention - HTML tags remove
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<[^>]*>/g, '')
                    .trim();
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };
    
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    
    next();
};

// Enhanced error handler
const errorHandler = (err, req, res, next) => {
    console.error('🚨 Server Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    
    // Production'da detaylı hata bilgisi verme
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
        res.status(500).json({
            error: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'
        });
    } else {
        res.status(500).json({
            error: 'Sunucu hatası',
            message: err.message,
            stack: err.stack
        });
    }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };
        
        // Sadece önemli istekleri logla
        if (duration > 1000 || res.statusCode >= 400) {
            console.log('📊 Request:', logData);
        }
    });
    
    next();
};

module.exports = {
    rateLimiters,
    validationRules,
    handleValidationErrors,
    securityHeaders,
    sanitizeInput,
    errorHandler,
    requestLogger
};