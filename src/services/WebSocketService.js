import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * Connect to WebSocket server
   * @param {string} serverUrl - WebSocket server URL
   * @param {Object} options - Connection options
   */
  connect(serverUrl = null, options = {}) {
    const url = serverUrl || import.meta.env.VITE_WS_URL || 'http://localhost:4001';
    
    const defaultOptions = {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      ...options
    };

    this.socket = io(url, defaultOptions);
    this.setupEventHandlers();
    
    return this;
  }

  /**
   * Set up default event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection_error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 WebSocket reconnected after', attemptNumber, 'attempts');
      this.emit('reconnected', { attempts: attemptNumber });
    });

    // Real-time event handlers
    this.socket.on('location_update', (data) => {
      console.log('📍 Location update received:', data);
      this.emit('location_update', data);
    });

    this.socket.on('new_alert', (data) => {
      console.log('🚨 New alert received:', data);
      this.emit('new_alert', data);
    });

    this.socket.on('alert_acknowledged', (data) => {
      console.log('✅ Alert acknowledged:', data);
      this.emit('alert_acknowledged', data);
    });

    this.socket.on('reservation_update', (data) => {
      console.log('📋 Reservation update received:', data);
      this.emit('reservation_update', data);
    });

    this.socket.on('fleet_status_change', (data) => {
      console.log('🚛 Fleet status change:', data);
      this.emit('fleet_status_change', data);
    });
  }

  /**
   * Identify user to the server
   * @param {Object} userData - User identification data
   */
  identify(userData) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected. Cannot identify user.');
      return;
    }

    this.socket.emit('identify', userData);
  }

  /**
   * Subscribe to vehicle updates
   * @param {string} vehicleId - Vehicle ID to subscribe to
   */
  subscribeToVehicle(vehicleId) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected. Cannot subscribe to vehicle.');
      return;
    }

    this.socket.emit('subscribe_vehicle', { vehicleId });
    console.log('📍 Subscribed to vehicle updates:', vehicleId);
  }

  /**
   * Unsubscribe from vehicle updates
   * @param {string} vehicleId - Vehicle ID to unsubscribe from
   */
  unsubscribeFromVehicle(vehicleId) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected. Cannot unsubscribe from vehicle.');
      return;
    }

    this.socket.emit('unsubscribe_vehicle', { vehicleId });
    console.log('📍 Unsubscribed from vehicle updates:', vehicleId);
  }

  /**
   * Subscribe to alerts
   * @param {Object} filters - Alert filters
   */
  subscribeToAlerts(filters = {}) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected. Cannot subscribe to alerts.');
      return;
    }

    this.socket.emit('subscribe_alerts', filters);
    console.log('🚨 Subscribed to alerts with filters:', filters);
  }

  /**
   * Send location update
   * @param {Object} locationData - Location data to send
   */
  sendLocationUpdate(locationData) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected. Cannot send location update.');
      return;
    }

    this.socket.emit('location_update', locationData);
  }

  /**
   * Send alert
   * @param {Object} alertData - Alert data to send
   */
  sendAlert(alertData) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected. Cannot send alert.');
      return;
    }

    this.socket.emit('create_alert', alertData);
  }

  /**
   * Acknowledge alert
   * @param {string} alertId - Alert ID to acknowledge
   * @param {string} acknowledgedBy - Who acknowledged the alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected. Cannot acknowledge alert.');
      return;
    }

    this.socket.emit('acknowledge_alert', { alertId, acknowledgedBy });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Also listen on socket if connected
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback to remove
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }

    // Also remove from socket if connected
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;

    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('🔌 WebSocket manually disconnected');
    }
  }

  /**
   * Manually reconnect
   */
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;