import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth.jsx';
import alertService from '../../../services/AlertManagementService.js';
import { AlertTriangle, Bell, CheckCircle, Clock, Send, MessageSquare } from 'lucide-react';

const InboxContent = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const { user } = useAuth();

  // Subscribe to real-time alerts for super admin
  useEffect(() => {
    if (user?.userType === 'super_admin' || user?.userType === 'admin' || user?.userType === 'postal') {
      const userId = user?.uid || user?.id; // Prefer uid (Firebase auth ID) over id
      const unsubscribe = alertService.subscribeToAlerts(
        userId,
        'super_admin',
        (newAlerts) => {
          setRealtimeAlerts(newAlerts || []);
        }
      );
      
      return unsubscribe;
    }
  }, [user]);

  // Helper function to get title from alert type
  function getTitleFromAlert(alert) {
    switch (alert.type) {
      case 'SOS': return '🚨 Emergency SOS Alert';
      case 'delay': return '⏰ Vehicle Delay Report';
      case 'route_deviation': return '🗺️ Route Deviation Alert';
      case 'dispatch_instructions': return '📋 Dispatch Instructions';
      case 'route_update': return '🔄 Route Update';
      default: return alert.type.replace('_', ' ').toUpperCase();
    }
  }

  // Combine real-time alerts (no more mock data)
  const combinedAlerts = [
    ...realtimeAlerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      title: getTitleFromAlert(alert),
      sender: alert.source?.userId || 'System',
      truck: alert.vehicleId || 'Unknown',
      date: new Date(alert.timestamp).toLocaleString(),
      message: alert.message,
      status: alert.status,
      severity: alert.severity,
      read: alert.acknowledgedBy ? true : false,
      isRealtime: true,
      rawAlert: alert
    }))
  ];

  // Filter alerts based on active tab
  const filteredAlerts = activeTab === 'all' 
    ? combinedAlerts 
    : combinedAlerts.filter(alert => {
        if (activeTab === 'emergency') return alert.type === 'SOS' || alert.severity === 'critical';
        if (activeTab === 'operational') return ['delay', 'route_deviation', 'route_update'].includes(alert.type);
        return alert.type === activeTab;
      });

  // Enhanced Alert Response with Emergency Protocol  
  const handleAlertResponse = async (alert) => {
    if (alert.isRealtime) {
      try {
        if (alert.type === 'SOS') {
          // Special handling for SOS alerts with emergency protocol
          const emergencyActions = [
            'Contact emergency services if required',
            'Notify fleet management immediately', 
            'Send response instructions to driver',
            'Monitor situation continuously'
          ];
          
          const shouldRespond = window.confirm(
            `🚨 EMERGENCY SOS ALERT DETECTED 🚨\n\n` +
            `Driver: ${alert.rawAlert?.metadata?.driverName || 'Unknown'}\n` +
            `Vehicle: ${alert.truck}\n` +
            `Emergency Type: ${alert.rawAlert?.metadata?.emergencyType || 'General'}\n` +
            `Location: ${alert.rawAlert?.location ? `${alert.rawAlert.location.lat}, ${alert.rawAlert.location.lng}` : 'Unknown'}\n\n` +
            `Emergency Protocol:\n${emergencyActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}\n\n` +
            'Do you want to respond to this emergency?'
          );
          
          if (shouldRespond) {
            setSelectedAlert(alert);
            setShowResponseDialog(true);
          }
        } else if (alert.severity === 'critical') {
          // For other critical alerts, show response dialog
          setSelectedAlert(alert);
          setShowResponseDialog(true);
        } else {
          // For other alerts, just acknowledge
          await alertService.acknowledgeAlert(
            alert.id, 
            user?.email || 'Super Admin'
          );
        }
      } catch (error) {
        console.error('Error handling alert:', error);
      }
    } else {
      console.log('Responding to mock alert:', alert.id);
    }
  };

  // Enhanced Emergency Response System
  const sendResponseToDriver = async () => {
    if (!selectedAlert || !responseMessage.trim()) return;

    try {
      if (selectedAlert.type === 'SOS') {
        // Send emergency response with priority
        await alertService.sendDispatchInstructions(
          user?.id,
          selectedAlert.rawAlert.source.userId,
          selectedAlert.truck,
          `🚨 EMERGENCY RESPONSE: ${responseMessage}`,
          'critical'
        );
        
        // Log emergency response for audit trail
        console.log('Emergency SOS Response Sent:', {
          alertId: selectedAlert.id,
          respondedBy: user?.email,
          response: responseMessage,
          timestamp: new Date().toISOString()
        });
      } else {
        // Send regular dispatch instructions
        await alertService.sendDispatchInstructions(
          user?.id,
          selectedAlert.rawAlert.source.userId,
          selectedAlert.truck,
          responseMessage
        );
      }
      
      // Acknowledge the original alert
      await alertService.acknowledgeAlert(
        selectedAlert.id,
        user?.email || 'Super Admin'
      );
      
      setShowResponseDialog(false);
      setResponseMessage('');
      setSelectedAlert(null);
      
      // Enhanced success notification
      if (selectedAlert.type === 'SOS') {
        alert('🚨 Emergency response sent successfully! Driver will receive immediate notification.');
      } else {
        alert('Response sent to driver successfully!');
      }
    } catch (error) {
      console.error('Error sending response:', error);
      alert('Failed to send response: ' + error.message);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="bg-white w-full border border-gray-300 rounded-lg">
        {/* Enhanced Header with SOS Emergency Banner */}
        <div className="p-6 border-b border-gray-300">
          {combinedAlerts.filter(a => a.type === 'SOS').length > 0 && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-red-800">
                    🚨 EMERGENCY SOS ALERTS ACTIVE
                  </h3>
                  <p className="text-sm text-red-700">
                    {combinedAlerts.filter(a => a.type === 'SOS').length} emergency SOS alert(s) require immediate attention!
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                    {combinedAlerts.filter(a => a.type === 'SOS').length} SOS
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-gray-800">Super Admin Inbox</h1>
          <p className="text-gray-600 mt-2">Manage all alerts and notifications across the fleet</p>
          <div className="mt-3 flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Total Alerts: {combinedAlerts.length}
            </span>
            <span className="text-sm text-gray-500">
              Unread: {combinedAlerts.filter(a => !a.read).length}
            </span>
            <span className={`text-sm font-semibold ${
              combinedAlerts.filter(a => a.type === 'SOS').length > 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              SOS Emergency: {combinedAlerts.filter(a => a.type === 'SOS').length}
            </span>
            <span className="text-sm text-gray-500">
              Critical: {combinedAlerts.filter(a => a.severity === 'critical').length}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-300">
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('all')}
          >
            All Alerts
          </button>
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'emergency' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('emergency')}
          >
            🚨 Emergency ({combinedAlerts.filter(a => a.type === 'SOS' || a.severity === 'critical').length})
          </button>
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'operational' ? 'border-b-2 border-yellow-600 text-yellow-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('operational')}
          >
            Operational
          </button>
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'booking' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('booking')}
          >
            Booking
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-6">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No alerts found</h3>
              <p className="text-gray-500">No alerts match the current filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`border rounded-lg p-5 hover:shadow-lg transition-shadow cursor-pointer break-words ${
                    alert.read ? 'bg-white' : (
                      alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      'bg-blue-50 border-blue-200'
                    )
                  }`}
                  onClick={() => handleAlertResponse(alert)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-800 truncate">{alert.title}</h3>
                        {alert.severity === 'critical' && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">CRITICAL</span>
                        )}
                        {!alert.read && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">NEW</span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-gray-600">
                          <span className="font-medium">From:</span> <span className="truncate">{alert.sender}</span>
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Truck:</span> <span className="truncate max-w-[200px] inline-block" title={alert.truck}>{alert.truck}</span>
                        </p>
                        {alert.message && (
                          <p className="text-gray-700 mt-2 break-words">{alert.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-gray-500 whitespace-nowrap">{alert.date}</p>
                      <div className="mt-2">
                        {alert.type === 'SOS' || alert.severity === 'critical' ? (
                          <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                            Respond
                          </button>
                        ) : (
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Response Dialog */}
      {showResponseDialog && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Respond to {selectedAlert.type === 'SOS' ? 'Emergency' : 'Alert'}
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Alert: {selectedAlert.title}</p>
              <p className="text-sm text-gray-600 mb-2">Truck: {selectedAlert.truck}</p>
              <p className="text-sm text-gray-600 mb-4">Driver: {selectedAlert.sender}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Message:
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 resize-none"
                placeholder="Enter your response or instructions..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowResponseDialog(false);
                  setResponseMessage('');
                  setSelectedAlert(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendResponseToDriver}
                disabled={!responseMessage.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxContent;