import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import './index.css';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Bypass authentication - create a dummy user
    const dummyUser: User = {
      id: 'dummy-user',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User'
    };
    setUser(dummyUser);
    setLoading(false);
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App
