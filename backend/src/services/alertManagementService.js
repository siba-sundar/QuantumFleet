import { Alert, TrackingSession } from '../models/gpsModels.js';
import smsService from './smsService.js';
import webSocketService from './webSocketService.js';

class AlertManagementService {
  constructor() {
    this.alertThresholds = {
      speed: {
        minor: 10, // km/h over limit
        major: 20, // km/h over limit
        critical: 40 // km/h over limit
      },
      accuracy: {
        poor: 100, // meters
        veryPoor: 500 // meters
      },
      stationary: {
        warning: 30, // minutes
        critical: 60 // minutes
      },
      routeDeviation: {
        minor: 200, // meters
        major: 500, // meters
        critical: 1000 // meters
      }
    };

    this.smsEnabled = process.env.ALERT_SMS_ENABLED === 'true';
    this.pushEnabled = process.env.ALERT_PUSH_ENABLED === 'true';
    
    // Fleet manager contact numbers (would typically come from database)
    this.fleetManagerContacts = [
      '+91XXXXXXXXXX', // Replace with actual numbers
      '+91YYYYYYYYYY'
    ];
  }

  /**
   * Create and process a new alert
   * @param {Object} alertData - Alert information
   * @returns {Object} Created alert
   */
  async createAlert(alertData) {
    try {
      const {
        alertType,
        severity,
        vehicleId,
        message,
        locationLat,
        locationLng,
        metadata = {}
      } = alertData;

      // Validate required fields
      if (!alertType || !severity || !vehicleId || !message) {
        throw new Error('Missing required alert fields');
      }

      // Check for duplicate alerts (prevent spam)
      const isDuplicate = this.checkDuplicateAlert(alertType, vehicleId, message);
      if (isDuplicate) {
        console.log(`Duplicate alert prevented: ${alertType} for vehicle ${vehicleId}`);
        return { success: false, reason: 'duplicate_alert' };
      }

      // Create alert
      const alert = new Alert({
        alertType,
        severity,
        vehicleId,
        message,
        locationLat,
        locationLng,
        metadata: JSON.stringify(metadata)
      });

      alert.save();

      // Process the alert based on severity and type
      await this.processAlert(alert);

      console.log(`Alert created: ${alertType} (${severity}) for vehicle ${vehicleId}`);

      return {
        success: true,
        alert: {
          id: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          vehicleId: alert.vehicleId,
          message: alert.message,
          timestamp: alert.createdAt
        }
      };

    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Process alert based on severity and send notifications
   * @param {Object} alert - Alert object
   */
  async processAlert(alert) {
    try {
      // Broadcast real-time alert to dashboard
      webSocketService.broadcastAlert(alert);

      // Send SMS notifications for high and critical alerts
      if ((alert.severity === 'high' || alert.severity === 'critical') && this.smsEnabled) {
        await this.sendAlertSMS(alert);
      }

      // Auto-escalate critical alerts
      if (alert.severity === 'critical') {
        await this.escalateAlert(alert);
      }

      // Log alert for analytics
      this.logAlert(alert);

    } catch (error) {
      console.error('Error processing alert:', error);
    }
  }

  /**
   * Send SMS notification for alert
   * @param {Object} alert - Alert object
   */
  async sendAlertSMS(alert) {
    try {
      if (!this.smsEnabled || this.fleetManagerContacts.length === 0) {
        console.log('SMS alerts disabled or no contacts configured');
        return;
      }

      const locationText = alert.locationLat && alert.locationLng 
        ? `at ${alert.locationLat.toFixed(4)}, ${alert.locationLng.toFixed(4)}` 
        : '';

      const smsMessage = `🚨 FLEET ALERT\n\n${alert.severity.toUpperCase()}: ${alert.message}\n\nVehicle: ${alert.vehicleId}\nTime: ${new Date(alert.createdAt).toLocaleString()}\nLocation: ${locationText}\n\nIndiFleet Alert System`;

      // Send to all fleet manager contacts
      const smsPromises = this.fleetManagerContacts.map(async (contact) => {
        try {
          await smsService.sendTrackingSMS(contact, smsMessage, `alert_${alert.id}`);
          console.log(`Alert SMS sent to ${contact} for alert ${alert.id}`);
        } catch (error) {
          console.error(`Failed to send alert SMS to ${contact}:`, error.message);
        }
      });

      await Promise.allSettled(smsPromises);

    } catch (error) {
      console.error('Error sending alert SMS:', error);
    }
  }

  /**
   * Escalate critical alerts
   * @param {Object} alert - Alert object
   */
  async escalateAlert(alert) {
    try {
      // Create escalation record
      const escalationAlert = new Alert({
        alertType: 'escalation',
        severity: 'critical',
        vehicleId: alert.vehicleId,
        message: `ESCALATED: ${alert.message} - Requires immediate attention`,
        locationLat: alert.locationLat,
        locationLng: alert.locationLng
      });

      escalationAlert.save();

      // Send immediate notification
      webSocketService.broadcastAlert(escalationAlert);

      // Additional escalation actions (email, phone calls, etc.) would go here
      console.log(`Alert escalated: ${alert.id} -> ${escalationAlert.id}`);

    } catch (error) {
      console.error('Error escalating alert:', error);
    }
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} acknowledgedBy - Who acknowledged the alert
   * @returns {Object} Acknowledgment result
   */
  acknowledgeAlert(alertId, acknowledgedBy = 'System') {
    try {
      const alert = Alert.findById(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      if (alert.isAcknowledged) {
        return {
          success: false,
          message: 'Alert already acknowledged'
        };
      }

      alert.isAcknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      alert.save();

      // Broadcast acknowledgment
      webSocketService.broadcastAlertAcknowledged(alertId, acknowledgedBy);

      console.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

      return {
        success: true,
        alertId,
        acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt
      };

    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Get alerts with filtering options
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered alerts
   */
  getAlerts(filters = {}) {
    try {
      const {
        status = 'active',
        severity,
        alertType,
        vehicleId,
        limit = 50,
        startDate,
        endDate
      } = filters;

      let alerts;

      if (status === 'active') {
        alerts = Alert.getActiveAlerts();
      } else {
        // Get all alerts and filter
        alerts = Object.values(Alert.findAll ? Alert.findAll() : []);
      }

      // Apply filters
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      if (alertType) {
        alerts = alerts.filter(alert => alert.alertType === alertType);
      }

      if (vehicleId) {
        alerts = alerts.filter(alert => alert.vehicleId === vehicleId);
      }

      if (startDate) {
        const start = new Date(startDate);
        alerts = alerts.filter(alert => new Date(alert.createdAt) >= start);
      }

      if (endDate) {
        const end = new Date(endDate);
        alerts = alerts.filter(alert => new Date(alert.createdAt) <= end);
      }

      // Sort by creation time (newest first) and limit
      alerts = alerts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      return alerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        vehicleId: alert.vehicleId,
        message: alert.message,
        location: alert.locationLat && alert.locationLng ? {
          latitude: alert.locationLat,
          longitude: alert.locationLng
        } : null,
        isAcknowledged: alert.isAcknowledged,
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt,
        createdAt: alert.createdAt
      }));

    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Alert statistics
   */
  getAlertStatistics(filters = {}) {
    try {
      const { vehicleId, timeRange = '24h' } = filters;

      // Calculate time range
      const now = new Date();
      let startTime;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now - 24 * 60 * 60 * 1000);
      }

      // Get alerts in time range
      const alerts = this.getAlerts({
        startDate: startTime.toISOString(),
        vehicleId,
        limit: 1000
      });

      // Calculate statistics
      const stats = {
        total: alerts.length,
        acknowledged: alerts.filter(a => a.isAcknowledged).length,
        pending: alerts.filter(a => !a.isAcknowledged).length,
        bySeverity: {
          low: alerts.filter(a => a.severity === 'low').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          high: alerts.filter(a => a.severity === 'high').length,
          critical: alerts.filter(a => a.severity === 'critical').length
        },
        byType: {},
        timeRange,
        period: {
          start: startTime.toISOString(),
          end: now.toISOString()
        }
      };

      // Count by alert type
      alerts.forEach(alert => {
        stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      });

      return stats;

    } catch (error) {
      console.error('Error getting alert statistics:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate alerts to prevent spam
   * @param {string} alertType - Alert type
   * @param {string} vehicleId - Vehicle ID
   * @param {string} message - Alert message
   * @returns {boolean} Whether alert is duplicate
   */
  checkDuplicateAlert(alertType, vehicleId, message) {
    try {
      const recentAlerts = Alert.findByVehicleId(vehicleId)
        .filter(alert => 
          alert.alertType === alertType &&
          !alert.isAcknowledged &&
          (new Date() - new Date(alert.createdAt)) < 5 * 60 * 1000 // Within 5 minutes
        );

      // Check for similar messages
      return recentAlerts.some(alert => 
        alert.message.toLowerCase().includes(message.toLowerCase().split(' ')[0])
      );

    } catch (error) {
      console.error('Error checking duplicate alert:', error);
      return false;
    }
  }

  /**
   * Auto-resolve alerts based on conditions
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} currentLocation - Current vehicle location
   */
  autoResolveAlerts(vehicleId, currentLocation) {
    try {
      const activeAlerts = Alert.findByVehicleId(vehicleId)
        .filter(alert => !alert.isAcknowledged);

      for (const alert of activeAlerts) {
        let shouldResolve = false;
        let resolutionReason = '';

        // Auto-resolve speed alerts if speed is now normal
        if (alert.alertType === 'speed' && currentLocation.speed) {
          const speedKmh = currentLocation.speed * 3.6;
          if (speedKmh <= 80) { // Normal speed
            shouldResolve = true;
            resolutionReason = 'Speed normalized';
          }
        }

        // Auto-resolve accuracy alerts if accuracy improved
        if (alert.alertType === 'low_accuracy' && currentLocation.accuracy) {
          if (currentLocation.accuracy <= 50) { // Good accuracy
            shouldResolve = true;
            resolutionReason = 'GPS accuracy improved';
          }
        }

        // Auto-resolve stationary alerts if vehicle is moving
        if (alert.alertType === 'breakdown' && currentLocation.speed) {
          const speedKmh = currentLocation.speed * 3.6;
          if (speedKmh > 5) { // Vehicle is moving
            shouldResolve = true;
            resolutionReason = 'Vehicle movement detected';
          }
        }

        if (shouldResolve) {
          alert.isAcknowledged = true;
          alert.acknowledgedBy = 'Auto-resolved';
          alert.acknowledgedAt = new Date().toISOString();
          alert.save();

          console.log(`Auto-resolved alert ${alert.id}: ${resolutionReason}`);

          // Broadcast resolution
          webSocketService.broadcastAlertAcknowledged(alert.id, 'Auto-resolved');
        }
      }

    } catch (error) {
      console.error('Error auto-resolving alerts:', error);
    }
  }

  /**
   * Log alert for analytics
   * @param {Object} alert - Alert object
   */
  logAlert(alert) {
    // This would typically write to an analytics database
    console.log(`Alert logged: ${alert.alertType} (${alert.severity}) for vehicle ${alert.vehicleId}`);
  }

  /**
   * Get alert summary for dashboard
   * @returns {Object} Alert summary
   */
  getDashboardSummary() {
    try {
      const activeAlerts = Alert.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
      const highAlerts = activeAlerts.filter(alert => alert.severity === 'high');
      
      return {
        totalActive: activeAlerts.length,
        critical: criticalAlerts.length,
        high: highAlerts.length,
        recentAlerts: activeAlerts.slice(0, 5).map(alert => ({
          id: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          vehicleId: alert.vehicleId,
          message: alert.message,
          createdAt: alert.createdAt
        }))
      };

    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      return {
        totalActive: 0,
        critical: 0,
        high: 0,
        recentAlerts: []
      };
    }
  }

  /**
   * Configure alert settings
   * @param {Object} settings - Alert settings
   */
  configureAlertSettings(settings) {
    try {
      const {
        smsEnabled,
        pushEnabled,
        fleetManagerContacts,
        thresholds
      } = settings;

      if (smsEnabled !== undefined) {
        this.smsEnabled = smsEnabled;
      }

      if (pushEnabled !== undefined) {
        this.pushEnabled = pushEnabled;
      }

      if (fleetManagerContacts && Array.isArray(fleetManagerContacts)) {
        this.fleetManagerContacts = fleetManagerContacts;
      }

      if (thresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...thresholds };
      }

      console.log('Alert settings updated:', {
        smsEnabled: this.smsEnabled,
        pushEnabled: this.pushEnabled,
        contactCount: this.fleetManagerContacts.length
      });

      return {
        success: true,
        message: 'Alert settings updated successfully'
      };

    } catch (error) {
      console.error('Error configuring alert settings:', error);
      throw error;
    }
  }
}

// Create singleton instance
const alertManagementService = new AlertManagementService();

export default alertManagementService;