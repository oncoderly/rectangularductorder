import { useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

interface AnalyticsData {
  [key: string]: any;
}

export const useAnalytics = () => {
  const track = useCallback(async (action: string, data: AnalyticsData = {}) => {
    try {
      await axios.post(`${API_URL}/api/track`, {
        action,
        data
      }, {
        withCredentials: true
      });
    } catch (error: any) {
      // Silently fail for analytics - don't break the app
      if (error.response?.status === 401) {
        console.log('Analytics: User not authenticated, tracking as guest');
      } else {
        console.error('Analytics tracking failed:', error);
      }
    }
  }, []);

  const trackPageView = useCallback((page: string) => {
    track('page_view', { page }).catch(() => {}); // Silently fail
  }, [track]);

  const trackPDFDownload = useCallback((filename: string, userId?: string) => {
    track('pdf_download', { filename, userId }).catch(() => {}); // Silently fail
  }, [track]);

  const trackButtonClick = useCallback((buttonName: string, location?: string) => {
    track('button_click', { buttonName, location }).catch(() => {}); // Silently fail
  }, [track]);

  const trackFeatureUse = useCallback((feature: string, details?: AnalyticsData) => {
    track('feature_use', { feature, ...details }).catch(() => {}); // Silently fail
  }, [track]);

  const trackSessionStart = useCallback(() => {
    track('session_start').catch(() => {}); // Silently fail
  }, [track]);

  const trackSessionEnd = useCallback(() => {
    track('session_end').catch(() => {}); // Silently fail
  }, [track]);

  return {
    track,
    trackPageView,
    trackPDFDownload,
    trackButtonClick,
    trackFeatureUse,
    trackSessionStart,
    trackSessionEnd
  };
};

export default useAnalytics;