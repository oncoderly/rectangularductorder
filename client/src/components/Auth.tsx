import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthProps {
  onLogin: (user: User) => void;
  onGuestMode?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onGuestMode, isModal, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'google'>('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  // Handle Google OAuth callback
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_auth') === 'success') {
      // Check for user data from server
      axios.get(`${API_URL}/api/auth/google/success`, { withCredentials: true })
        .then(response => {
          onLogin(response.data.user);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(error => {
          setError('Google ile giriş tamamlanamadı');
          console.error('Google auth success check failed:', error);
        });
    } else if (urlParams.get('error') === 'google_auth_failed') {
      setError('Google ile giriş başarısız');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onLogin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 Auth: Starting authentication process...');
    console.log('🔐 Auth: Method:', authMethod, 'Is Login:', isLogin);

    try {
      let endpoint = '';
      let payload = {};

      if (authMethod === 'email') {
        endpoint = isLogin ? '/api/login' : '/api/register';
        payload = formData;
        console.log('✉️ Auth: Email auth - endpoint:', endpoint);
        console.log('✉️ Auth: Email payload:', { ...payload, password: '***' });
      }

      console.log('🌐 Auth: Making request to:', `${API_URL}${endpoint}`);
      console.log('🍪 Auth: With credentials:', true);

      const response = await axios.post(`${API_URL}${endpoint}`, payload, {
        withCredentials: true
      });

      console.log('✅ Auth: Success response:', response.data);
      console.log('✅ Auth: User data:', response.data.user);

      onLogin(response.data.user);
    } catch (error: any) {
      console.error('❌ Auth: Error occurred:', error);
      console.error('❌ Auth: Error response:', error.response?.data);
      console.error('❌ Auth: Error status:', error.response?.status);
      setError(error.response?.data?.error || 'Bir hata oluştu');
    } finally {
      console.log('🏁 Auth: Authentication process finished');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      window.location.href = `${API_URL}/api/auth/google`;
    } catch (error: any) {
      setError('Google ile giriş başarısız');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setForgotPasswordMessage('');

    try {
      await axios.post(`${API_URL}/api/forgot-password`, {
        email: forgotPasswordEmail
      });
      
      setForgotPasswordMessage('Şifre sıfırlama linki e-posta adresinize gönderildi.');
      setForgotPasswordEmail('');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Şifre sıfırlama e-postası gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordMessage('');
    setError('');
  };

  return (
    <div className={isModal ? "auth-modal-container" : "auth-container"}>
      <div className="auth-card">
        
        {/* Header */}
        <div className={`auth-header ${isModal ? 'auth-header-modal' : ''}`}>
          <div className="auth-header-content">
            <div className={`auth-logo ${isModal ? 'auth-logo-modal' : ''}`}>
              🏭
            </div>
            <h2 className={`auth-title ${isModal ? 'auth-title-modal' : ''}`}>
              Air Duct Order
            </h2>
            <p className="auth-subtitle">Hava Kanalı Sipariş Sistemi</p>
          </div>
          {isModal && onClose && (
            <button onClick={onClose} className="auth-close-btn" type="button">
              <span>×</span>
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className={`auth-body ${isModal ? 'auth-body-modal' : ''}`}>
          <div className={`auth-welcome ${isModal ? 'auth-welcome-modal' : ''}`}>
            <h3 className={`auth-welcome-title ${isModal ? 'auth-welcome-title-modal' : ''}`}>
              {isLogin ? '👋 Hoş Geldiniz!' : '🎉 Hesap Oluşturun'}
            </h3>
            <p className="auth-welcome-subtitle">
              {isLogin ? 'Hesabınıza güvenli giriş yapın' : 'Birkaç dakikada hesap oluşturun'}
            </p>
          </div>

          {/* Auth Buttons */}
          <div className="auth-buttons-container">
            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="auth-btn auth-btn-google"
            >
              <div className="auth-btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span>Google ile {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
            </button>

            {/* Email Login Button */}
            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`auth-btn auth-btn-email ${authMethod === 'email' ? '' : 'inactive'}`}
            >
              <div className="auth-btn-icon">✉️</div>
              <span>E-posta ile {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email Auth Form */}
            {authMethod === 'email' && (
              <div className="auth-form-card">
                <div className="auth-form-header">
                  <div className="auth-form-icon">✉️</div>
                  <div>
                    <h5 className="auth-form-title">E-posta ile {isLogin ? 'Giriş' : 'Kayıt'}</h5>
                    <p className="auth-form-subtitle">Bilgilerinizi girin</p>
                  </div>
                </div>
                {!isLogin && (
                  <div className="auth-input-grid">
                    <input
                      name="firstName"
                      type="text"
                      required
                      className="auth-input"
                      placeholder="Ad"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                    <input
                      name="lastName"
                      type="text"
                      required
                      className="auth-input"
                      placeholder="Soyad"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                )}
                <input
                  name="email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="E-posta adresi"
                  value={formData.email}
                  onChange={handleChange}
                />
                <input
                  name="password"
                  type="password"
                  required
                  className="auth-input"
                  placeholder="Şifre"
                  value={formData.password}
                  onChange={handleChange}
                />
                
                {/* Şifremi Unuttum Butonu */}
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="auth-forgot-password-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'right',
                      padding: '4px 0',
                      textDecoration: 'underline'
                    }}
                  >
                    Şifremi unuttum
                  </button>
                )}
              </div>
            )}


            {/* Error Display */}
            {error && (
              <div className="auth-error">
                <div className="auth-error-content">
                  <div className="auth-error-icon">❌</div>
                  <div>
                    <div className="auth-error-title">Bir sorun oluştu</div>
                    <div className="auth-error-message">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="auth-btn auth-btn-submit"
            >
              {loading ? (
                <div className="auth-loading">
                  <div className="auth-spinner"></div>
                  <span>İşleniyor...</span>
                </div>
              ) : (
                <>
                  <div className="auth-btn-icon">
                    {isLogin ? '🚀' : '✨'}
                  </div>
                  <span>
                    {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                  </span>
                </>
              )}
            </button>

            {/* Toggle Login/Register */}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="auth-btn auth-btn-toggle"
            >
              {isLogin ? '✨ Hesabınız yok mu? Kayıt olun' : '🔑 Hesabınız var mı? Giriş yapın'}
            </button>

            {/* Guest Mode Button */}
            {onGuestMode && !isModal && (
              <button
                type="button"
                onClick={onGuestMode}
                className="auth-btn auth-btn-guest"
              >
                <div className="auth-btn-icon">👨‍💼</div>
                <span>Misafir Olarak Devam Et</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Şifremi Unuttum Modal */}
      {showForgotPassword && (
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
            zIndex: 10000
          }}
          onClick={closeForgotPassword}
        >
          <div 
            style={{
              background: 'white',
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxWidth: '400px',
              width: '90%',
              animation: 'slideIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                fontSize: '32px', 
                marginBottom: '16px'
              }}>
                🔑
              </div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#2c3e50',
                marginBottom: '8px'
              }}>
                Şifrenizi mi unuttunuz?
              </h3>
              <p style={{ 
                color: '#7f8c8d', 
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                E-posta adresinizi girin, şifre sıfırlama linki gönderelim
              </p>
            </div>

            <form onSubmit={handleForgotPassword}>
              <input
                type="email"
                placeholder="E-posta adresiniz"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              {forgotPasswordMessage && (
                <div style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '16px',
                  border: '1px solid #a7f3d0'
                }}>
                  ✅ {forgotPasswordMessage}
                </div>
              )}

              {error && (
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '16px',
                  border: '1px solid #fecaca'
                }}>
                  ❌ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeForgotPassword}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'transparent',
                    color: '#7f8c8d',
                    border: '2px solid #ecf0f1',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#bdc3c7';
                    e.currentTarget.style.color = '#2c3e50';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#ecf0f1';
                    e.currentTarget.style.color = '#7f8c8d';
                  }}
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {loading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;