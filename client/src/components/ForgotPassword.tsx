import React, { useState } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import './Auth.css';

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const { resetPassword } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Supabase ile şifre sıfırlama
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('E-posta adresi gerekli');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message || 'Bir hata oluştu');
      } else {
        setMessage('Şifre sıfırlama bağlantısı gönderildi!');
        setEmailSent(true);
      }
    } catch (error: any) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-content">
        <h2 className="auth-title">🔑 Şifre Sıfırlama</h2>

        {message && (
          <div className="auth-success">
            <p>✅ {message}</p>
          </div>
        )}

        {error && (
          <div className="auth-error">
            <p>❌ {error}</p>
          </div>
        )}

        {!emailSent ? (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">E-posta Adresiniz:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                className="auth-input"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? '📤 Gönderiliyor...' : '📤 Şifre Sıfırlama Bağlantısı Gönder'}
            </button>
          </form>
        ) : (
          <div className="success-stage">
            <div className="success-icon">📧</div>
            <h3>Email Gönderildi!</h3>
            <p>E-posta adresinize şifre sıfırlama bağlantısı gönderildi.</p>
            <p>Lütfen email kutunuzu kontrol edin ve bağlantıya tıklayarak şifrenizi sıfırlayın.</p>
          </div>
        )}

        <div className="auth-footer">
          <button 
            onClick={onBack}
            className="auth-link"
            disabled={isLoading}
          >
            ← Giriş sayfasına dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;