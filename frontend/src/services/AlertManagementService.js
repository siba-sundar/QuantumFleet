import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase.js';

class AlertManagementService {
  constructor() {
    this.db = db;
    this.auth = getAuth();
    this.alertListeners = new Map();
    this.alertsCollection = collection(db, 'alerts');
  }

  // Create a new alert
  async createAlert({
    type,
    severity = 'medium',
    source,
    recipients,
    message,
    location = null,
    vehicleId = null,
    metadata = {}
  }) {
    try {
      const alertData = {
        type,
        severity,
        source: {
          userId: source.userId || this.auth.currentUser?.uid,
          userType: source.userType,
          vehicleId: source.vehicleId || vehicleId
        },
        recipients: Array.isArray(recipients) ? recipients : [recipients],
        message,
        location,
        vehicleId,
        metadata,
        status: 'active',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        acknowledgedBy: null,
        acknowledgedAt: null
      };
      
      // Save to Firestore
      const docRef = await addDoc(this.alertsCollection, alertData);
      
      // Update with document ID
      const alertWithId = {
        ...alertData,
        id: docRef.id,
        timestamp: new Date().toISOString() // For immediate use
      };

      // Notify recipients via real-time notifications (non-blocking)
      await this.notifyRecipients(alertWithId);
      
      return { success: true, alertId: docRef.id, alert: alertWithId };
    } catch (error) {
      console.error('❌ Error creating alert:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return { success: false, error: error.message };
    }
  }

  // Enhanced SOS alert from driver with metadata support
  async sendSOSAlert(driverId, vehicleId, location, message = 'Emergency SOS Alert', metadata = {}) {
    return await this.createAlert({
      type: 'SOS',
      severity: 'critical',
      source: {
        userId: driverId,
        userType: 'driver',
        vehicleId
      },
      recipients: ['business', 'super_admin'], // Send to all business users and super admins
      message,
      location,
      vehicleId,
      metadata: {
        isEmergency: true,
        requiresImmedateAction: true,
        ...metadata // Merge additional metadata like emergencyType, urgencyLevel, etc.
      }
    });
  }

  // Send delay report from driver
  async sendDelayAlert(driverId, vehicleId, delayReason, estimatedDelay, location) {
    return await this.createAlert({
      type: 'delay',
      severity: 'medium',
      source: {
        userId: driverId,
        userType: 'driver',
        vehicleId
      },
      recipients: ['business', 'super_admin'],
      message: `Vehicle delayed: ${delayReason}. Estimated delay: ${estimatedDelay} minutes`,
      location,
      vehicleId,
      metadata: {
        delayReason,
        estimatedDelay,
        reportedAt: new Date().toISOString()
      }
    });
  }

  // Send route deviation alert
  async sendRouteDeviationAlert(driverId, vehicleId, currentLocation, expectedRoute, reason) {
    return await this.createAlert({
      type: 'route_deviation',
      severity: 'high',
      source: {
        userId: driverId,
        userType: 'driver',
        vehicleId
      },
      recipients: ['business', 'super_admin'],
      message: `Vehicle deviated from planned route. Reason: ${reason}`,
      location: currentLocation,
      vehicleId,
      metadata: {
        expectedRoute,
        deviationReason: reason,
        deviationTime: new Date().toISOString()
      }
    });
  }

  // Send dispatch instructions from super admin to driver
  async sendDispatchInstructions(adminId, driverId, vehicleId, instructions, priority = 'medium') {
    return await this.createAlert({
      type: 'dispatch_instructions',
      severity: priority,
      source: {
        userId: adminId,
        userType: 'super_admin'
      },
      recipients: [driverId],
      message: instructions,
      vehicleId,
      metadata: {
        instructionType: 'dispatch',
        priority,
        sentAt: new Date().toISOString()
      }
    });
  }

  // Send route update from business to driver
  async sendRouteUpdate(businessId, driverId, vehicleId, routeUpdate, newDestination = null) {
    return await this.createAlert({
      type: 'route_update',
      severity: 'medium',
      source: {
        userId: businessId,
        userType: 'business'
      },
      recipients: [driverId],
      message: routeUpdate,
      vehicleId,
      metadata: {
        updateType: 'route_change',
        newDestination,
        updatedAt: new Date().toISOString()
      }
    });
  }

  // Get alerts for a specific user
  async getAlertsForUser(userId, userType, status = 'active') {
    try {
      const alertsQuery = query(
        this.alertsCollection,
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(alertsQuery);
      const alerts = [];
      
      querySnapshot.forEach((doc) => {
        const alert = { id: doc.id, ...doc.data() };
        
        // Enhanced filtering logic to handle both user IDs and user types
        const isRecipient = (
          alert.recipients.includes(userId) || // Specific user ID
          alert.recipients.includes(userType) || // User type (business, super_admin)
          (alert.source.userId === userId && status === 'sent') || // Sent by this user
          (userType === 'super_admin' && alert.recipients.includes('super_admin')) || // Super admin sees all super_admin alerts
          (userType === 'business' && alert.recipients.includes('business')) // Business users see all business alerts
        );
        
        if (isRecipient) {
          if (!status || alert.status === status) {
            // Convert Firestore timestamp to ISO string for consistency
            if (alert.timestamp && alert.timestamp.toDate) {
              alert.timestamp = alert.timestamp.toDate().toISOString();
            }
            if (alert.createdAt && alert.createdAt.toDate) {
              alert.createdAt = alert.createdAt.toDate().toISOString();
            }
            alerts.push(alert);
          }
        }
      });
      
      return alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  // Real-time listener for alerts
  subscribeToAlerts(userId, userType, callback) {
    try {
      const alertsQuery = query(
        this.alertsCollection,
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
        const alerts = [];
        
        snapshot.forEach((doc) => {
          const alert = { id: doc.id, ...doc.data() };
          
          // Enhanced filtering logic to handle both user IDs and user types
          const isRecipient = (
            alert.recipients.includes(userId) || // Specific user ID
            alert.recipients.includes(userType) || // User type (business, super_admin)
            alert.source.userId === userId || // Sent by this user
            (userType === 'super_admin' && alert.recipients.includes('super_admin')) || // Super admin sees all super_admin alerts
            (userType === 'business' && alert.recipients.includes('business')) // Business users see all business alerts
          );
          
          if (isRecipient) {
            // Convert Firestore timestamp to ISO string for consistency
            if (alert.timestamp && alert.timestamp.toDate) {
              alert.timestamp = alert.timestamp.toDate().toISOString();
            }
            if (alert.createdAt && alert.createdAt.toDate) {
              alert.createdAt = alert.createdAt.toDate().toISOString();
            }
            alerts.push(alert);
          }
        });
        
        callback(alerts);
      }, (error) => {
        console.error('Real-time alerts subscription error:', error);
        callback([]);
      });

      this.alertListeners.set(userId, unsubscribe);
      
      return () => {
        unsubscribe();
        this.alertListeners.delete(userId);
      };
    } catch (error) {
      console.error('Error setting up alerts subscription:', error);
      return () => {};
    }
  }

  // Acknowledge an alert
  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      const alertRef = doc(this.db, 'alerts', alertId);
      await updateDoc(alertRef, {
        status: 'acknowledged',
        acknowledgedBy: acknowledgedBy,
        acknowledgedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Resolve an alert
  async resolveAlert(alertId, resolvedBy, resolution = '') {
    try {
      const alertRef = doc(this.db, 'alerts', alertId);
      await updateDoc(alertRef, {
        status: 'resolved',
        resolvedBy: resolvedBy,
        resolvedAt: serverTimestamp(),
        resolution: resolution
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error resolving alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify recipients (placeholder for push notifications, websockets, etc.)
  async notifyRecipients(alertData) {
    try {
      // This would integrate with WebSocket service, push notifications, etc.
      
      // Emit to WebSocket if available - Don't wait for it to complete
      setTimeout(() => {
        try {
          if (window.socket && window.socket.emit) {
            window.socket.emit('new_alert', alertData);
          }
        } catch (wsError) {
          // Silent handling
        }
      }, 0);

      // Browser notification for high severity alerts - Don't wait for it to complete
      setTimeout(() => {
        try {
          if (alertData.severity === 'critical' || alertData.severity === 'high') {
            this.showBrowserNotification(alertData);
          }
        } catch (notificationError) {
          // Silent handling
        }
      }, 0);
      
      // Don't await any external calls - return immediately
      return Promise.resolve();
    } catch (error) {
      // Even if notifications fail, don't let it block the alert creation
      return Promise.resolve();
    }
  }

  // Show browser notification
  showBrowserNotification(alertData) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(`${alertData.type.replace('_', ' ').toUpperCase()}`, {
          body: alertData.message,
          icon: '/truck-icon.png',
          badge: '/alert-icon.png',
          tag: alertData.id,
          requireInteraction: alertData.severity === 'critical'
        });
      } else if (Notification.permission !== 'denied') {
        // Don't await permission request - just fire and forget
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            try {
              new Notification(`${alertData.type.replace('_', ' ').toUpperCase()}`, {
                body: alertData.message,
                icon: '/truck-icon.png',
                badge: '/alert-icon.png',
                tag: alertData.id,
                requireInteraction: alertData.severity === 'critical'
              });
            } catch (error) {
              console.log('Failed to show notification after permission granted:', error.message);
            }
          }
        }).catch(error => {
          console.log('Permission request failed:', error.message);
        });
      }
    } catch (error) {
      console.log('Browser notification error (non-blocking):', error.message);
    }
  }

  // Enhanced alert statistics with SOS tracking
  async getAlertStatistics(userType = null, timeRange = '24h') {
    try {
      const alerts = await this.getAlertsForUser('all', userType || 'all', null);
      const now = new Date();
      const timeRangeMs = this.parseTimeRange(timeRange);
      const filteredAlerts = alerts.filter(alert => 
        new Date(now - new Date(alert.timestamp)) <= timeRangeMs
      );

      const stats = {
        total: filteredAlerts.length,
        critical: filteredAlerts.filter(a => a.severity === 'critical').length,
        high: filteredAlerts.filter(a => a.severity === 'high').length,
        medium: filteredAlerts.filter(a => a.severity === 'medium').length,
        low: filteredAlerts.filter(a => a.severity === 'low').length,
        acknowledged: filteredAlerts.filter(a => a.status === 'acknowledged').length,
        resolved: filteredAlerts.filter(a => a.status === 'resolved').length,
        active: filteredAlerts.filter(a => a.status === 'active').length,
        byType: {},
        // Enhanced SOS statistics
        sos: {
          total: filteredAlerts.filter(a => a.type === 'SOS').length,
          active: filteredAlerts.filter(a => a.type === 'SOS' && a.status === 'active').length,
          resolved: filteredAlerts.filter(a => a.type === 'SOS' && a.status === 'resolved').length,
          averageResponseTime: 0,
          byEmergencyType: {},
          recent: filteredAlerts.filter(a => a.type === 'SOS').slice(0, 5)
        }
      };

      // Group by type
      filteredAlerts.forEach(alert => {
        stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
        
        // Track SOS emergency types
        if (alert.type === 'SOS' && alert.metadata?.emergencyType) {
          const emergencyType = alert.metadata.emergencyType;
          stats.sos.byEmergencyType[emergencyType] = (stats.sos.byEmergencyType[emergencyType] || 0) + 1;
        }
      });
      
      // Calculate average SOS response time
      const resolvedSOS = filteredAlerts.filter(a => 
        a.type === 'SOS' && a.status === 'resolved' && a.acknowledgedAt && a.timestamp
      );
      
      if (resolvedSOS.length > 0) {
        const totalResponseTime = resolvedSOS.reduce((sum, alert) => {
          const responseTime = new Date(alert.acknowledgedAt) - new Date(alert.timestamp);
          return sum + responseTime;
        }, 0);
        
        stats.sos.averageResponseTime = Math.round((totalResponseTime / resolvedSOS.length) / 60000); // Convert to minutes
      }

      return stats;
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      return null;
    }
  }

  parseTimeRange(timeRange) {
    const multipliers = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([hdw])$/);
    if (match) {
      return parseInt(match[1]) * multipliers[match[2]];
    }
    return 24 * 60 * 60 * 1000; // Default to 24 hours
  }

  // Cleanup listeners
  cleanup() {
    this.alertListeners.forEach((listener, userId) => {
      // Remove listeners
      this.alertListeners.delete(userId);
    });
  }
}

export const alertService = new AlertManagementService();
export default alertService;