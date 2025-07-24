import { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  useEffect(() => {
    checkAuth();
    checkGoogleAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/me`, {
        withCredentials: true
      });
      setUser(response.data.user);
    } catch (error) {
      // User not authenticated - misafir modu zaten açık
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleAuth = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('🔍 Checking URL params:', window.location.search);
    console.log('🔍 google_auth param:', urlParams.get('google_auth'));
    
    if (urlParams.get('google_auth') === 'success') {
      console.log('✅ Google auth success detected, calling success endpoint');
      try {
        const response = await axios.get(`${API_URL}/api/auth/google/success`, {
          withCredentials: true
        });
        console.log('✅ User data received:', response.data.user);
        setUser(response.data.user);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('❌ Google auth check failed:', error);
      }
    } else if (urlParams.get('error') === 'google_auth_failed') {
      console.log('❌ Google auth failed');
      alert('Google ile giriş başarısız oldu');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }

  // Check URL for admin dashboard
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin-dashboard' || path.includes('admin')) {
      setShowAdminDashboard(true);
    }
  }, []);

  return (
    <>
      <div className="App">
        {showAdminDashboard ? (
          <AdminDashboard />
        ) : (
          <Dashboard 
            user={user} 
            onLogout={handleLogout} 
            onRequireAuth={handleRequireAuth}
            isGuest={!user}
          />
        )}
        
        {/* Admin Dashboard Toggle Button - Only for authenticated users */}
        {user && !showAdminDashboard && (
          <button
            onClick={toggleAdminDashboard}
            className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
            title="Analytics Dashboard"
          >
            📊
          </button>
        )}
        
        {/* Back to Main Dashboard Button */}
        {showAdminDashboard && (
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
