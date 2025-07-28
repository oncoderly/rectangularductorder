import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PartSelector from './PartSelector';
import OrderList from './OrderList';
import UsersList from './UsersList';
import { useAnalytics } from '../hooks/useAnalytics';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface PartMeasurement {
  [key: string]: number | string;
}

interface PartCheckbox {
  [key: string]: boolean;
}

interface SelectedPart {
  id: string;
  partKey: string;
  name: string;
  image: string;
  measurements: PartMeasurement;
  checkboxes: PartCheckbox;
  directions?: { [key: string]: number };
  diameters?: { [key: string]: number };
  materialType: string;
  quantity: number;
  notes?: string;
}

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onRequireAuth?: () => void;
  isGuest?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onRequireAuth, isGuest = false }) => {
  console.log('🏠 Dashboard: Component initializing with props - user:', !!user, 'isGuest:', isGuest);
  const [orderList, setOrderList] = useState<SelectedPart[]>([]);
  const [showUsersList, setShowUsersList] = useState(false);
  const { trackPageView, trackButtonClick, trackSessionStart } = useAnalytics();
  console.log('🏠 Dashboard: orderList length:', orderList.length);

  useEffect(() => {
    // Her kullanıcı için ayrı sipariş listesi veya misafir modu için genel liste
    const storageKey = user ? `rectangularDuctOrder_${user.id}` : 'rectangularDuctOrder_guest';
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        setOrderList(JSON.parse(savedOrder));
      } catch (error) {
        console.error('Saved order parsing error:', error);
        localStorage.removeItem(storageKey);
      }
    } else {
      // İlk giriş - sipariş listesini boşalt
      setOrderList([]);
    }
  }, [user]); // user değiştiğinde çalışsın

  useEffect(() => {
    // Track page view and session start only once
    trackPageView('dashboard');
    trackSessionStart();
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    // Her kullanıcı için ayrı sipariş listesi kaydet
    const storageKey = user ? `rectangularDuctOrder_${user.id}` : 'rectangularDuctOrder_guest';
    localStorage.setItem(storageKey, JSON.stringify(orderList));
  }, [orderList, user]);

  const handleAddPart = (part: SelectedPart) => {
    setOrderList(prev => [...prev, part]);
  };

  const handleRemovePart = (partId: string) => {
    setOrderList(prev => prev.filter(p => p.id !== partId));
  };

  const handleClearAll = () => {
    setOrderList([]);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/logout`, {}, {
        withCredentials: true
      });
      // Kullanıcı çıkış yaparken kendi sipariş listesini temizlemiyoruz - saklanır
      // localStorage.removeItem(`rectangularDuctOrder_${user?.id}`);
      onLogout();
    } catch (error) {
      console.error('Çıkış hatası:', error);
      onLogout(); // Logout even if request fails
    }
  };

  console.log('🎨 Dashboard: About to render Dashboard component');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="dashboard-header">
        <div className="dashboard-header-container">
          <div className="dashboard-header-content">
            <div className="dashboard-title-section">
              <h1 className="dashboard-main-title">
                Kare Kanal Sipariş Uygulaması
              </h1>
              <p className="dashboard-subtitle">Hava kanalı parça sipariş sistemi</p>
            </div>
            <div className="dashboard-auth-section">
              {isGuest ? (
                <>
                  <div className="dashboard-guest-badge">
                    <span className="dashboard-guest-text">
                      👤 Misafir Modu
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      trackButtonClick('login_button', 'dashboard_header');
                      onRequireAuth?.();
                    }}
                    className="dashboard-login-btn"
                  >
                    🚀 Giriş Yap
                  </button>
                </>
              ) : user ? (
                <>
                  <div className="dashboard-user-section">
                    <span className="dashboard-user-text">
                      <span className="hidden sm:inline">Hoşgeldin, </span>
                      <span className="font-bold">{user.firstName}</span>
                      <span className="hidden sm:inline"> {user.lastName}!</span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      trackButtonClick('users_list_toggle', 'dashboard_header');
                      setShowUsersList(!showUsersList);
                    }}
                    className="dashboard-users-btn"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: showUsersList ? '#059669' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginRight: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    👥 {showUsersList ? 'Sipariş Paneli' : 'Kullanıcı Listesi'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="dashboard-logout-btn"
                  >
                    Çıkış Yap
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        {showUsersList ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
            <UsersList />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <PartSelector onAddPart={handleAddPart} />
            <OrderList 
              orderList={orderList} 
              user={user} 
              onRemovePart={handleRemovePart} 
              onClearAll={handleClearAll}
              onRequireAuth={onRequireAuth}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;