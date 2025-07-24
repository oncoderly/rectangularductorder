import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analytics verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hata</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Analytics verisi bulunamadı</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Kullanıcı aktiviteleri ve site istatistikleri</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl">👥</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl">📊</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Oturum</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl">📄</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">PDF İndirme</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalPDFDownloads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl">🖱️</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Düğme Tıklama</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalButtonClicks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl">⏱️</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ortalama Süre</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.averageSessionDuration}dk</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Son Aktiviteler</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {analyticsData.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {getActionText(activity.action)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Kullanıcı: {activity.userId === 'guest' ? 'Misafir' : activity.userId}
                      </p>
                      {activity.data && Object.keys(activity.data).length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(activity.data, null, 2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Kullanıcı Aktiviteleri</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {analyticsData.userActivities.map((user) => (
                  <div key={user.userId} className="p-4 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {user.userId === 'guest' ? '👤 Misafir' : `👤 ${user.userId}`}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Son: {formatDate(user.lastActivity)}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Toplam Aktivite</p>
                        <p className="font-semibold">{user.totalActivities}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">PDF İndirme</p>
                        <p className="font-semibold">{user.pdfDownloads}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Düğme Tıklama</p>
                        <p className="font-semibold">{user.buttonClicks}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Verileri Yenile
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;