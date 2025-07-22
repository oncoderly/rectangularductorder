import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PartSelector from './PartSelector';
import OrderList from './OrderList';

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
  quantity: number;
}

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onRequireAuth?: () => void;
  isGuest?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onRequireAuth, isGuest = false }) => {
  const [orderList, setOrderList] = useState<SelectedPart[]>([]);

  useEffect(() => {
    const savedOrder = localStorage.getItem('rectangularDuctOrder');
    if (savedOrder) {
      try {
        setOrderList(JSON.parse(savedOrder));
      } catch (error) {
        console.error('Saved order parsing error:', error);
        localStorage.removeItem('rectangularDuctOrder');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rectangularDuctOrder', JSON.stringify(orderList));
  }, [orderList]);

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
      await axios.post('http://localhost:5050/api/logout', {}, {
        withCredentials: true
      });
      localStorage.removeItem('rectangularDuctOrder');
      onLogout();
    } catch (error) {
      console.error('Çıkış hatası:', error);
      onLogout(); // Logout even if request fails
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  Rectangular Duct Order
                </h1>
                <p className="text-xs text-blue-600 font-medium hidden sm:block">Hava kanalı parça sipariş sistemi</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isGuest ? (
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-to-r from-orange-100 to-yellow-100 px-2 sm:px-4 py-1 sm:py-2 rounded-lg">
                    <span className="text-orange-800 font-medium text-xs sm:text-sm">
                      👤 Misafir Modu
                    </span>
                  </div>
                  <button
                    onClick={() => onRequireAuth?.()}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 sm:px-6 py-1 sm:py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
                  >
                    <span className="sm:hidden">Giriş</span>
                    <span className="hidden sm:inline">Giriş Yap</span>
                  </button>
                </div>
              ) : user ? (
                <>
                  <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-2 sm:px-4 py-1 sm:py-2 rounded-lg">
                    <span className="text-blue-800 font-medium text-xs sm:text-sm">
                      <span className="hidden sm:inline">Hoşgeldin, </span>
                      <span className="font-bold">{user.firstName}</span>
                      <span className="hidden sm:inline"> {user.lastName}!</span>
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 sm:px-6 py-1 sm:py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
                  >
                    <span className="sm:hidden">Çıkış</span>
                    <span className="hidden sm:inline">Çıkış Yap</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
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
      </main>
    </div>
  );
};

export default Dashboard;