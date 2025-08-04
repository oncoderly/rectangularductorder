const { auth } = require('./firebase/admin');
const { db: sqliteDb } = require('./database-selector');

/**
 * Eski SQLite/PostgreSQL kullanıcılarını Firebase'e migrate eden script
 * 
 * Kullanım:
 * node migrate-to-firebase.js
 */

async function migrateUsersToFirebase() {
  console.log('🔄 Starting user migration to Firebase...');
  
  try {
    // Mevcut kullanıcıları veritabanından al
    const existingUsers = await getExistingUsers();
    console.log(`📊 Found ${existingUsers.length} users to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const user of existingUsers) {
      try {
        await migrateUser(user);
        successCount++;
        console.log(`✅ Migrated: ${user.email}`);
      } catch (error) {
        errorCount++;
        const errorMsg = `❌ Failed to migrate ${user.email}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n🔍 Errors:');
      errors.forEach(error => console.log(error));
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function getExistingUsers() {
  try {
    const db = sqliteDb();
    
    // SQLite sorgusu
    const users = await db.all('SELECT * FROM users');
    
    return users.map(user => ({
      email: user.email,
      firstName: user.firstName || user.first_name || '',
      lastName: user.lastName || user.last_name || '',
      role: user.role || 'user',
      createdAt: user.created_at || user.createdAt,
      isAdmin: user.role === 'admin'
    }));
    
  } catch (error) {
    console.error('❌ Failed to get existing users:', error);
    throw error;
  }
}

async function migrateUser(user) {
  try {
    // Firebase'de kullanıcı var mı kontrol et
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(user.email);
      console.log(`ℹ️ User already exists in Firebase: ${user.email}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Kullanıcı Firebase'de yok, oluştur
        firebaseUser = await createFirebaseUser(user);
        console.log(`✨ Created new Firebase user: ${user.email}`);
      } else {
        throw error;
      }
    }
    
    // Custom claims (roller) ayarla
    if (user.isAdmin) {
      await auth.setCustomUserClaims(firebaseUser.uid, { role: 'admin' });
      console.log(`👑 Set admin role for: ${user.email}`);
    }
    
    return firebaseUser;
    
  } catch (error) {
    console.error(`❌ Failed to migrate user ${user.email}:`, error);
    throw error;
  }
}

async function createFirebaseUser(user) {
  const displayName = `${user.firstName} ${user.lastName}`.trim();
  
  const userRecord = await auth.createUser({
    email: user.email,
    displayName: displayName || undefined,
    emailVerified: true, // Eski sistemde zaten doğrulanmış kabul et
    // Şifre otomatik oluşturulacak, kullanıcı şifre sıfırlama ile yeni şifre oluşturabilir
  });
  
  return userRecord;
}

// Eski veritabanından kullanıcıları temizleme (isteğe bağlı)
async function cleanupOldUsers() {
  const confirm = process.argv.includes('--cleanup');
  
  if (!confirm) {
    console.log('\n⚠️ Eski kullanıcı verilerini temizlemek için --cleanup bayrağını kullanın');
    console.log('Örnek: node migrate-to-firebase.js --cleanup');
    return;
  }
  
  try {
    const db = sqliteDb();
    
    // Backup oluştur
    const backupPath = `users_backup_${Date.now()}.json`;
    const users = await db.all('SELECT * FROM users');
    
    require('fs').writeFileSync(backupPath, JSON.stringify(users, null, 2));
    console.log(`📁 Backup created: ${backupPath}`);
    
    // Users tablosunu temizle (dikkatli!)
    // await db.run('DELETE FROM users');
    // console.log('🧹 Old user data cleaned up');
    
    console.log('⚠️ Uncomment the DELETE query if you want to clean up old data');
    
  } catch (error) {
    console.error('❌ Failed to cleanup old users:', error);
  }
}

// Test fonksiyonu
async function testFirebaseConnection() {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test user oluştur
    const testEmail = 'test@example.com';
    
    try {
      // Var olan test kullanıcısını sil
      const existingUser = await auth.getUserByEmail(testEmail);
      await auth.deleteUser(existingUser.uid);
      console.log('🧹 Deleted existing test user');
    } catch (error) {
      // Kullanıcı yoksa problem yok
    }
    
    // Yeni test kullanıcısı oluştur
    const testUser = await auth.createUser({
      email: testEmail,
      displayName: 'Test User',
      emailVerified: true
    });
    
    console.log('✅ Test user created:', testUser.uid);
    
    // Test kullanıcısını sil
    await auth.deleteUser(testUser.uid);
    console.log('🧹 Test user deleted');
    
    console.log('✅ Firebase connection test successful!');
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testFirebaseConnection();
    return;
  }
  
  if (args.includes('--help')) {
    console.log(`
🔥 Firebase Migration Tool

Usage:
  node migrate-to-firebase.js              # Migrate users
  node migrate-to-firebase.js --test       # Test Firebase connection
  node migrate-to-firebase.js --cleanup    # Migrate and cleanup old data
  node migrate-to-firebase.js --help       # Show this help

Features:
  - Migrates existing users from SQLite/PostgreSQL to Firebase
  - Preserves user roles (admin/user)
  - Creates backup before cleanup
  - Handles existing Firebase users gracefully
  - Test mode for connection verification

Requirements:
  - Firebase Admin SDK configured
  - Service account key or environment variables set
  - Database connection available
`);
    return;
  }
  
  await migrateUsersToFirebase();
  
  if (args.includes('--cleanup')) {
    await cleanupOldUsers();
  }
}

// Script çalıştırıldığında
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateUsersToFirebase,
  testFirebaseConnection,
  migrateUser,
  getExistingUsers
};