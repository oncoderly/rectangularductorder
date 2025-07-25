import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ResetPassword.css';

const ResetPassword: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidToken, setIsValidToken] = useState<boolean>(true);

  useEffect(() => {
    // URL'den token parametresini al
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Geçersiz şifre sıfırlama bağlantısı');
      setIsValidToken(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Form validasyonu
    if (!newPassword || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('/api/reset-password', {
        token,
        newPassword
      });

      setMessage('Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.');
      setNewPassword('');
      setConfirmPassword('');
      
      // 3 saniye sonra ana sayfaya yönlendir
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);

    } catch (error: any) {
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Şifre sıfırlama sırasında bir hata oluştu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToHome = () => {
    window.location.href = '/';
  };

  if (!isValidToken) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <h1>🏭 Hava Kanalı Sipariş Sistemi</h1>
            <h2>⚠️ Geçersiz Bağlantı</h2>
          </div>
          
          <div className="error-message">
            <p>{error}</p>
          </div>
          
          <button 
            onClick={goToHome}
            className="btn btn-primary"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <h1>🏭 Hava Kanalı Sipariş Sistemi</h1>
          <h2>🔑 Şifre Sıfırlama</h2>
        </div>

        {message && (
          <div className="success-message">
            <p>✅ {message}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label htmlFor="newPassword">Yeni Şifre:</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter"
              required
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Şifre Onayı:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              required
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Güncelleniyor...' : '🔑 Şifremi Güncelle'}
          </button>
        </form>

        <div className="reset-password-footer">
          <button 
            onClick={goToHome}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;