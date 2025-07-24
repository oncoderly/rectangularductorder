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
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }, []);

  const trackPageView = useCallback((page: string) => {
    track('page_view', { page });
  }, [track]);

  const trackPDFDownload = useCallback((filename: string, userId?: string) => {
    track('pdf_download', { filename, userId });
  }, [track]);

  const trackButtonClick = useCallback((buttonName: string, location?: string) => {
    track('button_click', { buttonName, location });
  }, [track]);

  const trackFeatureUse = useCallback((feature: string, details?: AnalyticsData) => {
    track('feature_use', { feature, ...details });
  }, [track]);

  const trackSessionStart = useCallback(() => {
    track('session_start');
  }, [track]);

  const trackSessionEnd = useCallback(() => {
    track('session_end');
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