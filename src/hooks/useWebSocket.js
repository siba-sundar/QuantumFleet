import { useEffect, useState, useCallback, useRef } from 'react';
import webSocketService from '../services/WebSocketService.js';

/**
 * Custom hook for WebSocket functionality
 * @param {Object} options - Configuration options
 * @returns {Object} WebSocket state and methods
 */
export const useWebSocket = (options = {}) => {
  const {
    autoConnect = true,
    serverUrl = null,
    userIdentification = null,
    subscriptions = [],
    onConnect = null,
    onDisconnect = null,
    onError = null
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const subscriptionsRef = useRef(new Set());

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      webSocketService.connect(serverUrl);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError(error.message);
    }
  }, [serverUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Subscribe to vehicle updates
  const subscribeToVehicle = useCallback((vehicleId) => {
    webSocketService.subscribeToVehicle(vehicleId);
    subscriptionsRef.current.add(`vehicle:${vehicleId}`);
  }, []);

  // Unsubscribe from vehicle updates
  const unsubscribeFromVehicle = useCallback((vehicleId) => {
    webSocketService.unsubscribeFromVehicle(vehicleId);
    subscriptionsRef.current.delete(`vehicle:${vehicleId}`);
  }, []);

  // Subscribe to alerts
  const subscribeToAlerts = useCallback((filters = {}) => {
    webSocketService.subscribeToAlerts(filters);
    subscriptionsRef.current.add(`alerts:${JSON.stringify(filters)}`);
  }, []);

  // Send location update
  const sendLocationUpdate = useCallback((locationData) => {
    webSocketService.sendLocationUpdate(locationData);
  }, []);

  // Send alert
  const sendAlert = useCallback((alertData) => {
    webSocketService.sendAlert(alertData);
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId, acknowledgedBy) => {
    webSocketService.acknowledgeAlert(alertId, acknowledgedBy);
  }, []);

  // Setup event listeners
  useEffect(() => {
    const handleConnect = (data) => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      onConnect?.(data);
    };

    const handleDisconnect = (data) => {
      setIsConnected(false);
      onDisconnect?.(data);
    };

    const handleConnectionError = (data) => {
      setConnectionError(data.error?.message || 'Connection error');
      setReconnectAttempts(data.attempts || 0);
      onError?.(data);
    };

    const handleReconnected = (data) => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(data.attempts || 0);
    };

    const handleMessage = (data) => {
      setLastMessage({ 
        ...data, 
        timestamp: new Date().toISOString() 
      });
    };

    // Add event listeners
    webSocketService.on('connected', handleConnect);
    webSocketService.on('disconnected', handleDisconnect);
    webSocketService.on('connection_error', handleConnectionError);
    webSocketService.on('reconnected', handleReconnected);
    webSocketService.on('location_update', handleMessage);
    webSocketService.on('new_alert', handleMessage);
    webSocketService.on('alert_acknowledged', handleMessage);
    webSocketService.on('reservation_update', handleMessage);
    webSocketService.on('fleet_status_change', handleMessage);

    // Cleanup function
    return () => {
      webSocketService.off('connected', handleConnect);
      webSocketService.off('disconnected', handleDisconnect);
      webSocketService.off('connection_error', handleConnectionError);
      webSocketService.off('reconnected', handleReconnected);
      webSocketService.off('location_update', handleMessage);
      webSocketService.off('new_alert', handleMessage);
      webSocketService.off('alert_acknowledged', handleMessage);
      webSocketService.off('reservation_update', handleMessage);
      webSocketService.off('fleet_status_change', handleMessage);
    };
  }, [onConnect, onDisconnect, onError]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      // Cleanup subscriptions on unmount
      subscriptionsRef.current.clear();
    };
  }, [autoConnect, connect]);

  // Identify user when connected
  useEffect(() => {
    if (isConnected && userIdentification) {
      webSocketService.identify(userIdentification);
    }
  }, [isConnected, userIdentification]);

  // Setup initial subscriptions
  useEffect(() => {
    if (isConnected && subscriptions.length > 0) {
      subscriptions.forEach(subscription => {
        if (subscription.type === 'vehicle') {
          subscribeToVehicle(subscription.id);
        } else if (subscription.type === 'alerts') {
          subscribeToAlerts(subscription.filters || {});
        }
      });
    }
  }, [isConnected, subscriptions, subscribeToVehicle, subscribeToAlerts]);

  return {
    // Connection state
    isConnected,
    connectionError,
    reconnectAttempts,
    lastMessage,
    
    // Connection methods
    connect,
    disconnect,
    
    // Subscription methods
    subscribeToVehicle,
    unsubscribeFromVehicle,
    subscribeToAlerts,
    
    // Communication methods
    sendLocationUpdate,
    sendAlert,
    acknowledgeAlert,
    
    // Utility methods
    getStatus: () => webSocketService.getStatus()
  };
};

/**
 * Hook for vehicle tracking with WebSocket
 * @param {string} vehicleId - Vehicle ID to track
 * @param {Object} options - Additional options
 */
export const useVehicleTracking = (vehicleId, options = {}) => {
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const webSocket = useWebSocket({
    ...options,
    subscriptions: vehicleId ? [{ type: 'vehicle', id: vehicleId }] : []
  });

  // Handle location updates
  useEffect(() => {
    const handleLocationUpdate = (data) => {
      if (data.vehicleId === vehicleId) {
        setCurrentLocation(data.location);
        setLocationUpdates(prev => [...prev.slice(-49), data]); // Keep last 50 updates
      }
    };

    const handleNewAlert = (data) => {
      if (data.vehicleId === vehicleId) {
        setAlerts(prev => [data, ...prev]);
      }
    };

    const handleAlertAcknowledged = (data) => {
      setAlerts(prev => prev.map(alert => 
        alert.id === data.alertId 
          ? { ...alert, acknowledged: true, acknowledgedBy: data.acknowledgedBy }
          : alert
      ));
    };

    webSocketService.on('location_update', handleLocationUpdate);
    webSocketService.on('new_alert', handleNewAlert);
    webSocketService.on('alert_acknowledged', handleAlertAcknowledged);

    return () => {
      webSocketService.off('location_update', handleLocationUpdate);
      webSocketService.off('new_alert', handleNewAlert);
      webSocketService.off('alert_acknowledged', handleAlertAcknowledged);
    };
  }, [vehicleId]);

  return {
    ...webSocket,
    vehicleId,
    locationUpdates,
    currentLocation,
    alerts,
    clearAlerts: () => setAlerts([]),
    clearLocationHistory: () => setLocationUpdates([])
  };
};

export default useWebSocket;