import { Server } from 'socket.io';
import { TrackingSession, VehicleLocation, Alert } from '../models/gpsModels.js';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.vehicleSubscriptions = new Map(); // Track which clients are subscribed to which vehicles
    this.alertSubscriptions = new Map(); // Track alert subscriptions
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupConnectionHandlers();
    console.log('WebSocket service initialized');
  }

  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Store client connection info
      this.connectedClients.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
        userType: null, // 'driver', 'fleet_manager', 'admin'
        vehicleId: null,
        sessionId: null
      });

      // Handle client identification
      socket.on('identify', (data) => {
        this.handleClientIdentification(socket, data);
      });

      // Handle fleet manager subscription to vehicle updates
      socket.on('subscribe_vehicle_updates', (data) => {
        this.handleVehicleSubscription(socket, data);
      });

      // Handle unsubscribe from vehicle updates
      socket.on('unsubscribe_vehicle_updates', (data) => {
        this.handleVehicleUnsubscription(socket, data);
      });

      // Handle alert subscriptions
      socket.on('subscribe_alerts', () => {
        this.handleAlertSubscription(socket);
      });

      // Handle driver location updates (alternative to REST API)
      socket.on('location_update', (data) => {
        this.handleDriverLocationUpdate(socket, data);
      });

      // Handle driver session start
      socket.on('start_tracking', (data) => {
        this.handleStartTracking(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.handleClientDisconnect(socket, reason);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
        message: 'Connected to IndiFleet tracking service'
      });
    });
  }

  handleClientIdentification(socket, data) {
    const { userType, vehicleId, sessionId, fleetId } = data;
    
    const clientInfo = this.connectedClients.get(socket.id);
    if (!clientInfo) return;

    // Update client information
    clientInfo.userType = userType;
    clientInfo.vehicleId = vehicleId;
    clientInfo.sessionId = sessionId;
    clientInfo.fleetId = fleetId;
    clientInfo.identifiedAt = new Date().toISOString();

    console.log(`Client ${socket.id} identified as ${userType}`, { vehicleId, sessionId });

    // Join appropriate rooms based on user type
    if (userType === 'driver' && sessionId) {
      socket.join(`session_${sessionId}`);
      socket.join(`vehicle_${vehicleId}`);
    } else if (userType === 'fleet_manager') {
      socket.join('fleet_managers');
      if (fleetId) {
        socket.join(`fleet_${fleetId}`);
      }
    }

    // Send confirmation
    socket.emit('identification_confirmed', {
      userType,
      subscribedRooms: Array.from(socket.rooms),
      timestamp: new Date().toISOString()
    });
  }

  handleVehicleSubscription(socket, data) {
    const { vehicleIds = [] } = data;
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (!clientInfo) return;

    // Add vehicle subscriptions
    vehicleIds.forEach(vehicleId => {
      socket.join(`vehicle_updates_${vehicleId}`);
      
      if (!this.vehicleSubscriptions.has(vehicleId)) {
        this.vehicleSubscriptions.set(vehicleId, new Set());
      }
      this.vehicleSubscriptions.get(vehicleId).add(socket.id);
    });

    console.log(`Client ${socket.id} subscribed to vehicle updates:`, vehicleIds);

    socket.emit('subscription_confirmed', {
      type: 'vehicle_updates',
      vehicleIds,
      timestamp: new Date().toISOString()
    });
  }

  handleVehicleUnsubscription(socket, data) {
    const { vehicleIds = [] } = data;
    
    vehicleIds.forEach(vehicleId => {
      socket.leave(`vehicle_updates_${vehicleId}`);
      
      const subscribers = this.vehicleSubscriptions.get(vehicleId);
      if (subscribers) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.vehicleSubscriptions.delete(vehicleId);
        }
      }
    });

    console.log(`Client ${socket.id} unsubscribed from vehicle updates:`, vehicleIds);
  }

  handleAlertSubscription(socket) {
    socket.join('alert_updates');
    
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.alertSubscribed = true;
    }

    console.log(`Client ${socket.id} subscribed to alert updates`);

    socket.emit('subscription_confirmed', {
      type: 'alerts',
      timestamp: new Date().toISOString()
    });
  }

  async handleDriverLocationUpdate(socket, data) {
    try {
      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || clientInfo.userType !== 'driver') {
        socket.emit('error', { message: 'Unauthorized location update' });
        return;
      }

      const { sessionId, location } = data;
      if (!sessionId || !location) {
        socket.emit('error', { message: 'Invalid location data' });
        return;
      }

      // Validate session
      const session = TrackingSession.findBySessionId(sessionId);
      if (!session || session.status !== 'active') {
        socket.emit('error', { message: 'Invalid or inactive session' });
        return;
      }

      // Save location update
      const vehicleLocation = new VehicleLocation({
        sessionId,
        vehicleId: session.vehicleId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        accuracy: location.accuracy,
        timestamp: location.timestamp || new Date().toISOString(),
        source: 'websocket'
      });

      vehicleLocation.save();

      // Update session
      session.lastLocationUpdate = new Date().toISOString();
      session.save();

      // Broadcast location update to subscribers
      this.broadcastLocationUpdate({
        vehicleId: session.vehicleId,
        location: {
          latitude: vehicleLocation.latitude,
          longitude: vehicleLocation.longitude,
          speed: vehicleLocation.speed,
          heading: vehicleLocation.heading,
          accuracy: vehicleLocation.accuracy,
          timestamp: vehicleLocation.timestamp
        },
        sessionId
      });

      // Confirm to driver
      socket.emit('location_update_confirmed', {
        timestamp: vehicleLocation.timestamp,
        vehicleId: session.vehicleId
      });

    } catch (error) {
      console.error('Error handling driver location update:', error);
      socket.emit('error', { message: 'Failed to process location update' });
    }
  }

  async handleStartTracking(socket, data) {
    try {
      const { sessionId, driverConsent, initialLocation } = data;
      const clientInfo = this.connectedClients.get(socket.id);
      
      if (!clientInfo || clientInfo.userType !== 'driver') {
        socket.emit('error', { message: 'Unauthorized tracking start' });
        return;
      }

      const session = TrackingSession.findBySessionId(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Update session
      session.driverConsent = driverConsent;
      session.consentTimestamp = new Date().toISOString();
      session.save();

      // Save initial location if provided
      if (initialLocation) {
        const vehicleLocation = new VehicleLocation({
          sessionId,
          vehicleId: session.vehicleId,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          accuracy: initialLocation.accuracy,
          timestamp: initialLocation.timestamp || new Date().toISOString(),
          source: 'websocket'
        });
        vehicleLocation.save();

        // Broadcast initial location
        this.broadcastLocationUpdate({
          vehicleId: session.vehicleId,
          location: initialLocation,
          sessionId,
          event: 'tracking_started'
        });
      }

      socket.emit('tracking_started', {
        sessionId,
        vehicleId: session.vehicleId,
        updateInterval: session.updateIntervalSeconds,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error starting tracking:', error);
      socket.emit('error', { message: 'Failed to start tracking' });
    }
  }

  handleClientDisconnect(socket, reason) {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      // Clean up vehicle subscriptions
      this.vehicleSubscriptions.forEach((subscribers, vehicleId) => {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.vehicleSubscriptions.delete(vehicleId);
        }
      });

      // If it was a driver, notify fleet managers
      if (clientInfo.userType === 'driver' && clientInfo.vehicleId) {
        this.broadcastVehicleStatus({
          vehicleId: clientInfo.vehicleId,
          status: 'connection_lost',
          timestamp: new Date().toISOString(),
          reason: 'Driver disconnected'
        });
      }
    }

    this.connectedClients.delete(socket.id);
  }

  // Public methods for broadcasting updates

  broadcastLocationUpdate(data) {
    const { vehicleId, location, sessionId, event = 'location_update' } = data;
    
    // Broadcast to fleet managers subscribed to this vehicle
    this.io.to(`vehicle_updates_${vehicleId}`).emit(event, {
      vehicleId,
      location,
      sessionId,
      timestamp: location.timestamp || new Date().toISOString()
    });

    // Also broadcast to general fleet managers room
    this.io.to('fleet_managers').emit(event, {
      vehicleId,
      location,
      sessionId,
      timestamp: location.timestamp || new Date().toISOString()
    });

    console.log(`Broadcasted location update for vehicle ${vehicleId} to subscribers`);
  }

  broadcastVehicleStatus(data) {
    const { vehicleId, status, timestamp, reason } = data;
    
    this.io.to(`vehicle_updates_${vehicleId}`).emit('vehicle_status_update', {
      vehicleId,
      status,
      timestamp,
      reason
    });

    this.io.to('fleet_managers').emit('vehicle_status_update', {
      vehicleId,
      status,
      timestamp,
      reason
    });

    console.log(`Broadcasted status update for vehicle ${vehicleId}: ${status}`);
  }

  broadcastAlert(alert) {
    // Broadcast to all alert subscribers
    this.io.to('alert_updates').emit('new_alert', {
      alertId: alert.id,
      type: alert.alertType,
      severity: alert.severity,
      vehicleId: alert.vehicleId,
      message: alert.message,
      location: alert.locationLat && alert.locationLng ? {
        latitude: alert.locationLat,
        longitude: alert.locationLng
      } : null,
      timestamp: alert.createdAt
    });

    // Also broadcast to fleet managers
    this.io.to('fleet_managers').emit('new_alert', {
      alertId: alert.id,
      type: alert.alertType,
      severity: alert.severity,
      vehicleId: alert.vehicleId,
      message: alert.message,
      location: alert.locationLat && alert.locationLng ? {
        latitude: alert.locationLat,
        longitude: alert.locationLng
      } : null,
      timestamp: alert.createdAt
    });

    console.log(`Broadcasted new alert: ${alert.alertType} for vehicle ${alert.vehicleId}`);
  }

  broadcastAlertAcknowledged(alertId, acknowledgedBy) {
    this.io.to('alert_updates').emit('alert_acknowledged', {
      alertId,
      acknowledgedBy,
      timestamp: new Date().toISOString()
    });

    this.io.to('fleet_managers').emit('alert_acknowledged', {
      alertId,
      acknowledgedBy,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast sentiment analysis updates
  broadcastSentimentUpdate(driverId, sentimentData) {
    // Broadcast to all fleet managers
    this.io.to('fleet_managers').emit('sentiment_update', {
      driverId,
      sentimentScore: sentimentData.sentimentScore,
      sentimentLabel: sentimentData.sentimentLabel,
      timestamp: sentimentData.timestamp || new Date().toISOString()
    });

    // Broadcast to specific driver
    this.io.to(`driver_${driverId}`).emit('personal_sentiment_update', {
      driverId,
      sentimentScore: sentimentData.sentimentScore,
      sentimentLabel: sentimentData.sentimentLabel,
      analysis: sentimentData.analysis,
      recommendations: sentimentData.recommendations,
      timestamp: sentimentData.timestamp || new Date().toISOString()
    });

    console.log(`Broadcasted sentiment update for driver ${driverId}: ${sentimentData.sentimentScore}`);
  }

  // Utility methods

  getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  getVehicleSubscribers(vehicleId) {
    return this.vehicleSubscriptions.get(vehicleId) || new Set();
  }

  getConnectionStats() {
    const clients = Array.from(this.connectedClients.values());
    
    return {
      totalConnections: clients.length,
      drivers: clients.filter(c => c.userType === 'driver').length,
      fleetManagers: clients.filter(c => c.userType === 'fleet_manager').length,
      unidentified: clients.filter(c => !c.userType).length,
      vehicleSubscriptions: this.vehicleSubscriptions.size,
      uptime: process.uptime()
    };
  }

  // Send message to specific client
  sendToClient(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }

  // Send message to all drivers
  broadcastToDrivers(event, data) {
    const drivers = Array.from(this.connectedClients.values())
      .filter(client => client.userType === 'driver');
    
    drivers.forEach(driver => {
      this.io.to(driver.socketId).emit(event, data);
    });
  }

  // Send message to all fleet managers
  broadcastToFleetManagers(event, data) {
    this.io.to('fleet_managers').emit(event, data);
  }

  // Send message to all connected clients
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send message to a specific room
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;