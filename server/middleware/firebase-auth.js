const { auth } = require('../firebase/admin');

// Firebase ID token'ını doğrulama middleware'i
const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Authorization header'ından token'ı al
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Erişim için giriş yapmanız gerekiyor',
        code: 'UNAUTHORIZED'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Firebase ID token'ını doğrula
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Kullanıcı bilgilerini request'e ekle
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      role: decodedToken.role || 'user', // Custom claims'den rol al
      emailVerified: decodedToken.email_verified
    };

    console.log('✅ Firebase Auth: Token verified for user:', req.user.email);
    next();

  } catch (error) {
    console.error('❌ Firebase Auth: Token verification failed:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Oturum süreniz dolmuş, lütfen tekrar giriş yapın',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        error: 'Oturumunuz geçersiz kılınmış, lütfen tekrar giriş yapın',
        code: 'TOKEN_REVOKED'
      });
    }

    return res.status(401).json({ 
      error: 'Geçersiz kimlik doğrulama',
      code: 'INVALID_TOKEN'
    });
  }
};

// Admin yetkisi kontrolü middleware'i
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Kimlik doğrulama gerekli',
      code: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Bu işlem için admin yetkisi gerekli',
      code: 'FORBIDDEN'
    });
  }

  console.log('✅ Firebase Auth: Admin access granted for:', req.user.email);
  next();
};

// Kullanıcıya özel rol atama fonksiyonu
const setCustomUserClaims = async (uid, claims) => {
  try {
    await auth.setCustomUserClaims(uid, claims);
    console.log('✅ Firebase Auth: Custom claims set for user:', uid, claims);
    return { success: true };
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to set custom claims:', error.message);
    return { success: false, error: error.message };
  }
};

// Kullanıcıyı admin yapma fonksiyonu
const makeUserAdmin = async (uid) => {
  return await setCustomUserClaims(uid, { role: 'admin' });
};

// Kullanıcının admin olup olmadığını kontrol etme
const isUserAdmin = async (uid) => {
  try {
    const user = await auth.getUser(uid);
    return user.customClaims?.role === 'admin';
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to check admin status:', error.message);
    return false;
  }
};

module.exports = {
  verifyFirebaseToken,
  requireAdmin,
  setCustomUserClaims,
  makeUserAdmin,
  isUserAdmin
};