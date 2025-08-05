import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail, loginWithGoogle } from '../firebase/auth';
import './Auth.css';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface FirebaseAuthProps {
  onLogin: (user: User) => void;
  onGuestMode?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const FirebaseAuth: React.FC<FirebaseAuthProps> = ({ onLogin, onGuestMode, isModal, onClose }) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'google'>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  // Form input değişikliklerini handle et
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Email Auth
  const handleEmailAuth = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        console.log('🔐 FirebaseAuth: Email login started');
        result = await loginWithEmail(formData.email, formData.password);
      } else {
        console.log('📝 FirebaseAuth: Email registration started');
        const displayName = `${formData.firstName} ${formData.lastName}`;
        result = await registerWithEmail(formData.email, formData.password, displayName);
      }

      if (!result.success) {
        setError(result.error || 'Bir hata oluştu');
      } else {
        console.log('✅ FirebaseAuth: Email auth successful');
      }
    } catch (error: any) {
      console.error('❌ FirebaseAuth: Email auth error:', error);
      setError(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Google Auth - TEK POPUP
  const handleGoogleAuth = async () => {
    if (loading) return;
    
    console.log('🚀 FirebaseAuth: Google auth starting...');
    setLoading(true);
    setError('');

    try {
      const result = await loginWithGoogle();
      
      console.log('🔍 FirebaseAuth: Google auth result:', result.success);
      
      if (!result.success) {
        if (result.error !== 'Giriş işlemi iptal edildi') {
          setError(result.error || 'Google ile giriş başarısız');
        }
      } else {
        console.log('✅ FirebaseAuth: Google auth successful');
      }
    } catch (error: any) {
      console.error('❌ FirebaseAuth: Google auth error:', error);
      setError(error.message || 'Google ile giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMethod === 'email') {
      await handleEmailAuth();
    } else if (authMethod === 'google') {
      await handleGoogleAuth();
    }
  };

  return (
    <div className={`auth-container ${isModal ? 'auth-modal' : ''}`}>
      {isModal && (
        <div className="auth-modal-overlay" onClick={onClose}>
          <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={onClose}>×</button>
          </div>
        </div>
      )}
      
      <div className="auth-content">
        <h2 className="auth-title">
          {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
        </h2>

        {/* Auth Method Selection */}
        <div className="auth-method-selection">
          <button
            type="button"
            className={`auth-method-btn ${authMethod === 'email' ? 'active' : ''}`}
            onClick={() => setAuthMethod('email')}
          >
            📧 Email
          </button>
          <button
            type="button"
            className={`auth-method-btn ${authMethod === 'google' ? 'active' : ''}`}
            onClick={() => setAuthMethod('google')}
          >
            🔍 Google
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Form */}
          {authMethod === 'email' && (
            <>
              <input
                type="email"
                name="email"
                placeholder="E-posta"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="auth-input"
              />
              
              <input
                type="password"
                name="password"
                placeholder="Şifre"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="auth-input"
              />
              
              {!isLogin && (
                <>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Ad"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="auth-input"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Soyad"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="auth-input"
                  />
                </>
              )}
            </>
          )}

          {/* Google Info */}
          {authMethod === 'google' && (
            <div className="google-auth-info">
              <p>Google hesabınızla tek tıkla giriş yapın</p>
            </div>
          )}

          {/* Error Message */}
          {error && <div className="auth-error">{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Yükleniyor...' : (
              authMethod === 'google' ? 'Google ile Giriş Yap' :
              isLogin ? 'Giriş Yap' : 'Kayıt Ol'
            )}
          </button>
        </form>

        {/* Switch between login/register */}
        {authMethod === 'email' && (
          <div className="auth-switch">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="auth-link"
            >
              {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Hesabınız var mı? Giriş yapın'}
            </button>
          </div>
        )}

        {/* Guest Mode */}
        {onGuestMode && (
          <div className="auth-guest">
            <button onClick={onGuestMode} className="auth-link">
              Misafir olarak devam et
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirebaseAuth;