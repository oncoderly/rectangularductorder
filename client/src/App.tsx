import { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import './index.css';

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

  useEffect(() => {
    checkAuth();
    checkGoogleAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/me', {
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
    if (urlParams.get('google_auth') === 'success') {
      try {
        const response = await axios.get('http://localhost:3000/api/auth/google/success', {
          withCredentials: true
        });
        setUser(response.data.user);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Google auth check failed:', error);
      }
    } else if (urlParams.get('error') === 'google_auth_failed') {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
        onRequireAuth={handleRequireAuth}
        isGuest={!user}
      />
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={closeAuthModal}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Auth onLogin={handleLogin} isModal={true} onClose={closeAuthModal} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App
