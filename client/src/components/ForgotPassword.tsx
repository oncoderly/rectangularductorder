import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useInputClear } from '../hooks/useInputClear';
import './Auth.css';

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  // Stages: email -> otp -> newPassword -> success
  const [stage, setStage] = useState<'email' | 'otp' | 'newPassword' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // OTP refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Resend OTP timer
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const { createPlaceholderFocusHandler } = useInputClear();

  // Start resend timer
  const startResendTimer = () => {
    setCanResend(false);
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stage 1: Send OTP to email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('E-posta adresi gerekli');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('/api/forgot-password-otp', { email });
      
      if (response.data.success) {
        setMessage(response.data.message);
        setStage('otp');
        startResendTimer();
        
        // Focus first OTP input
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handling
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  // Stage 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('6 haneli kodu eksiksiz girin');
      return;
    }

    setMessage('OTP doğrulandı! Yeni şifrenizi belirleyin.');
    setStage('newPassword');
  };

  // Stage 3: Set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const response = await axios.post('/api/reset-password-otp', {
        email,
        otp: otp.join(''),
        newPassword
      });

      if (response.data.success) {
        setMessage('✅ Şifreniz başarıyla güncellendi!');
        setStage('success');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        setError(error.response.data.error);
        
        // If OTP expired or invalid, go back to OTP stage
        if (error.response.data.error.includes('OTP') || error.response.data.error.includes('süresi')) {
          setStage('otp');
          setOtp(['', '', '', '', '', '']);
        }
      } else {
        setError('Şifre sıfırlama sırasında bir hata oluştu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/forgot-password-otp', { email });
      
      if (response.data.success) {
        setMessage('Yeni kod gönderildi');
        setOtp(['', '', '', '', '', '']);
        startResendTimer();
        otpRefs.current[0]?.focus();
      }
    } catch (error: any) {
      setError('Kod gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏭 Hava Kanalı Sipariş Sistemi</h1>
          <h2>🔑 Şifre Sıfırlama</h2>
        </div>

        {/* Stage Indicator */}
        <div className="stage-indicator">
          <div className={`stage ${stage === 'email' ? 'active' : (stage === 'otp' || stage === 'newPassword' || stage === 'success') ? 'completed' : ''}`}>1</div>
          <div className="stage-line"></div>
          <div className={`stage ${stage === 'otp' ? 'active' : (stage === 'newPassword' || stage === 'success') ? 'completed' : ''}`}>2</div>
          <div className="stage-line"></div>
          <div className={`stage ${stage === 'newPassword' ? 'active' : stage === 'success' ? 'completed' : ''}`}>3</div>
        </div>

        {message && (
          <div className="success-message">
            <p>{message}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
          </div>
        )}

        {/* Stage 1: Email */}
        {stage === 'email' && (
          <form onSubmit={handleSendOTP} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">E-posta Adresiniz:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                className="form-input"
                disabled={isLoading}
                onFocus={createPlaceholderFocusHandler(email, 'ornek@email.com')}
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? '📤 Gönderiliyor...' : '📤 Kod Gönder'}
            </button>
          </form>
        )}

        {/* Stage 2: OTP */}
        {stage === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label>E-postanıza gönderilen 6 haneli kodu girin:</label>
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="otp-input"
                    maxLength={1}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              ✅ Kodu Doğrula
            </button>

            <div className="resend-section">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  🔄 Yeni Kod Gönder
                </button>
              ) : (
                <p className="resend-timer">
                  Yeni kod göndermek için {resendTimer} saniye bekleyin
                </p>
              )}
            </div>
          </form>
        )}

        {/* Stage 3: New Password */}
        {stage === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="auth-form">
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
        )}

        {/* Stage 4: Success */}
        {stage === 'success' && (
          <div className="success-stage">
            <div className="success-icon">✅</div>
            <h3>Şifreniz Başarıyla Güncellendi!</h3>
            <p>Artık yeni şifrenizle giriş yapabilirsiniz.</p>
            
            <button
              onClick={onBack}
              className="btn btn-primary"
            >
              🚀 Giriş Yap
            </button>
          </div>
        )}

        {/* Back button (except success stage) */}
        {stage !== 'success' && (
          <div className="auth-footer">
            <button 
              onClick={onBack}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              ← Geri Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;