import React, { useState, useEffect } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithGoogle, 
  signInWithPhone,
  handleRedirectResult,
  // logout,
  resetPassword,
  createRecaptchaVerifier 
} from '../firebase/auth';
import './Auth.css';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Firebase Auth state değişikliklerini dinle ve redirect result'u handle et
  useEffect(() => {
    // Redirect result'u kontrol et
    const checkRedirectResult = async () => {
      if (auth) {
        try {
          const result = await handleRedirectResult();
          if (result.success && result.user) {
            console.log('✅ Google redirect login successful');
            // Auth state change zaten handle edilecek
          }
        } catch (error) {
          console.error('❌ Redirect result error:', error);
        }
      }
    };

    // Sayfa yüklendiğinde redirect result'u kontrol et
    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Firebase kullanıcısını uygulama kullanıcısına dönüştür
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          role: 'user' // Varsayılan rol, Firestore'dan alınabilir
        };
        onLogin(user);
      }
    });

    return () => unsubscribe();
  }, [onLogin]);

  // reCAPTCHA verifier'ı oluştur
  useEffect(() => {
    if (authMethod === 'phone' && !recaptchaVerifier) {
      try {
        const verifier = createRecaptchaVerifier('recaptcha-container');
        setRecaptchaVerifier(verifier);
      } catch (error) {
        console.error('reCAPTCHA verifier oluşturulamadı:', error);
      }
    }
  }, [authMethod, recaptchaVerifier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await signInWithEmail(formData.email, formData.password);
      } else {
        const displayName = `${formData.firstName} ${formData.lastName}`;
        result = await signUpWithEmail(formData.email, formData.password, displayName);
      }

      if (!result.success) {
        setError(result.error || 'Bir hata oluştu');
      }
    } catch (error: any) {
      setError(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    // Double-click protection
    if (loading) {
      console.log('🚫 Google Auth: Already in progress, ignoring click');
      return;
    }

    console.log('🔍 Google Auth: Starting Google authentication...');
    setLoading(true);
    setError('');

    try {
      const result = await signInWithGoogle();
      console.log('🔍 Google Auth: Result:', result);
      if (!result.success) {
        setError(result.error || 'Google ile giriş başarısız');
      }
    } catch (error: any) {
      console.error('❌ Google Auth: Error:', error);
      setError(error.message || 'Google ile giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (phoneStep === 'phone') {
        if (!recaptchaVerifier) {
          setError('reCAPTCHA doğrulaması gerekli');
          setLoading(false);
          return;
        }

        const result = await signInWithPhone(formData.phone, recaptchaVerifier);
        if (result.success) {
          setConfirmationResult(result.confirmationResult);
          setPhoneStep('otp');
        } else {
          setError(result.error || 'SMS gönderilemedi');
        }
      } else {
        if (!confirmationResult) {
          setError('SMS doğrulama hatası');
          setLoading(false);
          return;
        }

        try {
          await confirmationResult.confirm(otp);
          // Firebase auth state listener otomatik olarak çalışacak
        } catch (error: any) {
          setError('Geçersiz doğrulama kodu');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Telefon doğrulama hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Şifre sıfırlama için e-posta adresi gerekli');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await resetPassword(formData.email);
      if (result.success) {
        alert('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
      } else {
        setError(result.error || 'Şifre sıfırlama hatası');
      }
    } catch (error: any) {
      setError(error.message || 'Şifre sıfırlama hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-submit protection
    if (loading) {
      console.log('🚫 Submit: Already in progress, ignoring submit');
      return;
    }
    
    console.log('🔍 Submit: Auth method:', authMethod);
    
    switch (authMethod) {
      case 'email':
        await handleEmailAuth();
        break;
      case 'phone':
        await handlePhoneAuth();
        break;
      case 'google':
        await handleGoogleAuth();
        break;
    }
  };

  const resetPhoneStep = () => {
    setPhoneStep('phone');
    setOtp('');
    setConfirmationResult(null);
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

          {/* Auth Method Selection */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setAuthMethod('google'); resetPhoneStep(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  authMethod === 'google'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                🌐 Google
              </button>
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
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Google Auth */}
            {authMethod === 'google' && (
              <div className="auth-form-card">
                <div className="auth-form-header">
                  <div className="auth-form-icon">🌐</div>
                  <div>
                    <h5 className="auth-form-title">Google ile {isLogin ? 'Giriş' : 'Kayıt'}</h5>
                    <p className="auth-form-subtitle">Tek tıkla güvenli giriş</p>
                  </div>
                </div>
              </div>
            )}

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
                    onClick={handleForgotPassword}
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
              <div className="auth-form-card">
                <div className="auth-form-header">
                  <div className="auth-form-icon">📱</div>
                  <div>
                    <h5 className="auth-form-title">Telefon ile {isLogin ? 'Giriş' : 'Kayıt'}</h5>
                    <p className="auth-form-subtitle">SMS ile doğrulama</p>
                  </div>
                </div>
                
                {!isLogin && phoneStep === 'phone' && (
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
                
                {phoneStep === 'phone' ? (
                  <>
                    <input
                      name="phone"
                      type="tel"
                      required
                      className="auth-input"
                      placeholder="Telefon numarası (+90 5xx xxx xx xx)"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                    <div id="recaptcha-container"></div>
                  </>
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
                      className="auth-input text-center text-2xl font-mono tracking-widest"
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
                    {authMethod === 'google' ? '🌐' :
                     authMethod === 'phone' && phoneStep === 'phone' ? '📱' : 
                     authMethod === 'phone' && phoneStep === 'otp' ? '🔐' : 
                     isLogin ? '🚀' : '✨'}
                  </div>
                  <span>
                    {authMethod === 'google' ? `Google ile ${isLogin ? 'Giriş Yap' : 'Kayıt Ol'}` :
                     authMethod === 'phone' && phoneStep === 'phone' ? 'SMS Kodu Gönder' :
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

export default FirebaseAuth;