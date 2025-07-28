import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  googleId: string | null;
  createdAt: string;
  isGoogleUser: boolean;
  displayName: string;
}

interface UsersListResponse {
  success: boolean;
  users: User[];
  totalCount: number;
}

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<UsersListResponse>(`${API_URL}/api/admin/users`, {
        withCredentials: true
      });

      if (response.data.success) {
        setUsers(response.data.users);
        console.log('✅ Users fetched:', response.data.totalCount);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.response?.data?.error || 'Kullanıcı listesi alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getRegistrationSource = (user: User) => {
    return user.isGoogleUser ? 'Google' : 'Normal Kayıt';
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">👥 Kayıtlı Kullanıcılar</h2>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>📊 Kullanıcı listesi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">👥 Kayıtlı Kullanıcılar</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            color: '#dc2626'
          }}>
            <p><strong>❌ Hata:</strong> {error}</p>
            <button 
              onClick={fetchUsers}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">👥 Kayıtlı Kullanıcılar</h2>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Toplam: <strong>{users.length}</strong> kullanıcı
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {users.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '2px dashed #ddd'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>📭 Henüz kullanıcı kaydı yok</p>
            <p>İlk kullanıcının kaydolmasını bekleyin.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            {users.map((user, index) => (
              <div
                key={user.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                {/* Kullanıcı Numarası */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '15px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  #{index + 1}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '20px',
                  alignItems: 'start'
                }}>
                  {/* Ana Bilgiler */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: user.isGoogleUser ? '#4285f4' : '#10b981',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '20px',
                        fontWeight: 'bold'
                      }}>
                        {user.isGoogleUser ? '🇬' : user.displayName.charAt(0).toUpperCase()}
                      </div>
                      
                      <div>
                        <h3 style={{
                          margin: '0 0 4px 0',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#1f2937'
                        }}>
                          {user.displayName}
                        </h3>
                        <p style={{
                          margin: 0,
                          color: '#6b7280',
                          fontSize: '14px'
                        }}>
                          📧 {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Detay Bilgiler */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      marginTop: '16px'
                    }}>
                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          📅 Kayıt Tarihi
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {formatDate(user.createdAt)}
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          🔐 Kayıt Yöntemi
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '500',
                          color: user.isGoogleUser ? '#4285f4' : '#059669'
                        }}>
                          {getRegistrationSource(user)}
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          🆔 Kullanıcı ID
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '500',
                          fontFamily: 'monospace',
                          color: '#374151'
                        }}>
                          {user.id}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={fetchUsers}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            🔄 Listeyi Yenile
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersList;