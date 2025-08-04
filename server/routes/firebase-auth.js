const express = require('express');
const { verifyFirebaseToken, requireAdmin, makeUserAdmin, isUserAdmin } = require('../middleware/firebase-auth');
const { auth, db } = require('../firebase/admin');

const router = express.Router();

// Kullanıcı profil bilgilerini getir
router.get('/me', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, name, picture, role, emailVerified } = req.user;
    
    // Firestore'dan ek kullanıcı bilgilerini al (varsa)
    let additionalData = {};
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        additionalData = userDoc.data();
      }
    } catch (firestoreError) {
      console.log('ℹ️ Firestore user data not found, using Firebase Auth data only');
    }

    const user = {
      id: uid,
      email: email,
      firstName: additionalData.firstName || name?.split(' ')[0] || '',
      lastName: additionalData.lastName || name?.split(' ').slice(1).join(' ') || '',
      role: role,
      emailVerified: emailVerified,
      picture: picture,
      createdAt: additionalData.createdAt || null,
      lastLoginAt: additionalData.lastLoginAt || null
    };

    res.json({ user });
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to get user profile:', error.message);
    res.status(500).json({ error: 'Profil bilgileri alınamadı' });
  }
});

// Kullanıcı profilini güncelle
router.put('/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { firstName, lastName, phone } = req.body;

    // Firestore'da kullanıcı bilgilerini güncelle
    const userData = {
      firstName,
      lastName,
      phone,
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).set(userData, { merge: true });

    res.json({ 
      success: true, 
      message: 'Profil güncellendi',
      user: { ...req.user, ...userData }
    });
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to update profile:', error.message);
    res.status(500).json({ error: 'Profil güncellenemedi' });
  }
});

// Admin: Kullanıcıları listele
router.get('/admin/users', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { maxResults = 1000 } = req.query;
    
    const listUsersResult = await auth.listUsers(parseInt(maxResults));
    
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
      role: user.customClaims?.role || 'user'
    }));

    res.json({ users, total: users.length });
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to list users:', error.message);
    res.status(500).json({ error: 'Kullanıcılar listelenemedi' });
  }
});

// Admin: Kullanıcıyı admin yap
router.post('/admin/make-admin', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { uid, email } = req.body;
    
    if (!uid && !email) {
      return res.status(400).json({ error: 'Kullanıcı UID veya email gerekli' });
    }

    let targetUid = uid;
    
    // Email ile kullanıcı bulma
    if (!targetUid && email) {
      try {
        const user = await auth.getUserByEmail(email);
        targetUid = user.uid;
      } catch (error) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
    }

    const result = await makeUserAdmin(targetUid);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Kullanıcı admin yapıldı',
        uid: targetUid 
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to make user admin:', error.message);
    res.status(500).json({ error: 'Admin yetkisi verilemedi' });
  }
});

// Admin: Kullanıcıyı devre dışı bırak
router.post('/admin/disable-user', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'Kullanıcı UID gerekli' });
    }

    await auth.updateUser(uid, { disabled: true });
    
    res.json({ 
      success: true, 
      message: 'Kullanıcı devre dışı bırakıldı',
      uid 
    });
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to disable user:', error.message);
    res.status(500).json({ error: 'Kullanıcı devre dışı bırakılamadı' });
  }
});

// Admin: Kullanıcıyı aktif et
router.post('/admin/enable-user', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'Kullanıcı UID gerekli' });
    }

    await auth.updateUser(uid, { disabled: false });
    
    res.json({ 
      success: true, 
      message: 'Kullanıcı aktif edildi',
      uid 
    });
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to enable user:', error.message);
    res.status(500).json({ error: 'Kullanıcı aktif edilemedi' });
  }
});

// Admin: Kullanıcıyı sil
router.delete('/admin/delete-user', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'Kullanıcı UID gerekli' });
    }

    // Önce Firestore'dan kullanıcı verilerini sil
    try {
      await db.collection('users').doc(uid).delete();
    } catch (firestoreError) {
      console.log('ℹ️ No Firestore data to delete for user:', uid);
    }

    // Firebase Auth'tan kullanıcıyı sil
    await auth.deleteUser(uid);
    
    res.json({ 
      success: true, 
      message: 'Kullanıcı silindi',
      uid 
    });
  } catch (error) {
    console.error('❌ Firebase Auth: Failed to delete user:', error.message);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

module.exports = router;