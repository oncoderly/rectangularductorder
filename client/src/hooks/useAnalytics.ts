import { useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

export const useAnalytics = () => {
    const track = useCallback(async (action: string, data: any = {}) => {
        try {
            await axios.post(`${API_URL}/api/track`, {
                action,
                data: {
                    type: action,
                    ...data,
                    timestamp: new Date().toISOString(),
                    url: window.location.pathname
                }
            }, { withCredentials: true });
        } catch (error) {
            console.error('Analytics tracking error:', error);
        }
    }, []);

    // Specific tracking methods
    const trackPDFDownload = useCallback((pdfName: string) => {
        track('pdf_download', { pdfName });
    }, [track]);

    const trackButtonClick = useCallback((buttonName: string, context?: string) => {
        track('button_click', { buttonName, context });
    }, [track]);

    const trackPageView = useCallback((pageName: string) => {
        track('page_view', { pageName });
    }, [track]);

    const trackPartSelection = useCallback((partName: string, specifications?: any) => {
        track('part_selection', { partName, specifications });
    }, [track]);

    const trackOrderCreated = useCallback((orderData: any) => {
        track('order_created', { 
            itemCount: orderData.length,
            orderItems: orderData.map((item: any) => item.name)
        });
    }, [track]);

    return {
        track,
        trackPDFDownload,
        trackButtonClick,
        trackPageView,
        trackPartSelection,
        trackOrderCreated
    };
};