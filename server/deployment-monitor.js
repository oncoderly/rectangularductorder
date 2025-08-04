// Production Deployment Monitor and Safety System
const fs = require('fs-extra');
const path = require('path');

class DeploymentMonitor {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER_SERVICE_NAME;
        this.alertsFile = path.join(__dirname, 'deployment_alerts.json');
        this.userCountFile = path.join(__dirname, 'user_count_history.json');
    }

    // Track user count changes during deployment
    async trackUserCount(count, context = 'unknown') {
        try {
            const timestamp = new Date().toISOString();
            const entry = {
                timestamp,
                count,
                context,
                environment: this.isProduction ? 'production' : 'development'
            };

            // Read existing history
            let history = [];
            if (await fs.pathExists(this.userCountFile)) {
                try {
                    const data = await fs.readFile(this.userCountFile, 'utf8');
                    history = JSON.parse(data);
                } catch (err) {
                    console.error('⚠️ [MONITOR] Failed to read user count history:', err.message);
                }
            }

            // Add new entry
            history.push(entry);

            // Keep only last 100 entries
            if (history.length > 100) {
                history = history.slice(-100);
            }

            // Save updated history
            await fs.writeFile(this.userCountFile, JSON.stringify(history, null, 2));

            console.log(`📊 [MONITOR] User count tracked: ${count} (${context})`);

            // Check for significant drops in production
            if (this.isProduction && history.length > 1) {
                const previousEntry = history[history.length - 2];
                const drop = previousEntry.count - count;
                
                if (drop > 0) {
                    console.warn(`⚠️ [MONITOR] User count dropped from ${previousEntry.count} to ${count} (${drop} users lost)`);
                    await this.createAlert('USER_COUNT_DROP', {
                        previous: previousEntry.count,
                        current: count,
                        drop,
                        context,
                        previousContext: previousEntry.context
                    });
                }
            }

        } catch (error) {
            console.error('❌ [MONITOR] Failed to track user count:', error);
        }
    }

    // Create deployment alert
    async createAlert(type, data) {
        try {
            const timestamp = new Date().toISOString();
            const alert = {
                id: `${type}_${Date.now()}`,
                type,
                timestamp,
                data,
                environment: this.isProduction ? 'production' : 'development',
                resolved: false
            };

            // Read existing alerts
            let alerts = [];
            if (await fs.pathExists(this.alertsFile)) {
                try {
                    const alertData = await fs.readFile(this.alertsFile, 'utf8');
                    alerts = JSON.parse(alertData);
                } catch (err) {
                    console.error('⚠️ [MONITOR] Failed to read alerts:', err.message);
                }
            }

            // Add new alert
            alerts.push(alert);

            // Keep only last 50 alerts
            if (alerts.length > 50) {
                alerts = alerts.slice(-50);
            }

            // Save updated alerts
            await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));

            console.error(`🚨 [MONITOR] ALERT CREATED: ${type}`, data);

            return alert.id;

        } catch (error) {
            console.error('❌ [MONITOR] Failed to create alert:', error);
            return null;
        }
    }

    // Get unresolved alerts
    async getUnresolvedAlerts() {
        try {
            if (!await fs.pathExists(this.alertsFile)) {
                return [];
            }

            const alertData = await fs.readFile(this.alertsFile, 'utf8');
            const alerts = JSON.parse(alertData);

            return alerts.filter(alert => !alert.resolved);

        } catch (error) {
            console.error('❌ [MONITOR] Failed to get alerts:', error);
            return [];
        }
    }

    // Resolve alert
    async resolveAlert(alertId) {
        try {
            if (!await fs.pathExists(this.alertsFile)) {
                return false;
            }

            const alertData = await fs.readFile(this.alertsFile, 'utf8');
            const alerts = JSON.parse(alertData);

            const alert = alerts.find(a => a.id === alertId);
            if (alert) {
                alert.resolved = true;
                alert.resolvedAt = new Date().toISOString();

                await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
                console.log(`✅ [MONITOR] Alert resolved: ${alertId}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ [MONITOR] Failed to resolve alert:', error);
            return false;
        }
    }

    // Check deployment safety
    async checkDeploymentSafety() {
        try {
            console.log('🔍 [MONITOR] Checking deployment safety...');

            const checks = {
                databaseUrl: !!process.env.DATABASE_URL,
                sessionSecret: !!process.env.SESSION_SECRET,
                isProduction: this.isProduction,
                googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
            };

            console.log('🔍 [MONITOR] Safety checks:', checks);

            // Critical checks for production
            if (this.isProduction) {
                if (!checks.databaseUrl) {
                    await this.createAlert('MISSING_DATABASE_URL', {
                        message: 'DATABASE_URL not set in production - data will be lost!'
                    });
                }

                if (!checks.sessionSecret) {
                    await this.createAlert('MISSING_SESSION_SECRET', {
                        message: 'SESSION_SECRET not set - sessions may not work properly'
                    });
                }
            }

            return checks;

        } catch (error) {
            console.error('❌ [MONITOR] Failed to check deployment safety:', error);
            return null;
        }
    }

    // Get user count history
    async getUserCountHistory(limit = 20) {
        try {
            if (!await fs.pathExists(this.userCountFile)) {
                return [];
            }

            const data = await fs.readFile(this.userCountFile, 'utf8');
            const history = JSON.parse(data);

            return history.slice(-limit);

        } catch (error) {
            console.error('❌ [MONITOR] Failed to get user count history:', error);
            return [];
        }
    }

    // Generate deployment report
    async generateDeploymentReport() {
        try {
            const alerts = await this.getUnresolvedAlerts();
            const userHistory = await getUserCountHistory(10);
            const safetyChecks = await this.checkDeploymentSafety();

            const report = {
                timestamp: new Date().toISOString(),
                environment: this.isProduction ? 'production' : 'development',
                safetyChecks,
                unresolvedAlerts: alerts.length,
                alerts: alerts.map(a => ({
                    type: a.type,
                    timestamp: a.timestamp,
                    summary: this.getAlertSummary(a)
                })),
                userCountTrend: userHistory.length > 1 ? {
                    current: userHistory[userHistory.length - 1]?.count || 0,
                    previous: userHistory[userHistory.length - 2]?.count || 0,
                    change: (userHistory[userHistory.length - 1]?.count || 0) - (userHistory[userHistory.length - 2]?.count || 0)
                } : null,
                recentUserHistory: userHistory
            };

            console.log('📊 [MONITOR] Deployment Report Generated');
            console.log('📊 [MONITOR] Environment:', report.environment);
            console.log('📊 [MONITOR] Unresolved Alerts:', report.unresolvedAlerts);
            console.log('📊 [MONITOR] Current User Count:', report.userCountTrend?.current || 'Unknown');

            return report;

        } catch (error) {
            console.error('❌ [MONITOR] Failed to generate deployment report:', error);
            return null;
        }
    }

    // Get alert summary
    getAlertSummary(alert) {
        switch (alert.type) {
            case 'USER_COUNT_DROP':
                return `${alert.data.drop} users lost (${alert.data.previous} → ${alert.data.current})`;
            case 'MISSING_DATABASE_URL':
                return 'Database URL not configured';
            case 'MISSING_SESSION_SECRET':
                return 'Session secret not configured';
            default:
                return alert.type;
        }
    }
}

// Create singleton instance
const deploymentMonitor = new DeploymentMonitor();

module.exports = {
    DeploymentMonitor,
    deploymentMonitor
};