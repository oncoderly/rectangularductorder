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
  const { signIn, signUp, resetPassword } = useSupabaseAuth();
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
          setError(error.message || 'Giriş başarısız');
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
          setError(error.message || 'Kayıt başarısız');
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
            {loading ? 'Yükleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
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