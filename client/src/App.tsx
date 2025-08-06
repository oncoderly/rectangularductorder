import { useState, useEffect } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, handleGoogleRedirectResult } from './firebase/auth';
import FirebaseAuth from './components/FirebaseAuth';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import ResetPassword from './components/ResetPassword';
import './index.css';

// const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

function App() {
  console.log('🏁 App: Component initializing...');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  
  console.log('📊 App: Current state - loading:', loading, 'user:', !!user, 'showAdminDashboard:', showAdminDashboard);

  // Firebase Auth State Listener + Redirect Result Handler
  useEffect(() => {
    console.log('🚀 App: Setting up Firebase auth...');
    
    // Önce redirect result'u kontrol et
    const checkRedirectResult = async () => {
      try {
        console.log('🔄 App: Checking Google redirect result...');
        const redirectResult = await handleGoogleRedirectResult();
        
        if (redirectResult.success) {
          console.log('✅ App: Google redirect login successful!');
          console.log('👤 App: Redirect user data:', redirectResult.user?.email);
          
          // Redirect başarılıysa, auth state listener otomatik olarak user'ı set edecek
          // Bu yüzden burada manuel olarak setUser yapmıyoruz
        } else {
          console.log('ℹ️ App: No redirect result:', redirectResult.error);
        }
      } catch (error) {
        console.error('❌ App: Redirect result error:', error);
      }
    };
    
    // Sayfa yüklendiğinde redirect result'u kontrol et
    checkRedirectResult();
    
    const unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      console.log('🔥 App: Auth state changed:', !!firebaseUser);
      
      if (firebaseUser) {
        console.log('👤 App: Firebase user details:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL
        });
        
        // Kullanıcı rolünü server'dan al
        let userRole = 'user';
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          userRole = idTokenResult.claims.role || 'user';
          console.log('🔑 App: User role from token:', userRole);
        } catch (roleError) {
          console.log('⚠️ App: Could not get user role, defaulting to user');
        }
        
        // Firebase kullanıcısını app user'a dönüştür
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          role: userRole
        };
        
        console.log('✅ App: User logged in successfully:', {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        });
        
        setUser(user);
        setShowAuthModal(false); // Auth modal'ı kapat
        
        // Server session oluştur (background)
        try {
          const idToken = await firebaseUser.getIdToken();
          console.log('📡 App: Creating server session...');
          
          const response = await fetch('/api/auth/firebase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
          
          if (response.ok) {
            console.log('✅ App: Server session created successfully');
          } else {
            console.log('⚠️ App: Server session creation failed');
          }
        } catch (err) {
          console.log('⚠️ App: Server session error:', err);
        }
      } else {
        console.log('❌ App: User logged out or null');
        setUser(null);
        setShowAuthModal(false);
      }
      
      setLoading(false);
    });

    // Admin dashboard URL check
    if (window.location.pathname.includes('admin')) {
      setShowAdminDashboard(true);
    }

    return () => unsubscribe();
  }, []);

  // Firebase tabanlı logout
  const handleLogout = async () => {
    try {
      const { logout } = await import('./firebase/auth');
      await logout();
      setUser(null);
      console.log('✅ App: User logged out successfully');
    } catch (error) {
      console.error('❌ App: Logout failed:', error);
    }
  };

  const handleLogin = (userData: User) => {
    console.log('🚀 App: handleLogin called with userData:', userData);
    console.log('🔑 App: User role in handleLogin:', userData?.role);
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleRequireAuth = () => {
    console.log('🔍 App: handleRequireAuth called - opening auth modal');
    setShowAuthModal(true);
    console.log('🔍 App: showAuthModal set to true');
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  const toggleAdminDashboard = () => {
    setShowAdminDashboard(!showAdminDashboard);
  };

  if (loading) {
    console.log('⏳ App: Still loading, showing loading screen...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }
  
  console.log('✅ App: Loading complete, rendering main app...');

  console.log('🎨 App: About to render with showAdminDashboard:', showAdminDashboard, 'user:', !!user);
  
  // Check if this is a reset password page
  const path = window.location.pathname;
  if (path === '/reset-password') {
    return <ResetPassword />;
  }
  
  return (
    <>
      <div className="App main-app-content">
        {showAdminDashboard && user && user.role === 'admin' ? (
          <>
            {console.log('📊 App: Rendering AdminDashboard for admin user')}
            <AdminDashboard />
          </>
        ) : (
          <>
            {console.log('🏠 App: Rendering Dashboard')}
            <Dashboard 
              user={user} 
              onLogout={handleLogout} 
              onRequireAuth={handleRequireAuth}
              isGuest={!user}
            />
          </>
        )}
        {user && user.role !== 'admin' && (console.log('❌ App: User is not admin - role:', user?.role), null)}
        
        {/* Admin Dashboard Toggle Button - Only for admin users */}
        {(console.log('🔍 App: Admin button check - user:', !!user, 'role:', user?.role, 'showAdminDashboard:', showAdminDashboard), null)}
        {user && user.role === 'admin' && !showAdminDashboard && (
          <>
            {(console.log('✅ App: Rendering admin dashboard button'), null)}
            <button
            onClick={toggleAdminDashboard}
            className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
            title="Admin Dashboard"
          >
            📊
          </button>
          </>
        )}
        
        {/* Back to Main Dashboard Button */}
        {showAdminDashboard && user && user.role === 'admin' && (
          <button
            onClick={toggleAdminDashboard}
            className="fixed bottom-4 right-4 bg-gray-600 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
            title="Ana Dashboard'a Dön"
          >
            🏠
          </button>
        )}
      </div>
      
      {/* Floating Auth Modal Portal */}
      {showAuthModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999
          }}
          onClick={closeAuthModal}
        >
          <div 
            className="rounded-3xl max-w-md w-full max-h-[90vh] overflow-auto transform transition-all duration-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 1000000 }}
          >
            <FirebaseAuth onLogin={handleLogin} isModal={true} onClose={closeAuthModal} />
          </div>
        </div>
      )}
    </>
  );
}

export default App
