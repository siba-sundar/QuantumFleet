import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrackingManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverName, setDriverName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sessionDuration, setSessionDuration] = useState(8);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    fetchVehicles();
    fetchActiveSessions();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/trucks`);
      setVehicles(response.data.trucks || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/tracking/sessions?status=active`);
      setActiveSessions(response.data.sessions || []);
    } catch (err) {
      console.error('Error fetching active sessions:', err);
    }
  };

  const handleSendTrackingLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!selectedVehicle || !driverPhone) {
        throw new Error('Please select a vehicle and enter driver phone number');
      }

      const response = await axios.post(`${API_BASE}/api/tracking/send-tracking-link`, {
        phone: driverPhone,
        vehicleId: selectedVehicle,
        driverName: driverName || 'Driver',
        customMessage: customMessage || null
      });

      if (response.data.success) {
        setSuccess(`Tracking link sent successfully! ${response.data.simulated ? '(Simulated)' : ''}`);
        
        // Reset form
        setSelectedVehicle('');
        setDriverPhone('');
        setDriverName('');
        setCustomMessage('');
        
        // Refresh active sessions
        fetchActiveSessions();
      } else {
        throw new Error(response.data.error || 'Failed to send tracking link');
      }

    } catch (err) {
      console.error('Error sending tracking link:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async (sessionId, vehicleId) => {
    try {
      const response = await axios.post(`${API_BASE}/api/tracking/${sessionId}/resend`, {
        driverName: 'Driver'
      });

      if (response.data.success) {
        setSuccess(`Tracking link resent for vehicle ${vehicleId}! ${response.data.simulated ? '(Simulated)' : ''}`);
      }
    } catch (err) {
      console.error('Error resending link:', err);
      setError(err.response?.data?.error || 'Failed to resend tracking link');
    }
  };

  const handleEndSession = async (sessionId, vehicleId) => {
    try {
      const response = await axios.post(`${API_BASE}/api/tracking/${sessionId}/end`);
      
      if (response.data.success) {
        setSuccess(`Tracking session ended for vehicle ${vehicleId}`);
        fetchActiveSessions();
      }
    } catch (err) {
      console.error('Error ending session:', err);
      setError(err.response?.data?.error || 'Failed to end tracking session');
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // Format for display: +91 98765 43210
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      const countryCode = cleaned.substring(0, cleaned.length - 10);
      const number = cleaned.substring(cleaned.length - 10);
      return `+${countryCode} ${number.substring(0, 5)} ${number.substring(5)}`;
    }
    return phone;
  };

  const getSessionStatus = (session) => {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const lastUpdate = session.lastLocationUpdate ? new Date(session.lastLocationUpdate) : null;
    
    if (now > expiresAt) return { status: 'Expired', color: 'text-red-600 bg-red-100' };
    if (!lastUpdate) return { status: 'Waiting', color: 'text-yellow-600 bg-yellow-100' };
    
    const timeSinceUpdate = now - lastUpdate;
    if (timeSinceUpdate > 5 * 60 * 1000) return { status: 'Stale', color: 'text-orange-600 bg-orange-100' };
    
    return { status: 'Active', color: 'text-green-600 bg-green-100' };
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">GPS Tracking Management</h1>
        <p className="text-gray-600">Send tracking links to drivers and manage active tracking sessions</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Tracking Link Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Tracking Link</h2>
          
          <form onSubmit={handleSendTrackingLink} className="space-y-4">
            <div>
              <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700 mb-1">
                Select Vehicle *
              </label>
              <select
                id="vehicle"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Choose a vehicle...</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.truckId} value={vehicle.truckId}>
                    Vehicle {vehicle.truckId} {vehicle.number ? `(${vehicle.number})` : ''}
                    {vehicle.driver ? ` - ${vehicle.driver}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="driverPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Driver Phone Number *
              </label>
              <input
                type="tel"
                id="driverPhone"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91 for India)</p>
            </div>

            <div>
              <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-1">
                Driver Name (Optional)
              </label>
              <input
                type="text"
                id="driverName"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700 mb-1">
                Session Duration (Hours)
              </label>
              <select
                id="sessionDuration"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>

            <div>
              <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message (Optional)
              </label>
              <textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                placeholder="Custom message to include in SMS..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to use default message</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Sending...' : 'Send Tracking Link'}
            </button>
          </form>
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Active Sessions</h2>
            <button
              onClick={fetchActiveSessions}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Refresh
            </button>
          </div>

          {activeSessions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No Active Sessions</h3>
              <p className="text-gray-500">No tracking sessions are currently active.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map(session => {
                const sessionStatus = getSessionStatus(session);
                return (
                  <div key={session.sessionId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Vehicle {session.vehicleId}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${sessionStatus.color}`}>
                        {sessionStatus.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Phone:</span> {formatPhoneNumber(session.driverPhone)}
                      </div>
                      <div>
                        <span className="font-medium">Started:</span> {new Date(session.startedAt).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Expires:</span> {new Date(session.expiresAt).toLocaleString()}
                      </div>
                      {session.lastLocationUpdate && (
                        <div>
                          <span className="font-medium">Last Update:</span> {new Date(session.lastLocationUpdate).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => handleResendLink(session.sessionId, session.vehicleId)}
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                      >
                        Resend Link
                      </button>
                      <button
                        onClick={() => handleEndSession(session.sessionId, session.vehicleId)}
                        className="flex-1 bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                      >
                        End Session
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{vehicles.length}</div>
            <div className="text-sm text-gray-600">Total Vehicles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{activeSessions.length}</div>
            <div className="text-sm text-gray-600">Active Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {activeSessions.filter(s => s.lastLocationUpdate).length}
            </div>
            <div className="text-sm text-gray-600">Tracking</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {activeSessions.filter(s => new Date() > new Date(s.expiresAt)).length}
            </div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingManagement;