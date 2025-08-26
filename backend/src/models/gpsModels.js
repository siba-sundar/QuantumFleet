// GPS Tracking Database Models
// Using in-memory storage for now, can be easily migrated to actual database

// Tracking Sessions Storage
let trackingSessions = [];
let smsDeliveryLog = [];
let vehicleLocations = [];
let geofences = [];
let alerts = [];
let routeProgress = [];

// Tracking Session Model
class TrackingSession {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.sessionId = data.sessionId || this.generateSessionId();
    this.vehicleId = data.vehicleId;
    this.driverPhone = data.driverPhone;
    this.routeId = data.routeId || null;
    this.status = data.status || 'active'; // active, expired, completed, cancelled
    this.trackingLink = data.trackingLink;
    this.driverConsent = data.driverConsent || false;
    this.consentTimestamp = data.consentTimestamp || null;
    this.startedAt = data.startedAt || new Date().toISOString();
    this.expiresAt = data.expiresAt;
    this.lastLocationUpdate = data.lastLocationUpdate || null;
    this.updateIntervalSeconds = data.updateIntervalSeconds || 30;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  generateSessionId() {
    return 'ts_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  save() {
    const existingIndex = trackingSessions.findIndex(session => session.id === this.id);
    if (existingIndex !== -1) {
      trackingSessions[existingIndex] = this;
    } else {
      trackingSessions.push(this);
    }
    return this;
  }

  static findById(id) {
    return trackingSessions.find(session => session.id === id);
  }

  static findBySessionId(sessionId) {
    return trackingSessions.find(session => session.sessionId === sessionId);
  }

  static findByVehicleId(vehicleId, status = null) {
    return trackingSessions.filter(session => 
      session.vehicleId === vehicleId && 
      (status ? session.status === status : true)
    );
  }

  static getActiveSessions() {
    return trackingSessions.filter(session => session.status === 'active');
  }
}

// SMS Delivery Log Model
class SmsDeliveryLog {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.sessionId = data.sessionId;
    this.phoneNumber = data.phoneNumber;
    this.messageContent = data.messageContent;
    this.twilioMessageId = data.twilioMessageId || null;
    this.deliveryStatus = data.deliveryStatus || 'sent'; // sent, delivered, failed, undelivered
    this.errorMessage = data.errorMessage || null;
    this.sentAt = data.sentAt || new Date().toISOString();
    this.deliveredAt = data.deliveredAt || null;
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  save() {
    const existingIndex = smsDeliveryLog.findIndex(log => log.id === this.id);
    if (existingIndex !== -1) {
      smsDeliveryLog[existingIndex] = this;
    } else {
      smsDeliveryLog.push(this);
    }
    return this;
  }

  static findBySessionId(sessionId) {
    return smsDeliveryLog.filter(log => log.sessionId === sessionId);
  }

  static findByPhone(phoneNumber) {
    return smsDeliveryLog.filter(log => log.phoneNumber === phoneNumber);
  }
}

// Vehicle Location Model
class VehicleLocation {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.sessionId = data.sessionId;
    this.vehicleId = data.vehicleId;
    this.latitude = parseFloat(data.latitude);
    this.longitude = parseFloat(data.longitude);
    this.speed = data.speed ? parseFloat(data.speed) : null;
    this.heading = data.heading ? parseFloat(data.heading) : null;
    this.accuracy = data.accuracy ? parseFloat(data.accuracy) : null;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.address = data.address || null;
    this.source = data.source || 'browser'; // browser, api
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  save() {
    vehicleLocations.push(this);
    return this;
  }

  static findBySessionId(sessionId) {
    return vehicleLocations.filter(location => location.sessionId === sessionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  static findByVehicleId(vehicleId, limit = 100) {
    return vehicleLocations.filter(location => location.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  static getLatestLocation(vehicleId) {
    const locations = this.findByVehicleId(vehicleId, 1);
    return locations.length > 0 ? locations[0] : null;
  }
}

// Geofence Model
class Geofence {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.centerLat = parseFloat(data.centerLat);
    this.centerLng = parseFloat(data.centerLng);
    this.radiusMeters = parseInt(data.radiusMeters);
    this.alertType = data.alertType || 'both'; // entry, exit, both
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.fleetId = data.fleetId;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  save() {
    const existingIndex = geofences.findIndex(fence => fence.id === this.id);
    if (existingIndex !== -1) {
      this.updatedAt = new Date().toISOString();
      geofences[existingIndex] = this;
    } else {
      geofences.push(this);
    }
    return this;
  }

  static findById(id) {
    return geofences.find(fence => fence.id === id);
  }

  static findByFleetId(fleetId) {
    return geofences.filter(fence => fence.fleetId === fleetId && fence.isActive);
  }

  static getAll() {
    return geofences.filter(fence => fence.isActive);
  }
}

// Alert Model
class Alert {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.alertType = data.alertType; // delay, detour, breakdown, geofence, speed
    this.severity = data.severity; // low, medium, high, critical
    this.vehicleId = data.vehicleId;
    this.message = data.message;
    this.locationLat = data.locationLat ? parseFloat(data.locationLat) : null;
    this.locationLng = data.locationLng ? parseFloat(data.locationLng) : null;
    this.isAcknowledged = data.isAcknowledged || false;
    this.acknowledgedBy = data.acknowledgedBy || null;
    this.acknowledgedAt = data.acknowledgedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  save() {
    const existingIndex = alerts.findIndex(alert => alert.id === this.id);
    if (existingIndex !== -1) {
      alerts[existingIndex] = this;
    } else {
      alerts.push(this);
    }
    return this;
  }

  static findById(id) {
    return alerts.find(alert => alert.id === id);
  }

  static findByVehicleId(vehicleId) {
    return alerts.filter(alert => alert.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static getActiveAlerts() {
    return alerts.filter(alert => !alert.isAcknowledged)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static getBySeverity(severity) {
    return alerts.filter(alert => alert.severity === severity && !alert.isAcknowledged);
  }
}

// Route Progress Model
class RouteProgress {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.vehicleId = data.vehicleId;
    this.routeId = data.routeId;
    this.currentCheckpoint = data.currentCheckpoint || 0;
    this.progressPercentage = data.progressPercentage || 0;
    this.estimatedArrival = data.estimatedArrival || null;
    this.actualArrival = data.actualArrival || null;
    this.delayMinutes = data.delayMinutes || 0;
    this.lastUpdated = data.lastUpdated || new Date().toISOString();
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  save() {
    const existingIndex = routeProgress.findIndex(progress => 
      progress.vehicleId === this.vehicleId && progress.routeId === this.routeId
    );
    if (existingIndex !== -1) {
      this.lastUpdated = new Date().toISOString();
      routeProgress[existingIndex] = this;
    } else {
      routeProgress.push(this);
    }
    return this;
  }

  static findByVehicleId(vehicleId) {
    return routeProgress.find(progress => progress.vehicleId === vehicleId);
  }

  static findByRouteId(routeId) {
    return routeProgress.filter(progress => progress.routeId === routeId);
  }
}

// Export all models and storage arrays
export {
  TrackingSession,
  SmsDeliveryLog,
  VehicleLocation,
  Geofence,
  Alert,
  RouteProgress,
  trackingSessions,
  smsDeliveryLog,
  vehicleLocations,
  geofences,
  alerts,
  routeProgress
};