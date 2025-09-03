import React, { useState } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
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
  onLogin,
  onGuestMode, 
  isModal, 
  onClose 
}) => {
  console.log('🔍 SupabaseAuth: Component rendered', { isModal, authMethod: 'email' });
  const { signIn, signUp, signInWithGoogle, resetPassword } = useSupabaseAuth();
  const [authMethod, setAuthMethod] = useState<'email'>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
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

    try {
      if (isLogin) {
        console.log('🔐 SupabaseAuth: Email login started');
        const { data, error } = await signIn(formData.email, formData.password);
        
        if (error) {
          let errorMessage = 'Giriş başarısız';
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'E-posta veya şifre hatalı';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'E-posta adresinizi doğrulayın';
          } else if (error.message.includes('Too many requests')) {
            errorMessage = 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin';
          } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Geçersiz e-posta adresi';
          }
          setError(errorMessage);
        } else if (data.user) {
          console.log('✅ SupabaseAuth: Email login successful');
          onLogin({
            id: data.user.id,
            email: data.user.email || '',
            firstName: data.user.user_metadata?.firstName || '',
            lastName: data.user.user_metadata?.lastName || '',
            role: data.user.user_metadata?.role || 'user'
          });
        }
      } else {
        console.log('📝 SupabaseAuth: Email registration started');
        const { data, error } = await signUp(formData.email, formData.password, {
          firstName: formData.firstName,
          lastName: formData.lastName
        });
        
        if (error) {
          let errorMessage = 'Kayıt başarısız';
          if (error.message.includes('User already registered')) {
            errorMessage = 'Bu e-posta adresi zaten kayıtlı';
          } else if (error.message.includes('Password should be at least 6 characters')) {
            errorMessage = 'Şifre en az 6 karakter olmalıdır';
          } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Geçersiz e-posta adresi';
          } else if (error.message.includes('Weak password')) {
            errorMessage = 'Şifre çok zayıf. Daha güçlü bir şifre seçin';
          }
          setError(errorMessage);
        } else {
          setSuccess('Kayıt başarılı! Email adresinizi kontrol edin.');
          console.log('✅ SupabaseAuth: Email registration successful');
        }
      }
    } catch (error: any) {
      console.error('❌ SupabaseAuth: Email auth error:', error);
      setError(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Google Auth
  const handleGoogleAuth = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔐 SupabaseAuth: Google login started');
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        console.error('❌ SupabaseAuth: Google login error:', error);
        setError(error.message || 'Google ile giriş başarısız');
      } else {
        console.log('✅ SupabaseAuth: Google login initiated successfully');
      }
    } catch (error: any) {
      console.error('❌ SupabaseAuth: Google auth error:', error);
      setError(error.message || 'Google ile giriş sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleEmailAuth();
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


        {/* Google Sign In Button */}
        {isLogin && (
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="auth-button google-button"
            style={{
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid #ddd',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google ile Giriş Yap
          </button>
        )}

        <div className="auth-divider" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          margin: '16px 0',
          color: '#666'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
          <span style={{ padding: '0 16px', fontSize: '14px' }}>veya</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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

          {/* Success Message */}
          {success && <div className="auth-success">{success}</div>}

          {/* Error Message */}
          {error && <div className="auth-error">{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Yükleniyor...' : (isLogin ? 'E-posta ile Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        {/* Switch between login/register + Forgot Password */}
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