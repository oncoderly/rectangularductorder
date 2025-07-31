const fs = require('fs-extra');
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');

// Check if we're using PostgreSQL
const isPostgreSQL = () => {
    return process.env.NODE_ENV === 'production' && process.env.DATABASE_URL;
};

// Load analytics data (PostgreSQL or file-based)
const loadAnalytics = async () => {
    if (isPostgreSQL()) {
        try {
            const databaseModule = require('./database-selector');
            await databaseModule.waitForInit();
            const { analyticsDB } = databaseModule;
            
            if (analyticsDB && analyticsDB.getAnalyticsSummary) {
                return await analyticsDB.getAnalyticsSummary();
            }
        } catch (error) {
            console.error('PostgreSQL analytics failed, falling back to file:', error.message);
        }
    }
    
    // Fallback to file-based analytics
    try {
        return await fs.readJson(ANALYTICS_FILE);
    } catch (error) {
        return {
            sessions: [],
            summary: {
                totalUsers: 0,
                totalSessions: 0,
                totalPDFDownloads: 0,
                totalButtonClicks: 0,
                averageSessionDuration: 0
            }
        };
    }
};

// Save analytics data (PostgreSQL or file-based)
const saveAnalytics = async (data) => {
    if (isPostgreSQL()) {
        try {
            const databaseModule = require('./database-selector');
            await databaseModule.waitForInit();
            const { analyticsDB } = databaseModule;
            
            if (analyticsDB && analyticsDB.saveAnalytics) {
                // For PostgreSQL, we don't need to save the entire analytics object
                // Individual tracking is handled by trackSession
                return;
            }
        } catch (error) {
            console.error('PostgreSQL analytics save failed, falling back to file:', error.message);
        }
    }
    
    // Fallback to file-based analytics
    await fs.writeJson(ANALYTICS_FILE, data, { spaces: 2 });
};

// Clean old analytics data (keep last 12 months)
const cleanOldAnalytics = (sessions) => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    return sessions.filter(session => {
        const sessionDate = new Date(session.timestamp);
        return sessionDate >= twelveMonthsAgo;
    });
};

// Track user session/activity
const trackSession = async (userId, action, data = {}) => {
    try {
        if (isPostgreSQL()) {
            try {
                const databaseModule = require('./database-selector');
                await databaseModule.waitForInit();
                const { analyticsDB } = databaseModule;
                
                if (analyticsDB && analyticsDB.saveAnalytics) {
                    await analyticsDB.saveAnalytics(userId, action, data, null, null);
                    console.log(`📊 PostgreSQL Analytics: Tracked ${action} for user ${userId}`);
                    return;
                }
            } catch (error) {
                console.error('PostgreSQL analytics tracking failed, falling back to file:', error.message);
            }
        }
        
        // Fallback to file-based analytics
        const analytics = await loadAnalytics();
        
        const sessionData = {
            id: Date.now().toString(),
            userId: userId || 'guest',
            action,
            timestamp: new Date().toISOString(),
            data
        };
        
        analytics.sessions.push(sessionData);
        
        // Clean old data (keep last 12 months)
        analytics.sessions = cleanOldAnalytics(analytics.sessions);
        
        // Update summary
        const uniqueUsers = new Set(analytics.sessions.map(s => s.userId)).size;
        analytics.summary.totalUsers = uniqueUsers;
        analytics.summary.totalSessions = analytics.sessions.length;
        analytics.summary.totalPDFDownloads = analytics.sessions.filter(s => s.action === 'pdf_download').length;
        analytics.summary.totalButtonClicks = analytics.sessions.filter(s => s.action === 'button_click').length;
        
        // Calculate average session duration (simplified)
        const loginSessions = analytics.sessions.filter(s => s.action.includes('login'));
        const logoutSessions = analytics.sessions.filter(s => s.action === 'logout');
        
        if (loginSessions.length > 0) {
            let totalDuration = 0;
            let sessionCount = 0;
            
            loginSessions.forEach(login => {
                const logout = logoutSessions.find(l => 
                    l.userId === login.userId && 
                    new Date(l.timestamp) > new Date(login.timestamp)
                );
                
                if (logout) {
                    const duration = new Date(logout.timestamp) - new Date(login.timestamp);
                    totalDuration += duration;
                    sessionCount++;
                }
            });
            
            if (sessionCount > 0) {
                analytics.summary.averageSessionDuration = Math.round(totalDuration / sessionCount / 1000 / 60); // in minutes
            }
        }
        
        await saveAnalytics(analytics);
        
        console.log(`📊 File Analytics: Tracked ${action} for user ${userId}`);
    } catch (error) {
        console.error('Analytics tracking error:', error);
        // Don't throw error to prevent 500 responses
    }
};

// Get analytics summary
const getAnalyticsSummary = async () => {
    try {
        if (isPostgreSQL()) {
            try {
                const databaseModule = require('./database-selector');
                await databaseModule.waitForInit();
                const { analyticsDB } = databaseModule;
                
                if (analyticsDB && analyticsDB.getAnalyticsSummary) {
                    return await analyticsDB.getAnalyticsSummary();
                }
            } catch (error) {
                console.error('PostgreSQL analytics summary failed, falling back to file:', error.message);
            }
        }
        
        // Fallback to file-based analytics
        const analytics = await loadAnalytics();
        
        // Get recent activities (last 50)
        const recentActivities = analytics.sessions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50)
            .map(session => ({
                id: session.id,
                userId: session.userId,
                action: session.action,
                timestamp: session.timestamp,
                data: session.data
            }));
        
        // Get user activities grouped by user
        const userActivities = {};
        analytics.sessions.forEach(session => {
            if (!userActivities[session.userId]) {
                userActivities[session.userId] = {
                    userId: session.userId,
                    totalActivities: 0,
                    pdfDownloads: 0,
                    buttonClicks: 0,
                    lastActivity: session.timestamp
                };
            }
            
            userActivities[session.userId].totalActivities++;
            
            if (session.action === 'pdf_download') {
                userActivities[session.userId].pdfDownloads++;
            }
            
            if (session.action === 'button_click') {
                userActivities[session.userId].buttonClicks++;
            }
            
            if (new Date(session.timestamp) > new Date(userActivities[session.userId].lastActivity)) {
                userActivities[session.userId].lastActivity = session.timestamp;
            }
        });
        
        return {
            summary: analytics.summary,
            recentActivities,
            userActivities: Object.values(userActivities)
                .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        };
    } catch (error) {
        console.error('Analytics summary error:', error);
        return {
            summary: {
                totalUsers: 0,
                totalSessions: 0,
                totalPDFDownloads: 0,
                totalButtonClicks: 0,
                averageSessionDuration: 0
            },
            recentActivities: [],
            userActivities: []
        };
    }
};

// Get recent activities only
const getRecentActivities = async () => {
    try {
        if (isPostgreSQL()) {
            try {
                const databaseModule = require('./database-selector');
                await databaseModule.waitForInit();
                const { analyticsDB } = databaseModule;
                
                if (analyticsDB && analyticsDB.getRecentActivities) {
                    return await analyticsDB.getRecentActivities();
                }
            } catch (error) {
                console.error('PostgreSQL recent activities failed, falling back to file:', error.message);
            }
        }
        
        // Fallback to file-based analytics
        const analytics = await loadAnalytics();
        
        return analytics.sessions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50)
            .map(session => ({
                id: session.id,
                userId: session.userId,
                action: session.action,
                timestamp: session.timestamp,
                data: session.data
            }));
    } catch (error) {
        console.error('Recent activities error:', error);
        return [];
    }
};

module.exports = {
    trackSession,
    getAnalyticsSummary,
    getRecentActivities,
    loadAnalytics,
    saveAnalytics
};