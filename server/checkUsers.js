const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.db');

console.log('🔍 Kullanıcı Veritabanı Kontrolü\n');
console.log('📂 Database dosya yolu:', DB_PATH);

try {
    const db = new Database(DB_PATH, { readonly: true });
    
    // Toplam kullanıcı sayısı
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('👥 Toplam kullanıcı sayısı:', totalUsers.count);
    
    if (totalUsers.count > 0) {
        // Tüm kullanıcıları listele
        console.log('\n📋 Kayıtlı Kullanıcılar:');
        console.log('=' .repeat(60));
        
        const users = db.prepare(`
            SELECT id, email, firstName, lastName, googleId, createdAt 
            FROM users 
            ORDER BY createdAt DESC
        `).all();
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. Kullanıcı:`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   👤 Ad Soyad: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
            console.log(`   🆔 ID: ${user.id}`);
            console.log(`   🔗 Google ID: ${user.googleId || 'Normal kayıt'}`);
            console.log(`   📅 Kayıt Tarihi: ${user.createdAt}`);
            console.log('   ' + '-'.repeat(40));
        });
        
        // Son 5 kayıt
        console.log('\n🕐 Son 5 Kayıt:');
        const recentUsers = db.prepare(`
            SELECT email, firstName, lastName, createdAt 
            FROM users 
            ORDER BY createdAt DESC 
            LIMIT 5
        `).all();
        
        recentUsers.forEach((user, index) => {
            const date = new Date(user.createdAt).toLocaleString('tr-TR');
            console.log(`${index + 1}. ${user.firstName || 'Anonim'} (${user.email}) - ${date}`);
        });
    } else {
        console.log('❌ Henüz hiç kullanıcı kaydı yok.');
        console.log('💡 Yeni kullanıcı kaydı yapmayı deneyin.');
    }
    
    // Password reset tokens kontrolü
    const tokens = db.prepare('SELECT COUNT(*) as count FROM reset_tokens').get();
    console.log(`\n🔑 Aktif şifre sıfırlama token sayısı: ${tokens.count}`);
    
    // Analytics kontrolü
    try {
        const analytics = db.prepare('SELECT COUNT(*) as count FROM analytics').get();
        console.log(`📊 Analytics kayıt sayısı: ${analytics.count}`);
    } catch (e) {
        console.log('📊 Analytics tablosu bulunamadı (normal)');
    }
    
    db.close();
    console.log('\n✅ Veritabanı kontrolü tamamlandı!');
    
} catch (error) {
    console.error('❌ Veritabanı hatası:', error.message);
    console.log('\n💡 Olası çözümler:');
    console.log('1. Server en az bir kez çalıştırılmış mı?');
    console.log('2. users.db dosyası var mı?');
    console.log('3. Dosya izinleri doğru mu?');
}