import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const DriverTrackingPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [sessionInfo, setSessionInfo] = useState(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [trackingStats, setTrackingStats] = useState({
    totalUpdates: 0,
    duration: '00:00:00',
    accuracy: null
  });

  // Refs for cleanup
  const watchId = useRef(null);
  const updateInterval = useRef(null);
  const startTime = useRef(null);
  const updateTimer = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  // Fetch session info on mount
  useEffect(() => {
    fetchSessionInfo();
    return () => {
      stopLocationTracking();
    };
  }, [sessionId]);

  // Update tracking duration
  useEffect(() => {
    if (locationSharing && startTime.current) {
      updateTimer.current = setInterval(() => {
        const elapsed = Date.now() - startTime.current;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        setTrackingStats(prev => ({
          ...prev,
          duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }));
      }, 1000);
    }

    return () => {
      if (updateTimer.current) {
        clearInterval(updateTimer.current);
      }
    };
  }, [locationSharing]);

  const fetchSessionInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/tracking/${sessionId}/info`);
      
      if (response.data.success) {
        setSessionInfo(response.data.session);
        setConnectionStatus('connected');
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      console.error('Error fetching session info:', err);
      
      if (err.response?.status === 404) {
        setError('Tracking session not found. Please check your link.');
      } else if (err.response?.status === 410) {
        setError('Tracking session has expired. Please contact dispatch for a new link.');
      } else {
        setError('Unable to connect to tracking service. Please check your internet connection.');
      }
      
      setConnectionStatus('error');
    }
  };

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser. Please use a modern mobile browser.');
      return false;
    }

    try {
      // Request permission and get initial location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const initialLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      setCurrentLocation(initialLocation);
      setTrackingStats(prev => ({ ...prev, accuracy: position.coords.accuracy }));
      
      return initialLocation;
    } catch (err) {
      console.error('Geolocation error:', err);
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setError('Location access denied. Please enable location services and refresh the page.');
          break;
        case err.POSITION_UNAVAILABLE:
          setError('Location information is unavailable. Please check your GPS settings.');
          break;
        case err.TIMEOUT:
          setError('Location request timed out. Please try again.');
          break;
        default:
          setError('An unknown error occurred while accessing location.');
          break;
      }
      
      return false;
    }
  };

  const startLocationSharing = async () => {
    try {
      if (!sessionInfo) {
        setError('Session information not available. Please refresh the page.');
        return;
      }

      // Request location permission
      const initialLocation = await requestLocationPermission();
      if (!initialLocation) return;

      // Start tracking session
      const response = await axios.post(`${API_BASE}/api/tracking/${sessionId}/start`, {
        driverConsent: true,
        initialLocation
      });

      if (response.data.success) {
        setConsentGiven(true);
        setLocationSharing(true);
        startTime.current = Date.now();
        
        // Start watching location
        startLocationWatch(response.data.updateInterval || 30);
        
        setError(null);
        setConnectionStatus('tracking');
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      console.error('Error starting location sharing:', err);
      setError('Failed to start location sharing. Please try again.');
    }
  };

  const startLocationWatch = (updateIntervalSeconds) => {
    if (!navigator.geolocation) return;

    // Watch position changes
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };

        setCurrentLocation(location);
        setTrackingStats(prev => ({ 
          ...prev, 
          accuracy: position.coords.accuracy 
        }));
      },
      (err) => {
        console.error('Location watch error:', err);
        setConnectionStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );

    // Set up regular location updates
    const intervalMs = updateIntervalSeconds * 1000;
    updateInterval.current = setInterval(() => {
      if (currentLocation) {
        sendLocationUpdate(currentLocation);
      }
    }, intervalMs);
  };

  const sendLocationUpdate = async (location) => {
    try {
      const response = await axios.post(`${API_BASE}/api/tracking/${sessionId}/location`, location);
      
      if (response.data.success) {
        setLastUpdate(new Date().toISOString());
        setTrackingStats(prev => ({ 
          ...prev, 
          totalUpdates: prev.totalUpdates + 1 
        }));
        setConnectionStatus('tracking');
      } else {
        console.error('Location update failed:', response.data.error);
        setConnectionStatus('error');
      }
    } catch (err) {
      console.error('Error sending location update:', err);
      setConnectionStatus('error');
    }
  };

  const stopLocationTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }

    if (updateTimer.current) {
      clearInterval(updateTimer.current);
      updateTimer.current = null;
    }

    setLocationSharing(false);
    setConnectionStatus('disconnected');
    startTime.current = null;
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'tracking': return 'text-green-600';
      case 'connected': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'tracking': return 'Location Sharing Active';
      case 'connected': return 'Connected';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const formatAccuracy = (accuracy) => {
    if (!accuracy) return 'Unknown';
    if (accuracy < 10) return `${Math.round(accuracy)}m (Excellent)`;
    if (accuracy < 50) return `${Math.round(accuracy)}m (Good)`;
    if (accuracy < 100) return `${Math.round(accuracy)}m (Fair)`;
    return `${Math.round(accuracy)}m (Poor)`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tracking Error</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tracking session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-center">IndiFleet Tracking</h1>
          <p className="text-center text-blue-100 text-sm">Vehicle: {sessionInfo.vehicleId}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Tracking Status</h2>
            <div className={`flex items-center ${getStatusColor()}`}>
              <div className={`w-3 h-3 rounded-full mr-2 ${
                connectionStatus === 'tracking' ? 'bg-green-500 animate-pulse' : 
                connectionStatus === 'connected' ? 'bg-blue-500' : 
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          </div>
          
          {!consentGiven ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Location Access Required</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      We need your permission to access your location for real-time tracking.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={startLocationSharing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Start Location Sharing
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                Your location will be shared securely with fleet management until {new Date(sessionInfo.expiresAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <p className="font-mono text-lg">{trackingStats.duration}</p>
                </div>
                <div>
                  <span className="text-gray-500">Updates Sent:</span>
                  <p className="font-mono text-lg">{trackingStats.totalUpdates}</p>
                </div>
              </div>
              
              {currentLocation && (
                <div className="bg-gray-50 rounded-md p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">GPS Accuracy:</span>
                    <span className="font-medium">{formatAccuracy(trackingStats.accuracy)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Update:</span>
                    <span className="font-medium">
                      {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Pending...'}
                    </span>
                  </div>
                  {currentLocation.speed && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Speed:</span>
                      <span className="font-medium">{Math.round(currentLocation.speed * 3.6)} km/h</span>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={stopLocationTracking}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                Stop Sharing
              </button>
            </div>
          )}
        </div>

        {/* Current Location Card */}
        {currentLocation && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Location</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Latitude:</span>
                <span className="font-mono">{currentLocation.latitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Longitude:</span>
                <span className="font-mono">{currentLocation.longitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated:</span>
                <span>{new Date(currentLocation.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Session Info Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Session ID:</span>
              <span className="font-mono text-xs">{sessionInfo.sessionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle ID:</span>
              <span className="font-medium">{sessionInfo.vehicleId}</span>
            </div>
            {sessionInfo.routeId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Route:</span>
                <span className="font-medium">{sessionInfo.routeId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Expires:</span>
              <span>{new Date(sessionInfo.expiresAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Keep this page open while driving</p>
            <p>• Ensure location services are enabled</p>
            <p>• Contact dispatch if you experience issues</p>
            <p>• Your location is shared securely and privately</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverTrackingPage;