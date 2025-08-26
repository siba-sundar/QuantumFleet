import { BaseRepository } from "./BaseRepository.js";
import { serverTimestamp } from "firebase/firestore";

/**
 * AlertRepository handles operations for alerts and notifications
 */
export class AlertRepository extends BaseRepository {
  constructor() {
    super('alerts');
  }

  /**
   * Find alerts by vehicle ID
   * @param {string} vehicleId - Vehicle ID
   * @param {string} alertType - Optional alert type filter
   * @returns {Promise<Array>} Array of alerts
   */
  async findByVehicleId(vehicleId, alertType = null) {
    try {
      const conditions = [
        { field: 'vehicleId', operator: '==', value: vehicleId }
      ];
      
      if (alertType) {
        conditions.push({ field: 'alertType', operator: '==', value: alertType });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error finding alerts by vehicle ID:', error);
      throw error;
    }
  }

  /**
   * Find alerts by session ID
   * @param {string} sessionId - Session ID
   * @param {string} alertType - Optional alert type filter
   * @returns {Promise<Array>} Array of alerts
   */
  async findBySessionId(sessionId, alertType = null) {
    try {
      const conditions = [
        { field: 'sessionId', operator: '==', value: sessionId }
      ];
      
      if (alertType) {
        conditions.push({ field: 'alertType', operator: '==', value: alertType });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error finding alerts by session ID:', error);
      throw error;
    }
  }

  /**
   * Find alerts by business UID
   * @param {string} businessUid - Business user ID
   * @param {string} severity - Optional severity filter
   * @returns {Promise<Array>} Array of alerts
   */
  async findByBusinessUid(businessUid, severity = null) {
    try {
      const conditions = [
        { field: 'businessUid', operator: '==', value: businessUid }
      ];
      
      if (severity) {
        conditions.push({ field: 'severity', operator: '==', value: severity });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error finding alerts by business UID:', error);
      throw error;
    }
  }

  /**
   * Find alerts by type
   * @param {string} alertType - Alert type (delay, detour, breakdown, geofence, speed, emergency)
   * @param {string} severity - Optional severity filter
   * @returns {Promise<Array>} Array of alerts
   */
  async findByType(alertType, severity = null) {
    try {
      const conditions = [
        { field: 'alertType', operator: '==', value: alertType }
      ];
      
      if (severity) {
        conditions.push({ field: 'severity', operator: '==', value: severity });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error finding alerts by type:', error);
      throw error;
    }
  }

  /**
   * Find alerts by severity
   * @param {string} severity - Severity level (low, medium, high, critical)
   * @returns {Promise<Array>} Array of alerts
   */
  async findBySeverity(severity) {
    try {
      return await this.findWhere([
        { field: 'severity', operator: '==', value: severity }
      ], 'createdAt', 'desc');
    } catch (error) {
      console.error('Error finding alerts by severity:', error);
      throw error;
    }
  }

  /**
   * Get unacknowledged alerts
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<Array>} Array of unacknowledged alerts
   */
  async getUnacknowledgedAlerts(businessUid = null) {
    try {
      const conditions = [
        { field: 'isAcknowledged', operator: '==', value: false }
      ];
      
      if (businessUid) {
        conditions.push({ field: 'businessUid', operator: '==', value: businessUid });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error getting unacknowledged alerts:', error);
      throw error;
    }
  }

  /**
   * Get critical alerts
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<Array>} Array of critical alerts
   */
  async getCriticalAlerts(businessUid = null) {
    try {
      const conditions = [
        { field: 'severity', operator: '==', value: 'critical' }
      ];
      
      if (businessUid) {
        conditions.push({ field: 'businessUid', operator: '==', value: businessUid });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error getting critical alerts:', error);
      throw error;
    }
  }

  /**
   * Create a new alert
   * @param {Object} alertData - Alert data
   * @returns {Promise<Object>} Created alert
   */
  async createAlert(alertData) {
    try {
      const alert = await this.create({
        ...alertData,
        isAcknowledged: false,
        createdAt: serverTimestamp()
      });
      
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert document ID
   * @param {string} acknowledgedBy - User ID who acknowledged the alert
   * @returns {Promise<Object>} Updated alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      return await this.update(alertId, {
        isAcknowledged: true,
        acknowledgedBy: acknowledgedBy,
        acknowledgedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Get alerts within a time range
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<Array>} Array of alerts within time range
   */
  async getAlertsInTimeRange(startTime, endTime, businessUid = null) {
    try {
      let conditions = [];
      
      if (businessUid) {
        conditions.push({ field: 'businessUid', operator: '==', value: businessUid });
      }
      
      // Get all alerts and filter by time range client-side
      // Note: Firestore range queries require composite indexes for multiple fields
      const alerts = await this.findWhere(conditions, 'createdAt', 'desc');
      
      return alerts.filter(alert => {
        if (alert.createdAt) {
          const alertTime = new Date(alert.createdAt.seconds * 1000);
          return alertTime >= startTime && alertTime <= endTime;
        }
        return false;
      });
    } catch (error) {
      console.error('Error getting alerts in time range:', error);
      throw error;
    }
  }

  /**
   * Get recent alerts
   * @param {number} limitCount - Number of recent alerts to get
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<Array>} Array of recent alerts
   */
  async getRecentAlerts(limitCount = 50, businessUid = null) {
    try {
      const conditions = [];
      
      if (businessUid) {
        conditions.push({ field: 'businessUid', operator: '==', value: businessUid });
      }
      
      return await this.findWhere(conditions, 'createdAt', 'desc', limitCount);
    } catch (error) {
      console.error('Error getting recent alerts:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<Object>} Alert statistics
   */
  async getAlertStatistics(businessUid = null) {
    try {
      let alerts;
      if (businessUid) {
        alerts = await this.findByBusinessUid(businessUid);
      } else {
        alerts = await this.findAll();
      }
      
      const stats = {
        total: alerts.length,
        acknowledged: alerts.filter(a => a.isAcknowledged).length,
        unacknowledged: alerts.filter(a => !a.isAcknowledged).length,
        byType: {},
        bySeverity: {}
      };
      
      // Count by type
      alerts.forEach(alert => {
        const type = alert.alertType || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });
      
      // Count by severity
      alerts.forEach(alert => {
        const severity = alert.severity || 'unknown';
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time alerts for a business
   * @param {string} businessUid - Business UID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeToBusinessAlerts(businessUid, callback) {
    try {
      return this.subscribeToChanges(callback, [
        { field: 'businessUid', operator: '==', value: businessUid }
      ], 'createdAt', 'desc');
    } catch (error) {
      console.error('Error subscribing to business alerts:', error);
      throw error;
    }
  }

  /**
   * Subscribe to critical alerts
   * @param {Function} callback - Callback function
   * @param {string} businessUid - Optional business UID filter
   * @returns {Function} Unsubscribe function
   */
  subscribeToCriticalAlerts(callback, businessUid = null) {
    try {
      const conditions = [
        { field: 'severity', operator: '==', value: 'critical' }
      ];
      
      if (businessUid) {
        conditions.push({ field: 'businessUid', operator: '==', value: businessUid });
      }
      
      return this.subscribeToChanges(callback, conditions, 'createdAt', 'desc');
    } catch (error) {
      console.error('Error subscribing to critical alerts:', error);
      throw error;
    }
  }

  /**
   * Delete old alerts
   * @param {number} daysOld - Delete alerts older than this many days
   * @param {string} businessUid - Optional business UID filter
   * @returns {Promise<number>} Number of deleted alerts
   */
  async deleteOldAlerts(daysOld = 30, businessUid = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let alerts;
      if (businessUid) {
        alerts = await this.findByBusinessUid(businessUid);
      } else {
        alerts = await this.findAll();
      }
      
      const oldAlerts = alerts.filter(alert => {
        if (alert.createdAt) {
          const alertTime = new Date(alert.createdAt.seconds * 1000);
          return alertTime < cutoffDate;
        }
        return false;
      });
      
      let deletedCount = 0;
      for (const alert of oldAlerts) {
        await this.delete(alert.id);
        deletedCount++;
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error deleting old alerts:', error);
      throw error;
    }
  }
}