import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

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
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'google'>('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');

  // Handle Google OAuth callback
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_auth') === 'success') {
      // Check for user data from server
      axios.get('http://localhost:5050/api/auth/google/success', { withCredentials: true })
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

    try {
      let endpoint = '';
      let payload = {};

      if (authMethod === 'email') {
        endpoint = isLogin ? '/api/login' : '/api/register';
        payload = formData;
      } else if (authMethod === 'phone') {
        if (phoneStep === 'phone') {
          endpoint = '/api/phone/send-otp';
          payload = { phone: formData.phone, isLogin };
          await axios.post(`http://localhost:5050${endpoint}`, payload);
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

      const response = await axios.post(`http://localhost:5050${endpoint}`, payload, {
        withCredentials: true
      });

      onLogin(response.data.user);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      window.location.href = 'http://localhost:5050/api/auth/google';
    } catch (error: any) {
      setError('Google ile giriş başarısız');
    }
  };

  const resetPhoneStep = () => {
    setPhoneStep('phone');
    setOtp('');
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
              onClick={() => { setAuthMethod('email'); resetPhoneStep(); }}
              className={`auth-btn auth-btn-email ${authMethod === 'email' ? '' : 'inactive'}`}
            >
              <div className="auth-btn-icon">✉️</div>
              <span>E-posta ile {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
            </button>

            {/* Phone Login Button */}
            <button
              type="button"
              onClick={() => { setAuthMethod('phone'); resetPhoneStep(); }}
              className={`auth-btn auth-btn-phone ${authMethod === 'phone' ? '' : 'inactive'}`}
            >
              <div className="auth-btn-icon">📱</div>
              <span>Telefon ile {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
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
              </div>
            )}

            {/* Phone Auth Form */}
            {authMethod === 'phone' && (
              <div className="auth-form-card phone-mode">
                <div className="auth-form-header">
                  <div className="auth-form-icon phone-mode">📱</div>
                  <div>
                    <h5 className="auth-form-title">Telefon ile {isLogin ? 'Giriş' : 'Kayıt'}</h5>
                    <p className="auth-form-subtitle">{phoneStep === 'phone' ? 'Telefon numaranızı girin' : 'Doğrulama kodunu girin'}</p>
                  </div>
                </div>
                {!isLogin && phoneStep === 'phone' && (
                  <div className="auth-input-grid">
                    <input
                      name="firstName"
                      type="text"
                      required
                      className="auth-input phone-mode"
                      placeholder="Ad"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                    <input
                      name="lastName"
                      type="text"
                      required
                      className="auth-input phone-mode"
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
                    className="auth-input phone-mode"
                    placeholder="Telefon numarası (05xx xxx xx xx)"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="auth-otp-container">
                    <div className="auth-otp-info">
                      <div className="auth-otp-header">
                        <div className="auth-otp-icon">📨</div>
                        <div>
                          <p className="auth-otp-phone">{formData.phone}</p>
                          <p className="auth-otp-desc">numarasına gönderilen 6 haneli kodu girin</p>
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      className="auth-input auth-otp-input phone-mode"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                    <button
                      type="button"
                      onClick={resetPhoneStep}
                      className="auth-otp-reset"
                    >
                      <span>🔄</span>
                      Telefon numarasını değiştir
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
              className={`auth-btn auth-btn-submit ${authMethod === 'phone' ? 'phone-mode' : ''}`}
            >
              {loading ? (
                <div className="auth-loading">
                  <div className="auth-spinner"></div>
                  <span>İşleniyor...</span>
                </div>
              ) : (
                <>
                  <div className="auth-btn-icon">
                    {authMethod === 'phone' && phoneStep === 'phone' ? '📲' :
                     authMethod === 'phone' && phoneStep === 'otp' ? '✅' :
                     isLogin ? '🚀' : '✨'}
                  </div>
                  <span>
                    {authMethod === 'phone' && phoneStep === 'phone' ? 'SMS Kodu Gönder' :
                     authMethod === 'phone' && phoneStep === 'otp' ? 'Kodu Doğrula' :
                     isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
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
    </div>
  );
};

export default Auth;