import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

interface AnalyticsSummary {
  totalUsers: number;
  totalSessions: number;
  totalPDFDownloads: number;
  totalButtonClicks: number;
  averageSessionDuration: number;
}

interface Activity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  data: any;
  userDetails?: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

interface UserActivity {
  userId: string;
  totalActivities: number;
  pdfDownloads: number;
  buttonClicks: number;
  lastActivity: string;
  userDetails?: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  googleId?: string;
  createdAt: string;
  isGoogleUser: boolean;
  displayName: string;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  recentActivities: Activity[];
  userActivities: UserActivity[];
  databaseType?: string;
}

const AdminDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  // Debug: Log analytics data
  console.log('🔍 AdminDashboard: analyticsData:', analyticsData);
  console.log('🔍 AdminDashboard: typeof analyticsData:', typeof analyticsData);
  if (analyticsData) {
    console.log('🔍 AdminDashboard: recentActivities:', analyticsData.recentActivities);
    console.log('🔍 AdminDashboard: Array.isArray(recentActivities):', Array.isArray(analyticsData.recentActivities));
    console.log('🔍 AdminDashboard: userActivities:', analyticsData.userActivities);
    console.log('🔍 AdminDashboard: Array.isArray(userActivities):', Array.isArray(analyticsData.userActivities));
  }
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Debug: Log users array
  console.log('🔍 AdminDashboard: users:', users);
  console.log('🔍 AdminDashboard: typeof users:', typeof users);
  console.log('🔍 AdminDashboard: Array.isArray(users):', Array.isArray(users));

  useEffect(() => {
    fetchAnalytics();
    fetchUsers();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/api/admin/analytics`, {
        withCredentials: true
      });
      
      // Debug: Log analytics response
      console.log('🔍 AdminDashboard: fetchAnalytics response.data:', response.data);
      console.log('🔍 AdminDashboard: typeof response.data:', typeof response.data);
      
      // Ensure arrays exist in analytics data
      const safeAnalyticsData = {
        ...response.data,
        recentActivities: Array.isArray(response.data?.recentActivities) ? response.data.recentActivities : [],
        userActivities: Array.isArray(response.data?.userActivities) ? response.data.userActivities : []
      };
      
      setAnalyticsData(safeAnalyticsData);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      setError(error.response?.data?.error || 'Analytics verisi alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        withCredentials: true
      });
      
      // Debug: Log users response
      console.log('🔍 AdminDashboard: fetchUsers response.data:', response.data);
      console.log('🔍 AdminDashboard: typeof response.data:', typeof response.data);
      console.log('🔍 AdminDashboard: Array.isArray(response.data):', Array.isArray(response.data));
      
      // Server returns { users: [], totalCount: number }
      const usersData = response.data.users || response.data;
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const getActionText = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'user_login': '🔐 Kullanıcı Girişi',
      'user_register': '📝 Kullanıcı Kaydı',
      'user_logout': '🚪 Kullanıcı Çıkışı',
      'pdf_download': '📄 PDF İndirme',
      'button_click': '🖱️ Düğme Tıklama',
      'page_view': '👁️ Sayfa Görüntüleme',
      'feature_use': '⚡ Özellik Kullanımı',
      'session_start': '▶️ Oturum Başlatma',
      'session_end': '⏹️ Oturum Sonlandırma'
    };
    
    return actionMap[action] || action;
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-loading fade-in">
          <div className="admin-spinner"></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '10px' }}>
            Analytics Yükleniyor...
          </h2>
          <p style={{ opacity: 0.8 }}>Veriler hazırlanıyor, lütfen bekleyin</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="admin-error fade-in">
            <div className="admin-error-icon">⚠️</div>
            <h2 className="admin-error-title">Bir Sorun Oluştu</h2>
            <p style={{ marginBottom: '10px' }}>{error}</p>
            <p style={{ fontSize: '0.9rem', opacity: '0.8' }}>
              Veriler yüklenirken bir hata meydana geldi
            </p>
            <button 
              onClick={fetchAnalytics}
              className="admin-error-button"
            >
              🔄 Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="admin-error fade-in">
            <div className="admin-error-icon">📊</div>
            <h2 className="admin-error-title">Veri Bulunamadı</h2>
            <p>Analytics verisi henüz mevcut değil</p>
            <button 
              onClick={fetchAnalytics}
              className="admin-error-button"
            >
              🔄 Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header fade-in">
          <div className="admin-header-content">
            <div>
              <h1 className="admin-title">📊 Analytics Dashboard</h1>
              <p className="admin-subtitle">
                Kullanıcı aktiviteleri ve detaylı site istatistikleri
              </p>
            </div>
            <div className="database-info">
              <div className={`database-badge ${analyticsData?.databaseType === 'PostgreSQL' ? 'badge-postgres' : 'badge-sqlite'}`}>
                {analyticsData?.databaseType === 'PostgreSQL' ? '🐘 PostgreSQL' : '📝 SQLite'}
              </div>
              <div className="database-status">
                {analyticsData?.databaseType === 'PostgreSQL' 
                  ? '✅ Kalıcı Veritabanı' 
                  : '⚠️ Geçici Veritabanı'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid slide-in-left">
          <div className="summary-card hover-scale">
            <div className="card-header">
              <div className="card-icon">👥</div>
              <div className="card-content">
                <h3>Toplam Kullanıcı</h3>
                <p className="card-value">{analyticsData.summary.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="summary-card hover-scale">
            <div className="card-header">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <h3>Toplam Oturum</h3>
                <p className="card-value">{analyticsData.summary.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="summary-card hover-scale">
            <div className="card-header">
              <div className="card-icon">📄</div>
              <div className="card-content">
                <h3>PDF İndirme</h3>
                <p className="card-value">{analyticsData.summary.totalPDFDownloads}</p>
              </div>
            </div>
          </div>

          <div className="summary-card hover-scale">
            <div className="card-header">
              <div className="card-icon">🖱️</div>
              <div className="card-content">
                <h3>Düğme Tıklama</h3>
                <p className="card-value">{analyticsData.summary.totalButtonClicks}</p>
              </div>
            </div>
          </div>

          <div className="summary-card hover-scale">
            <div className="card-header">
              <div className="card-icon">⏱️</div>
              <div className="card-content">
                <h3>Ortalama Süre</h3>
                <p className="card-value">{analyticsData.summary.averageSessionDuration}dk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities - Full Width */}
        <div className="analytics-panel slide-in-left">
          <div className="panel-header">
            <h2 className="panel-title">Son Aktiviteler</h2>
          </div>
          <div className="panel-content">
            <div className="activity-list">
              {(analyticsData?.recentActivities || []).map((activity, index) => (
                <div key={activity.id} className="activity-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="activity-header">
                    <div className="activity-action">
                      {getActionText(activity.action)}
                    </div>
                    <div className="activity-time">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                  <div className="activity-user">
                    👤 {activity.userDetails ? activity.userDetails.displayName : (activity.userId === 'guest' ? 'Misafir Kullanıcı' : `Kullanıcı: ${activity.userId}`)}
                    {activity.userDetails && activity.userDetails.email !== activity.userDetails.displayName && (
                      <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                        📧 {activity.userDetails.email}
                      </div>
                    )}
                  </div>
                  {activity.data && Object.keys(activity.data).length > 0 && (
                    <div className="activity-data">
                      {JSON.stringify(activity.data, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Combined User Details Table */}
        <div className="user-details-section fade-in">
          <div className="user-table-container">
            <div className="user-table-header">
              <h2 className="user-table-title">👥 Kullanıcı Detayları & İstatistikleri</h2>
              <p className="user-table-subtitle">
                Tüm kullanıcıların kayıt bilgileri ve aktivite istatistikleri
              </p>
              <div className="user-count-badge">
                {usersLoading ? '...' : users.length} Kayıtlı + {(analyticsData?.userActivities || []).filter(u => u.userId === 'guest').length} Misafir
              </div>
            </div>
            <div className="user-table-content">
              {usersLoading ? (
                <div className="table-loading">
                  <div className="loading-spinner"></div>
                  <p>Kullanıcılar yükleniyor...</p>
                </div>
              ) : (
                <table className="user-table">
                  <thead className="table-header">
                    <tr>
                      <th>Kullanıcı Bilgileri</th>
                      <th>Kayıt Tipi</th>
                      <th>Kayıt Tarihi</th>
                      <th>Aktivite</th>
                      <th>PDF</th>
                      <th>Tıklama</th>
                      <th>Son Görülme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Registered Users with Activity Data */}
                    {(users || []).map((user, index) => {
                      // Find corresponding activity data for this user
                      const userActivity = (analyticsData?.userActivities || []).find(activity => 
                        activity.userDetails?.email === user.email || activity.userId === user.id
                      );
                      
                      const userInitials = user.displayName.substring(0, 2).toUpperCase();
                      const hasActivity = !!userActivity;
                      const isRecentlyActive = userActivity && new Date().getTime() - new Date(userActivity.lastActivity).getTime() < 24 * 60 * 60 * 1000;
                      
                      return (
                        <tr key={user.id} className="table-row" style={{ animationDelay: `${index * 0.1}s` }}>
                          <td className="table-cell">
                            <div className="user-avatar">
                              <div className="avatar-icon">
                                {user.isGoogleUser ? '🌐' : userInitials}
                              </div>
                              <div className="user-info">
                                <div className="user-name">
                                  {user.displayName}
                                </div>
                                <div className="user-email">
                                  {user.email}
                                </div>
                                <div className="user-id" style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                                  ID: {user.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className={`user-type-badge ${user.isGoogleUser ? 'badge-google' : 'badge-email'}`}>
                              {user.isGoogleUser ? '🌐 Google' : '📧 Email'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="date-info">
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="stat-number">{userActivity?.totalActivities || 0}</div>
                            <div className="stat-label">Toplam</div>
                          </td>
                          <td className="table-cell">
                            <div className="stat-number">{userActivity?.pdfDownloads || 0}</div>
                            <div className="stat-label">İndirme</div>
                          </td>
                          <td className="table-cell">
                            <div className="stat-number">{userActivity?.buttonClicks || 0}</div>
                            <div className="stat-label">Tık</div>
                          </td>
                          <td className="table-cell">
                            {hasActivity ? (
                              <div className="last-seen">
                                <span className={`status-indicator ${isRecentlyActive ? 'status-online' : 'status-offline'}`}></span>
                                {formatDate(userActivity.lastActivity)}
                                {isRecentlyActive && (
                                  <span className="recent-badge">AKTİF</span>
                                )}
                              </div>
                            ) : (
                              <div className="last-seen" style={{ color: '#9ca3af' }}>
                                <span className="status-indicator status-offline"></span>
                                Aktivite yok
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Guest Users with Activity Data */}
                    {(analyticsData?.userActivities || [])
                      .filter(user => user.userId === 'guest' || !users.find(u => u.id === user.userId || u.email === user.userDetails?.email))
                      .map((user, index) => {
                        const isGuest = user.userId === 'guest';
                        const displayName = isGuest ? 'Misafir Kullanıcı' : (user.userDetails?.displayName || user.userId);
                        const userInitials = isGuest ? 'G' : (user.userDetails?.displayName?.substring(0, 2).toUpperCase() || 'U');
                        const isRecentlyActive = new Date().getTime() - new Date(user.lastActivity).getTime() < 24 * 60 * 60 * 1000;
                        
                        return (
                          <tr key={`guest-${user.userId}-${index}`} className="table-row" style={{ animationDelay: `${(users.length + index) * 0.1}s` }}>
                            <td className="table-cell">
                              <div className="user-avatar">
                                <div className="avatar-icon">
                                  {userInitials}
                                </div>
                                <div className="user-info">
                                  <div className="user-name">
                                    {displayName}
                                  </div>
                                  <div className="user-email">
                                    {isGuest ? 'Anonim Kullanıcı' : (user.userDetails?.email || 'Bilinmeyen')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="user-type-badge badge-guest">
                                👤 Misafir
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="date-info" style={{ color: '#9ca3af' }}>
                                Kayıtsız
                              </div>
                            </td>
                            <td className="table-cell">
                              <div className="stat-number">{user.totalActivities}</div>
                              <div className="stat-label">Toplam</div>
                            </td>
                            <td className="table-cell">
                              <div className="stat-number">{user.pdfDownloads}</div>
                              <div className="stat-label">İndirme</div>
                            </td>
                            <td className="table-cell">
                              <div className="stat-number">{user.buttonClicks}</div>
                              <div className="stat-label">Tık</div>
                            </td>
                            <td className="table-cell">
                              <div className="last-seen">
                                <span className={`status-indicator ${isRecentlyActive ? 'status-online' : 'status-offline'}`}></span>
                                {formatDate(user.lastActivity)}
                                {isRecentlyActive && (
                                  <span className="recent-badge">AKTİF</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="refresh-section fade-in">
          <button
            onClick={() => {
              fetchAnalytics();
              fetchUsers();
            }}
            className="refresh-button"
          >
            🔄 Verileri Yenile
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;