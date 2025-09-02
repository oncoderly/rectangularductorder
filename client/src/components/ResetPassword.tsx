import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useInputClear } from '../hooks/useInputClear';
import './ResetPassword.css';

const ResetPassword: React.FC = () => {
  const { updatePassword } = useSupabaseAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);

  const { createPlaceholderFocusHandler } = useInputClear();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (error) {
            setError('Geçersiz veya süresi dolmuş bağlantı');
            setIsValidLink(false);
          }
        });
    } else {
      setError('Geçersiz şifre sıfırlama bağlantısı');
      setIsValidLink(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

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
      const { error } = await updatePassword(newPassword);
      if (error) {
        setError(error.message || 'Şifre sıfırlama sırasında bir hata oluştu');
      } else {
        setMessage('Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.');
        setNewPassword('');
        setConfirmPassword('');

        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (err) {
      setError('Şifre sıfırlama sırasında bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const goToHome = () => {
    window.location.href = '/';
  };

  if (!isValidLink) {
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
              onFocus={createPlaceholderFocusHandler(newPassword, 'En az 6 karakter')}
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
              onFocus={createPlaceholderFocusHandler(confirmPassword, 'Şifrenizi tekrar girin')}
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

