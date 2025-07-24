import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

interface AnalyticsData {
    totalUsers: number;
    totalSessions: number;
    totalActivities: number;
    userStats: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        sessionCount: number;
        totalActivities: number;
        pdfDownloads: number;
        buttonClicks: number;
        lastLogin: string;
        avgSessionDuration: number;
    }>;
    activitySummary: {
        pdfDownloads: number;
        buttonClicks: number;
        pageViews: number;
    };
    recentActivities: Array<any>;
}

const AdminDashboard: React.FC = () => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAnalytics();
        // Auto refresh every 30 seconds
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/analytics`, {
                withCredentials: true
            });
            setAnalytics(response.data);
            setError('');
        } catch (error) {
            setError('Analytics yüklenemedi');
            console.error('Analytics fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Hiç';
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Analytics yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600 text-xl">{error}</div>
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">📊 Site Analytics</h1>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-2xl">👥</div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">Toplam Kullanıcı</p>
                                <p className="text-2xl font-semibold text-gray-900">{analytics.totalUsers}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-2xl">🔐</div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">Toplam Oturum</p>
                                <p className="text-2xl font-semibold text-gray-900">{analytics.totalSessions}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-2xl">📄</div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">PDF İndirme</p>
                                <p className="text-2xl font-semibold text-gray-900">{analytics.activitySummary.pdfDownloads}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-2xl">🖱️</div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">Buton Tıklama</p>
                                <p className="text-2xl font-semibold text-gray-900">{analytics.activitySummary.buttonClicks}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Statistics Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Kullanıcı İstatistikleri</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Kullanıcı
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Son Giriş
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Oturum Sayısı
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        PDF İndirme
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Toplam Aktivite
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Süre (dk)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analytics.userStats.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500 ml-2">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(user.lastLogin)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.sessionCount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {user.pdfDownloads}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.totalActivities}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.avgSessionDuration}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Son Aktiviteler</h2>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <div className="divide-y divide-gray-200">
                            {analytics.recentActivities.map((activity, index) => (
                                <div key={index} className="px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="text-lg mr-3">
                                                {activity.data.type === 'pdf_download' ? '📄' :
                                                 activity.data.type === 'button_click' ? '🖱️' :
                                                 activity.data.type === 'page_view' ? '👁️' : '⚡'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {activity.data.type === 'pdf_download' ? `PDF İndirildi: ${activity.data.pdfName}` :
                                                     activity.data.type === 'button_click' ? `Buton: ${activity.data.buttonName}` :
                                                     activity.data.type === 'page_view' ? `Sayfa: ${activity.data.pageName}` :
                                                     activity.data.type}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Kullanıcı: {activity.userId === 'guest' ? 'Ziyaretçi' : activity.userId}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDate(activity.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;