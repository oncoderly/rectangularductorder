import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail, loginWithGoogle, resendEmailVerification } from '../firebase/auth';
import ForgotPassword from './ForgotPassword';
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

const FirebaseAuth: React.FC<FirebaseAuthProps> = ({ 
  onLogin: _onLogin, // Firebase auth listener in App.tsx handles user state
  onGuestMode, 
  isModal, 
  onClose 
}) => {
  console.log('🔍 FirebaseAuth: Component rendered', { isModal, authMethod: 'email' });
  const [authMethod, setAuthMethod] = useState<'email' | 'google'>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  
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
    setSuccess('');
    setNeedsVerification(false);

    try {
      let result;
      if (isLogin) {
        console.log('🔐 FirebaseAuth: Email login started');
        result = await loginWithEmail(formData.email, formData.password);
        
        // Email doğrulama kontrolü
        if (result.needsVerification) {
          setNeedsVerification(true);
          setError(result.error || '');
        } else if (!result.success) {
          setError(result.error || 'Bir hata oluştu');
        } else {
          console.log('✅ FirebaseAuth: Email login successful');
        }
      } else {
        console.log('📝 FirebaseAuth: Email registration started');
        const displayName = `${formData.firstName} ${formData.lastName}`;
        result = await registerWithEmail(formData.email, formData.password, displayName);
        
        if (!result.success) {
          setError(result.error || 'Bir hata oluştu');
        } else {
          setSuccess(result.message || 'Kayıt başarılı!');
          console.log('✅ FirebaseAuth: Email registration successful');
        }
      }
    } catch (error: any) {
      console.error('❌ FirebaseAuth: Email auth error:', error);
      setError(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Email doğrulama tekrar gönder
  const handleResendVerification = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await resendEmailVerification();
      if (result.success) {
        setSuccess(result.message || 'Doğrulama emaili gönderildi!');
      } else {
        setError(result.error || 'Email gönderilemedi');
      }
    } catch (error: any) {
      setError('Email gönderilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Google Auth - Redirect Mode
  const handleGoogleAuth = async () => {
    console.log('🚀 FirebaseAuth: handleGoogleAuth called!');
    console.log('🔍 FirebaseAuth: Loading state:', loading);
    
    if (loading) {
      console.log('🚫 FirebaseAuth: Already loading, returning...');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('Google\'a yönlendiriliyor...');
    console.log('✅ FirebaseAuth: State updated, calling loginWithGoogle...');

    try {
      console.log('📡 FirebaseAuth: Calling loginWithGoogle function...');
      const result = await loginWithGoogle();
      console.log('📊 FirebaseAuth: loginWithGoogle result:', result);
      
      if (!result.success) {
        console.log('❌ FirebaseAuth: Google login failed:', result.error);
        if (result.error !== 'Giriş işlemi iptal edildi') {
          setError(result.error || 'Google ile giriş başarısız');
          setSuccess('');
        }
      } else {
        console.log('✅ FirebaseAuth: Google login successful!');
        setSuccess('Google\'a yönlendiriliyor...');
      }
    } catch (error: any) {
      console.error('💥 FirebaseAuth: Google auth exception:', error);
      setError(error.message || 'Google ile giriş başarısız');
      setSuccess('');
    } finally {
      console.log('🏁 FirebaseAuth: handleGoogleAuth completed');
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

  // Şifre sıfırlama sayfasından dönüş
  const handleBackFromForgotPassword = () => {
    setShowForgotPassword(false);
    setError('');
    setSuccess('');
  };

  // Şifre sıfırlama modal'ı göster
  if (showForgotPassword) {
    return <ForgotPassword onBack={handleBackFromForgotPassword} />;
  }


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
Google
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

          {/* Success Message */}
          {success && <div className="auth-success">{success}</div>}

          {/* Error Message */}
          {error && <div className="auth-error">{error}</div>}

          {/* Email Verification Warning */}
          {needsVerification && (
            <div className="auth-verification">
              <p>📧 Email adresinizi doğrulayın</p>
              <button
                type="button"
                onClick={handleResendVerification}
                className="auth-link"
                disabled={loading}
              >
                Doğrulama emailini tekrar gönder
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-button"
            onClick={(e) => {
              if (authMethod === 'google') {
                e.preventDefault();
                handleGoogleAuth();
              }
            }}
            style={{
              backgroundColor: authMethod === 'google' ? '#4285f4' : '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
{loading ? (
              authMethod === 'google' ? 'Google\'a yönlendiriliyor...' : 'Yükleniyor...'
            ) : (
              authMethod === 'google' ? 'Google ile Giriş Yap' :
              isLogin ? 'Giriş Yap' : 'Kayıt Ol'
            )}
          </button>
        </form>

        {/* Switch between login/register + Forgot Password */}
        {authMethod === 'email' && (
          <div className="auth-switch">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="auth-link"
            >
              {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Hesabınız var mı? Giriş yapın'}
            </button>
            
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="auth-link forgot-password-link"
              >
                Şifrenizi mi unuttunuz?
              </button>
            )}
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