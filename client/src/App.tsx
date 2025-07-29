import { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import ResetPassword from './components/ResetPassword';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

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

  // Initialize app - useEffect MUST be before any conditional returns
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 App: Starting initialization...');
      try {
        // Check URL for different routes
        const path = window.location.pathname;
        console.log('🔍 App: Current path:', path);
        if (path === '/admin-dashboard' || path.includes('admin')) {
          console.log('📊 App: Admin dashboard requested via URL');
          setShowAdminDashboard(true);
        }
        
        // Check Google auth first (faster)
        console.log('🔍 App: Checking Google auth...');
        await checkGoogleAuth();
        
        // Then check regular auth
        console.log('🔍 App: Checking regular auth...');
        await checkAuth();
        
        console.log('✅ App: Initialization completed');
      } catch (error) {
        console.error('❌ App: Initialization failed:', error);
        setLoading(false); // Ensure loading is set to false even on error
      }
    };
    
    initializeApp();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 checkAuth: API_URL =', API_URL);
      console.log('🔍 checkAuth: Checking /api/me...');
      const response = await axios.get(`${API_URL}/api/me`, {
        withCredentials: true
      });
      console.log('✅ checkAuth: User authenticated', response.data.user);
      setUser(response.data.user);
    } catch (error: any) {
      console.log('❌ checkAuth: User not authenticated', error.response?.status, error.response?.data);
      // User not authenticated - misafir modu zaten açık
    } finally {
      console.log('🏁 checkAuth: Setting loading to false');
      setLoading(false);
    }
  };

  const checkGoogleAuth = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('🔍 checkGoogleAuth: URL params:', window.location.search);
    console.log('🔍 checkGoogleAuth: google_auth param:', urlParams.get('google_auth'));
    
    if (urlParams.get('google_auth') === 'success') {
      console.log('✅ checkGoogleAuth: Google auth success detected, calling success endpoint');
      try {
        const response = await axios.get(`${API_URL}/api/auth/google/success`, {
          withCredentials: true
        });
        console.log('✅ checkGoogleAuth: User data received:', response.data.user);
        setUser(response.data.user);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('❌ checkGoogleAuth: Google auth check failed:', error);
      }
    } else if (urlParams.get('error') === 'google_auth_failed') {
      console.log('❌ checkGoogleAuth: Google auth failed');
      alert('Google ile giriş başarısız oldu');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      console.log('ℹ️ checkGoogleAuth: No Google auth params, continuing normally');
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
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
      <div className="App">
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
        
        {/* Admin Dashboard Toggle Button - Only for admin users */}
        {console.log('🔍 Button visibility check:', { user: !!user, role: user?.role, isAdmin: user?.role === 'admin', showAdminDashboard })}
        {user && user.role === 'admin' && !showAdminDashboard && (
          <button
            onClick={toggleAdminDashboard}
            className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
            title="Admin Dashboard"
          >
            📊
          </button>
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
            <Auth onLogin={handleLogin} isModal={true} onClose={closeAuthModal} />
          </div>
        </div>
      )}
    </>
  );
}

export default App
