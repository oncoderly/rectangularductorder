import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase/config';
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

  // Firebase Auth State Listener
  useEffect(() => {
    console.log('🚀 App: Setting up Firebase auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      console.log('🔥 App: Firebase auth state changed:', !!firebaseUser);
      
      if (firebaseUser) {
        // Firebase kullanıcısını uygulama kullanıcısına dönüştür
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          role: 'user' // Varsayılan rol, Firebase'den gelen custom claims'e göre değiştirilebilir
        };
        
        console.log('✅ App: Setting user from Firebase:', user);
        setUser(user);
      } else {
        console.log('❌ App: No Firebase user, clearing user state');
        setUser(null);
      }
      
      setLoading(false);
    });

    // Check URL for admin dashboard
    const path = window.location.pathname;
    if (path === '/admin-dashboard' || path.includes('admin')) {
      console.log('📊 App: Admin dashboard requested via URL');
      setShowAdminDashboard(true);
    }

    return () => {
      console.log('🧹 App: Cleaning up Firebase auth listener');
      unsubscribe();
    };
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
    setShowAuthModal(true);
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
