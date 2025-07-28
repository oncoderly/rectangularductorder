const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.db');

console.log('👥 KULLANICI BİLGİLERİ GÖRÜNTÜLEME\n');

try {
    const db = new Database(DB_PATH, { readonly: true });
    
    // Kullanıcıları detaylı göster
    const users = db.prepare(`
        SELECT * FROM users 
        ORDER BY createdAt DESC
    `).all();
    
    console.log(`📊 Toplam Kullanıcı: ${users.length}\n`);
    
    if (users.length === 0) {
        console.log('❌ Henüz kullanıcı kaydı yok.\n');
        return;
    }
    
    // JSON formatında tüm bilgileri göster
    console.log('🔍 DETAYLI KULLANICI BİLGİLERİ:');
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
        console.log(`\n${index + 1}. KULLANICI:`);
        console.log('─'.repeat(50));
        console.log(`📧 Email      : ${user.email}`);
        console.log(`👤 Ad         : ${user.firstName || 'Belirtilmemiş'}`);
        console.log(`👤 Soyad      : ${user.lastName || 'Belirtilmemiş'}`);
        console.log(`🆔 ID         : ${user.id}`);
        console.log(`🔐 Şifre Hash : ${user.password ? 'Mevcut' : 'Yok'}`);
        console.log(`🔗 Google ID  : ${user.googleId || 'Normal Kayıt'}`);
        console.log(`📅 Kayıt      : ${new Date(user.createdAt).toLocaleString('tr-TR')}`);
        console.log(`📅 Güncelleme : ${user.updatedAt ? new Date(user.updatedAt).toLocaleString('tr-TR') : 'Yok'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🔒 GÜVENLİK NOTU: Şifre hash\'leri güvenlik nedeniyle tam gösterilmedi.');
    
    // JSON Export seçeneği
    console.log('\n💾 JSON EXPORT:');
    const exportData = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        googleId: user.googleId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasPassword: !!user.password
    }));
    
    console.log(JSON.stringify(exportData, null, 2));
    
    db.close();
    
} catch (error) {
    console.error('❌ Hata:', error.message);
    console.log('\n💡 Çözüm önerileri:');
    console.log('1. server dizininde olduğunuzdan emin olun');
    console.log('2. users.db dosyasının var olduğunu kontrol edin');
    console.log('3. Dosya izinlerini kontrol edin');
}