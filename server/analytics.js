const fs = require('fs-extra');
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');

// Analytics functions
const loadAnalytics = async () => {
    try {
        return await fs.readJson(ANALYTICS_FILE);
    } catch (error) {
        return { sessions: [], activities: [] };
    }
};

const saveAnalytics = async (analytics) => {
    await fs.writeJson(ANALYTICS_FILE, analytics, { spaces: 2 });
};

// Track user session/activity
const trackSession = async (userId, action, data = {}) => {
    try {
        const analytics = await loadAnalytics();
        const sessionData = {
            id: Date.now().toString(),
            userId: userId || 'guest',
            action, // 'login', 'logout', 'activity'
            timestamp: new Date().toISOString(),
            data
        };
        
        if (action === 'login') {
            analytics.sessions.push({
                ...sessionData,
                sessionStart: new Date().toISOString()
            });
        } else if (action === 'activity') {
            analytics.activities.push(sessionData);
        }
        
        await saveAnalytics(analytics);
        console.log(`📊 Tracked: ${action} for user ${userId}`);
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
};

// Get analytics summary for admin dashboard
const getAnalyticsSummary = async (users) => {
    try {
        const analytics = await loadAnalytics();
        
        const stats = {
            totalUsers: users.length,
            totalSessions: analytics.sessions.length,
            totalActivities: analytics.activities.length,
            recentSessions: analytics.sessions.slice(-10).reverse(),
            recentActivities: analytics.activities.slice(-20).reverse(),
            
            // User statistics
            userStats: users.map(user => {
                const userSessions = analytics.sessions.filter(s => s.userId === user.id);
                const userActivities = analytics.activities.filter(a => a.userId === user.id);
                
                // Specific activity counts
                const pdfDownloads = userActivities.filter(a => a.data.type === 'pdf_download');
                const buttonClicks = userActivities.filter(a => a.data.type === 'button_click');
                const pageViews = userActivities.filter(a => a.data.type === 'page_view');
                
                return {
                    id: user.id,
                    email: user.email || user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    createdAt: user.createdAt,
                    sessionCount: userSessions.length,
                    totalActivities: userActivities.length,
                    pdfDownloads: pdfDownloads.length,
                    buttonClicks: buttonClicks.length,
                    pageViews: pageViews.length,
                    lastLogin: userSessions.length > 0 ? userSessions[userSessions.length - 1].timestamp : null,
                    
                    // Session duration calculation (approximate)
                    avgSessionDuration: userSessions.length > 0 ? 
                        calculateAvgSessionDuration(userActivities) : 0
                };
            }).sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0)),
            
            // Activity summary
            activitySummary: {
                pdfDownloads: analytics.activities.filter(a => a.data.type === 'pdf_download').length,
                buttonClicks: analytics.activities.filter(a => a.data.type === 'button_click').length,
                pageViews: analytics.activities.filter(a => a.data.type === 'page_view').length
            }
        };
        
        return stats;
    } catch (error) {
        console.error('Analytics summary error:', error);
        return null;
    }
};

// Calculate average session duration for a user
const calculateAvgSessionDuration = (activities) => {
    if (activities.length < 2) return 0;
    
    // Simple calculation: time between first and last activity
    const timestamps = activities.map(a => new Date(a.timestamp)).sort();
    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    return Math.round(duration / 1000 / 60); // Return in minutes
};

module.exports = {
    trackSession,
    getAnalyticsSummary,
    loadAnalytics,
    saveAnalytics
};