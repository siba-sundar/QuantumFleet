import React, { useState, useEffect, useRef } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import axios from 'axios';

// Google Maps component wrapper
const MapComponent = ({ vehicles, alerts, onVehicleSelect, selectedVehicle, center, zoom }) => {
  const mapRef = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  const infoWindow = useRef(null);

  useEffect(() => {
    if (!mapRef.current || map.current) return;

    // Initialize map
    map.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Initialize info window
    infoWindow.current = new window.google.maps.InfoWindow();
  }, [center, zoom]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.setMap(null));
    markers.current = {};

    // Add vehicle markers
    vehicles.forEach(vehicle => {
      const { vehicleId, location, status, alerts: vehicleAlerts, lastUpdate } = vehicle;
      
      // Determine marker color based on status and alerts
      let markerColor = '#22c55e'; // Green - normal
      if (vehicleAlerts.length > 0) {
        const hasCritical = vehicleAlerts.some(alert => 
          ['breakdown', 'emergency'].includes(alert)
        );
        const hasHigh = vehicleAlerts.some(alert => 
          ['delay', 'detour', 'speed'].includes(alert)
        );
        
        if (hasCritical) markerColor = '#ef4444'; // Red - critical
        else if (hasHigh) markerColor = '#f59e0b'; // Orange - warning
        else markerColor = '#3b82f6'; // Blue - info
      }

      if (status === 'connection_lost' || location.isStale) {
        markerColor = '#6b7280'; // Gray - stale/disconnected
      }

      // Create custom marker icon
      const markerIcon = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: markerColor,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2
      };

      // Create marker
      const marker = new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map.current,
        title: `Vehicle ${vehicleId}`,
        icon: markerIcon,
        animation: vehicleAlerts.length > 0 ? window.google.maps.Animation.BOUNCE : null
      });

      // Create info window content
      const infoContent = `
        <div style="max-width: 300px;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
            Vehicle ${vehicleId}
          </h3>
          <div style="font-size: 14px; color: #4b5563; line-height: 1.4;">
            <div style="margin-bottom: 4px;">
              <strong>Status:</strong> ${status.replace('_', ' ').toUpperCase()}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Location:</strong> ${location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Last Update:</strong> ${new Date(lastUpdate).toLocaleTimeString()}
            </div>
            ${location.speed ? `
              <div style="margin-bottom: 4px;">
                <strong>Speed:</strong> ${Math.round(location.speed * 3.6)} km/h
              </div>
            ` : ''}
            ${vehicleAlerts.length > 0 ? `
              <div style="margin-top: 8px; padding: 6px; background-color: #fef3c7; border-radius: 4px;">
                <strong style="color: #92400e;">Active Alerts:</strong><br>
                ${vehicleAlerts.map(alert => `• ${alert.replace('_', ' ').toUpperCase()}`).join('<br>')}
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Add click listener
      marker.addListener('click', () => {
        infoWindow.current.setContent(infoContent);
        infoWindow.current.open(map.current, marker);
        onVehicleSelect(vehicle);
      });

      markers.current[vehicleId] = marker;
    });

    // Fit bounds to show all vehicles
    if (vehicles.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      vehicles.forEach(vehicle => {
        bounds.extend({
          lat: vehicle.location.latitude,
          lng: vehicle.location.longitude
        });
      });
      map.current.fitBounds(bounds);
    }
  }, [vehicles, onVehicleSelect]);

  // Highlight selected vehicle
  useEffect(() => {
    if (!selectedVehicle || !markers.current[selectedVehicle.vehicleId]) return;

    const marker = markers.current[selectedVehicle.vehicleId];
    marker.setAnimation(window.google.maps.Animation.BOUNCE);
    
    setTimeout(() => {
      marker.setAnimation(null);
    }, 2000);
  }, [selectedVehicle]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

const FleetDashboard = () => {
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [filterStatus, setFilterStatus] = useState('all');
  
  const refreshInterval = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      startAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [autoRefresh]);

  const startAutoRefresh = () => {
    refreshInterval.current = setInterval(() => {
      fetchDashboardData(false); // Silent refresh
    }, 30000); // 30 seconds
  };

  const stopAutoRefresh = () => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
  };

  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const [vehiclesResponse, alertsResponse] = await Promise.all([
        axios.get(`${API_BASE}/api/tracking/vehicles/locations`),
        axios.get(`${API_BASE}/api/tracking/alerts?status=active`)
      ]);

      setVehicles(vehiclesResponse.data.vehicles || []);
      setAlerts(alertsResponse.data.alerts || []);
      setLastUpdate(new Date().toISOString());
      setError(null);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await axios.post(`${API_BASE}/api/tracking/alerts/${alertId}/acknowledge`, {
        acknowledgedBy: 'Fleet Manager'
      });
      
      // Refresh alerts
      const response = await axios.get(`${API_BASE}/api/tracking/alerts?status=active`);
      setAlerts(response.data.alerts || []);
      
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getVehicleStatusColor = (status, alerts) => {
    if (alerts.length > 0) {
      const hasCritical = alerts.some(alert => ['breakdown', 'emergency'].includes(alert));
      const hasHigh = alerts.some(alert => ['delay', 'detour', 'speed'].includes(alert));
      
      if (hasCritical) return 'text-red-600 bg-red-100';
      if (hasHigh) return 'text-orange-600 bg-orange-100';
      return 'text-blue-600 bg-blue-100';
    }
    
    switch (status) {
      case 'in_transit': return 'text-green-600 bg-green-100';
      case 'connection_lost': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'alerts') return vehicle.alerts.length > 0;
    return vehicle.status === filterStatus;
  });

  const mapCenter = vehicles.length > 0 
    ? { 
        lat: vehicles.reduce((sum, v) => sum + v.location.latitude, 0) / vehicles.length,
        lng: vehicles.reduce((sum, v) => sum + v.location.longitude, 0) / vehicles.length
      }
    : { lat: 28.7041, lng: 77.1025 }; // Default to Delhi

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800">Google Maps API Key Required</h3>
        <p className="text-yellow-700 mt-2">
          Please add your Google Maps API key to the .env file as VITE_GOOGLE_MAPS_API_KEY to enable the map view.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Dashboard</h1>
            <p className="text-sm text-gray-500">
              Real-time tracking • {vehicles.length} vehicles • {alerts.length} active alerts
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex rounded-md bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Map View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
            </div>

            {/* Auto Refresh Toggle */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={toggleAutoRefresh}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Auto refresh</span>
            </label>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Status and Filters */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Vehicles ({vehicles.length})</option>
              <option value="in_transit">In Transit ({vehicles.filter(v => v.status === 'in_transit').length})</option>
              <option value="connection_lost">Connection Lost ({vehicles.filter(v => v.status === 'connection_lost').length})</option>
              <option value="alerts">With Alerts ({vehicles.filter(v => v.alerts.length > 0).length})</option>
            </select>
          </div>

          {lastUpdate && (
            <p className="text-xs text-gray-500">
              Last updated: {new Date(lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map/List View */}
        <div className="flex-1 relative">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Connection Error</h3>
                <p className="text-gray-500 mt-1">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading fleet data...</p>
              </div>
            </div>
          ) : viewMode === 'map' ? (
            <Wrapper apiKey={GOOGLE_MAPS_API_KEY}>
              <MapComponent
                vehicles={filteredVehicles}
                alerts={alerts}
                onVehicleSelect={setSelectedVehicle}
                selectedVehicle={selectedVehicle}
                center={mapCenter}
                zoom={10}
              />
            </Wrapper>
          ) : (
            <div className="p-6 space-y-4 overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">No vehicles found</h3>
                  <p className="text-gray-500">No vehicles match the current filter.</p>
                </div>
              ) : (
                filteredVehicles.map(vehicle => (
                  <div
                    key={vehicle.vehicleId}
                    className={`bg-white rounded-lg shadow p-4 border-l-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedVehicle?.vehicleId === vehicle.vehicleId ? 'ring-2 ring-blue-500' : ''
                    } ${vehicle.alerts.length > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Vehicle {vehicle.vehicleId}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getVehicleStatusColor(vehicle.status, vehicle.alerts)}`}>
                        {vehicle.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Location:</span>
                        <p className="text-gray-800">{vehicle.location.address || `${vehicle.location.latitude.toFixed(4)}, ${vehicle.location.longitude.toFixed(4)}`}</p>
                      </div>
                      <div>
                        <span className="font-medium">Last Update:</span>
                        <p className="text-gray-800">{new Date(vehicle.lastUpdate).toLocaleTimeString()}</p>
                      </div>
                      {vehicle.location.speed && (
                        <div>
                          <span className="font-medium">Speed:</span>
                          <p className="text-gray-800">{Math.round(vehicle.location.speed * 3.6)} km/h</p>
                        </div>
                      )}
                      {vehicle.route.routeId && (
                        <div>
                          <span className="font-medium">Route:</span>
                          <p className="text-gray-800">{vehicle.route.routeId}</p>
                        </div>
                      )}
                    </div>

                    {vehicle.alerts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm font-medium text-red-600">Active Alerts:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {vehicle.alerts.map((alert, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                              {alert.replace('_', ' ').toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Alerts Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <p className="text-sm text-gray-500">{alerts.length} alerts require attention</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center">
                <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
                <p className="text-gray-500">No active alerts at this time.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {alerts.map(alert => (
                  <div
                    key={alert.alertId}
                    className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {alert.type.replace('_', ' ')}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            Vehicle {alert.vehicleId}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => acknowledgeAlert(alert.alertId)}
                        className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                        title="Acknowledge alert"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;