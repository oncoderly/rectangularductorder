import React, { useState } from 'react';
import axios from 'axios';

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
          await axios.post(`http://localhost:3000${endpoint}`, payload);
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

      const response = await axios.post(`http://localhost:3000${endpoint}`, payload, {
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
      window.location.href = 'http://localhost:3000/api/auth/google';
    } catch (error: any) {
      setError('Google ile giriş başarısız');
    }
  };

  const resetPhoneStep = () => {
    setPhoneStep('phone');
    setOtp('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 backdrop-blur-sm">
        <div>
          <div className="text-center mb-8">
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🏭</span>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
              Air Duct Order
            </h2>
            <p className="text-slate-500 text-sm font-medium">Hava Kanalı Sipariş Sistemi</p>
          </div>
          
          {/* Auth Method Selection */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-slate-100 rounded-2xl p-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); resetPhoneStep(); }}
                className={`flex items-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  authMethod === 'email'
                    ? 'bg-white text-slate-800 shadow-lg shadow-slate-200/50 scale-105'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="mr-2 text-lg">📧</span>
                E-posta
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); resetPhoneStep(); }}
                className={`flex items-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  authMethod === 'phone'
                    ? 'bg-white text-slate-800 shadow-lg shadow-slate-200/50 scale-105'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="mr-2 text-lg">📱</span>
                Telefon
              </button>
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {isLogin ? 'Hoş Geldiniz!' : 'Hesap Oluşturun'}
            </h3>
            <p className="text-slate-500 text-sm">
              {isLogin ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}
            </p>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="group w-full flex items-center justify-center px-6 py-4 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center">
            <div className="w-6 h-6 mr-3 rounded-full bg-white shadow-sm flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <span className="group-hover:text-slate-800 transition-colors">
              Google ile {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </span>
          </div>
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-400 font-medium">veya</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email Auth Fields */}
          {authMethod === 'email' && (
            <div className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    name="firstName"
                    type="text"
                    required
                    className="block w-full px-5 py-4 border-2 border-slate-200 placeholder-slate-400 text-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                    placeholder="Ad"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                  <input
                    name="lastName"
                    type="text"
                    required
                    className="block w-full px-5 py-4 border-2 border-slate-200 placeholder-slate-400 text-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
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
                className="block w-full px-5 py-4 border-2 border-slate-200 placeholder-slate-400 text-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                placeholder="E-posta adresi"
                value={formData.email}
                onChange={handleChange}
              />
              <input
                name="password"
                type="password"
                required
                className="block w-full px-5 py-4 border-2 border-slate-200 placeholder-slate-400 text-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                placeholder="Şifre"
                value={formData.password}
                onChange={handleChange}
              />
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm text-center p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                İşleniyor...
              </div>
            ) : (
              <>
                {authMethod === 'phone' && phoneStep === 'phone' ? (
                  <>📱 SMS Kodu Gönder</>
                ) : authMethod === 'phone' && phoneStep === 'otp' ? (
                  <>🔐 Kodu Doğrula</>
                ) : (
                  <>{isLogin ? '🔑 Giriş Yap' : '📝 Kayıt Ol'}</>
                )}
              </>
            )}
          </button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); resetPhoneStep(); }}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
            >
              {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Hesabınız var mı? Giriş yapın'}
            </button>
          </div>
        </form>

        {/* Misafir Modu ve Modal Kapatma Butonları */}
        <div className="text-center space-y-3 mt-6">
          {onGuestMode && !isModal && (
            <button
              type="button"
              onClick={onGuestMode}
              className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all"
            >
              <span className="text-lg mr-2">👤</span>
              Misafir Olarak Devam Et
              <div className="text-xs text-gray-500 mt-1 block w-full">
                (PDF indirmek için giriş gerekir)
              </div>
            </button>
          )}
          
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              ✕ Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;