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
}

interface UserActivity {
  userId: string;
  totalActivities: number;
  pdfDownloads: number;
  buttonClicks: number;
  lastActivity: string;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  recentActivities: Activity[];
  userActivities: UserActivity[];
}

const AdminDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/api/admin/analytics`, {
        withCredentials: true
      });
      
      setAnalyticsData(response.data);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      setError(error.response?.data?.error || 'Analytics verisi alınamadı');
    } finally {
      setLoading(false);
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
          <h1 className="admin-title">📊 Analytics Dashboard</h1>
          <p className="admin-subtitle">
            Kullanıcı aktiviteleri ve detaylı site istatistikleri
          </p>
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

        <div className="analytics-grid">
          {/* Recent Activities */}
          <div className="analytics-panel slide-in-left">
            <div className="panel-header">
              <h2 className="panel-title">Son Aktiviteler</h2>
            </div>
            <div className="panel-content">
              <div className="activity-list">
                {analyticsData.recentActivities.map((activity, index) => (
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
                      👤 {activity.userId === 'guest' ? 'Misafir Kullanıcı' : `Kullanıcı: ${activity.userId}`}
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

          {/* User Activities */}
          <div className="analytics-panel slide-in-right">
            <div className="panel-header">
              <h2 className="panel-title">Kullanıcı İstatistikleri</h2>
            </div>
            <div className="panel-content">
              <div className="user-list">
                {analyticsData.userActivities.map((user, index) => (
                  <div key={user.userId} className="user-item" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="user-header">
                      <div className="user-name">
                        {user.userId === 'guest' ? 'Misafir Kullanıcı' : user.userId}
                      </div>
                      <div className="user-last-activity">
                        Son: {formatDate(user.lastActivity)}
                      </div>
                    </div>
                    <div className="user-stats">
                      <div className="stat-item">
                        <div className="stat-label">Toplam Aktivite</div>
                        <div className="stat-value">{user.totalActivities}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">PDF İndirme</div>
                        <div className="stat-value">{user.pdfDownloads}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Düğme Tıklama</div>
                        <div className="stat-value">{user.buttonClicks}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* User Details Table */}
        <div className="user-details-section fade-in">
          <div className="user-table-container">
            <div className="user-table-header">
              <h2 className="user-table-title">Kullanıcı Detayları</h2>
              <p className="user-table-subtitle">
                Tüm kullanıcıların detaylı aktivite bilgileri
              </p>
            </div>
            <div className="user-table-content">
              <table className="user-table">
                <thead className="table-header">
                  <tr>
                    <th>Kullanıcı</th>
                    <th>Tip</th>
                    <th>Giriş Sayısı</th>
                    <th>PDF İndirme</th>
                    <th>Tıklama</th>
                    <th>Toplam Aktivite</th>
                    <th>Son Görülme</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.userActivities.map((user, index) => {
                    const isGuest = user.userId === 'guest';
                    const userInitials = isGuest ? 'G' : user.userId.substring(0, 2).toUpperCase();
                    const isRecentlyActive = new Date().getTime() - new Date(user.lastActivity).getTime() < 24 * 60 * 60 * 1000; // Son 24 saat
                    
                    return (
                      <tr key={user.userId} className="table-row" style={{ animationDelay: `${index * 0.1}s` }}>
                        <td className="table-cell">
                          <div className="user-avatar">
                            <div className="avatar-icon">
                              {userInitials}
                            </div>
                            <div className="user-info">
                              <div className="user-name">
                                {isGuest ? 'Misafir Kullanıcı' : user.userId}
                              </div>
                              <div className="user-email">
                                {isGuest ? 'Anonymous User' : `${user.userId}@example.com`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`user-type-badge ${isGuest ? 'badge-guest' : 'badge-registered'}`}>
                            {isGuest ? 'Misafir' : 'Kayıtlı'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="stat-number">
                            {Math.floor(user.totalActivities * 0.3)} {/* Yaklaşık giriş sayısı */}
                          </div>
                          <div className="stat-label">Giriş</div>
                        </td>
                        <td className="table-cell">
                          <div className="stat-number">{user.pdfDownloads}</div>
                          <div className="stat-label">PDF</div>
                        </td>
                        <td className="table-cell">
                          <div className="stat-number">{user.buttonClicks}</div>
                          <div className="stat-label">Tıklama</div>
                        </td>
                        <td className="table-cell">
                          <div className="stat-number">{user.totalActivities}</div>
                          <div className="stat-label">Aktivite</div>
                        </td>
                        <td className="table-cell">
                          <div className="last-seen">
                            <span className={`status-indicator ${isRecentlyActive ? 'status-online' : 'status-offline'}`}></span>
                            {formatDate(user.lastActivity)}
                            {isRecentlyActive && (
                              <span className="recent-badge">YENİ</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="refresh-section fade-in">
          <button
            onClick={fetchAnalytics}
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