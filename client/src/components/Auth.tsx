import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useInputClear } from '../hooks/useInputClear';
import ForgotPassword from './ForgotPassword';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface AuthProps {
  onLogin: (user: User) => void;
  onGuestMode?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onGuestMode, isModal, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'google'>('google');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  
  // Input clear hook'unu kullan - performance optimization
  const { createPlaceholderFocusHandler, createEmailFocusHandler, createPasswordFocusHandler } = useInputClear();
  
  // Memoize frequently used values
  const authTitle = useMemo(() => 
    isLogin ? '👋 Hoş Geldiniz!' : '🎉 Hesap Oluşturun', 
    [isLogin]
  );
  
  const authSubtitle = useMemo(() => 
    isLogin ? 'Hesabınıza güvenli giriş yapın' : 'Birkaç dakikada hesap oluşturun', 
    [isLogin]
  );
  
  const submitButtonText = useMemo(() => 
    isLogin ? 'Giriş Yap' : 'Kayıt Ol', 
    [isLogin]
  );

  // Handle Google OAuth callback
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_auth') === 'success') {
      // Check for user data from server
      console.log('🔍 Auth: Google auth success detected, calling success endpoint');
      axios.get(`${API_URL}/api/auth/google/success`, { withCredentials: true })
        .then(response => {
          console.log('✅ Auth: Google auth success response:', response.data);
          console.log('👤 Auth: User object received:', response.data.user);
          console.log('🔑 Auth: User role:', response.data.user?.role);
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

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
      } else if (authMethod === 'phone') {
        if (phoneStep === 'phone') {
          endpoint = '/api/phone/send-otp';
          payload = { phone: formData.phone, isLogin };
          await axios.post(`${API_URL}${endpoint}`, payload);
          setPhoneStep('otp');
          setLoading(false);
          return;
        } else {
          endpoint = isLogin ? '/api/phone/login' : '/api/phone/register';
          payload = { 
            phone: formData.phone, 
            otp,
            firstName: formData.firstName,
            lastName: formData.lastName
          };
        }
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

  const handleGoogleLogin = useCallback(async () => {
    try {
      window.location.href = `${API_URL}/api/auth/google`;
    } catch (error: any) {
      setError('Google ile giriş başarısız');
    }
  }, []);

  const resetPhoneStep = () => {
    setPhoneStep('phone');
    setOtp('');
  };

  // Show ForgotPassword component if requested
  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

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
              {authTitle}
            </h3>
            <p className="auth-welcome-subtitle">
              {authSubtitle}
            </p>
          </div>

          {/* Auth Method Selection - HIDDEN */}
          {false && <div className="flex justify-center mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); resetPhoneStep(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  authMethod === 'email'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                📧 E-posta
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); resetPhoneStep(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  authMethod === 'phone'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                📱 Telefon
              </button>
            </div>
          </div>}

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

            {/* Email Login Button - DISABLED */}
            {false && <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`auth-btn auth-btn-email ${authMethod === 'email' ? '' : 'inactive'}`}
            >
              <div className="auth-btn-icon">✉️</div>
              <span>E-posta ile {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
            </button>}
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
                      onFocus={createPlaceholderFocusHandler(formData.firstName, 'Ad')}
                      onChange={handleChange}
                    />
                    <input
                      name="lastName"
                      type="text"
                      required
                      className="auth-input"
                      placeholder="Soyad"
                      value={formData.lastName}
                      onFocus={createPlaceholderFocusHandler(formData.lastName, 'Soyad')}
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
                  onFocus={createEmailFocusHandler(formData.email, 'E-posta adresi')}
                  onChange={handleChange}
                />
                <input
                  name="password"
                  type="password"
                  required
                  className="auth-input"
                  placeholder="Şifre"
                  value={formData.password}
                  onFocus={createPasswordFocusHandler(formData.password)}
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

            {/* Phone Auth Fields */}
            {authMethod === 'phone' && (
              <div className="space-y-4">
                {!isLogin && phoneStep === 'phone' && (
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="firstName"
                      type="text"
                      required
                      className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ad"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                    <input
                      name="lastName"
                      type="text"
                      required
                      className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Soyad"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                )}
                
                {phoneStep === 'phone' ? (
                  <input
                    name="phone"
                    type="tel"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Telefon numarası (05xx xxx xx xx)"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="text-center text-sm text-gray-600 bg-blue-50 p-4 rounded-xl">
                      <div className="text-2xl mb-2">📱</div>
                      <p><strong>{formData.phone}</strong> numarasına gönderilen 6 haneli kodu girin</p>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                    <button
                      type="button"
                      onClick={resetPhoneStep}
                      className="text-blue-600 hover:text-blue-500 text-sm"
                    >
                      ← Telefon numarasını değiştir
                    </button>
                  </div>
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
                    {authMethod === 'phone' && phoneStep === 'phone' ? '📱' : 
                     authMethod === 'phone' && phoneStep === 'otp' ? '🔐' : 
                     isLogin ? '🚀' : '✨'}
                  </div>
                  <span>
                    {authMethod === 'phone' && phoneStep === 'phone' ? 'SMS Kodu Gönder' :
                     authMethod === 'phone' && phoneStep === 'otp' ? 'Kodu Doğrula' :
                     submitButtonText}
                  </span>
                </>
              )}
            </button>

            {/* Toggle Login/Register */}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); resetPhoneStep(); }}
              className="auth-btn auth-btn-toggle"
            >
              <div className="auth-btn-icon">
                {isLogin ? '✨' : '🔑'}
              </div>
              <span>
                {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Hesabınız var mı? Giriş yapın'}
              </span>
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
    </div>
  );
};

export default Auth;