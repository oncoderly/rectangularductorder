const { userDB } = require('./database');

console.log('🗄️ Testing database user operations...\n');

// Tüm kullanıcıları listele
const users = userDB.getAllUsers();
console.log(`👥 Total users in database: ${users.length}`);

users.forEach((user, index) => {
    console.log(`\n${index + 1}. User:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Password Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'NOT SET'}`);
    console.log(`   Google ID: ${user.googleId || 'None'}`);
    console.log(`   Created: ${user.createdAt}`);
});

// Specific user test
console.log('\n🔍 Testing specific user lookup:');
const testUser = userDB.getUserByEmail('salihosmanli34@gmail.com');
console.log('User found:', !!testUser);
if (testUser) {
    console.log('User details:', {
        id: testUser.id,
        email: testUser.email,
        hasPassword: !!testUser.password,
        passwordLength: testUser.password ? testUser.password.length : 0
    });
}

console.log('\n📊 Database stats:');
console.log(`Total users: ${userDB.getUserCount()}`);