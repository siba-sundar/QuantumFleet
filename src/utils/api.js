// Firebase imports for enhanced functionality
import { UserRepository } from '../repositories/UserRepository.js';
import { BusinessRepository } from '../repositories/BusinessRepository.js';
import { DriverRepository } from '../repositories/DriverRepository.js';
import { TrackingSessionRepository } from '../repositories/TrackingSessionRepository.js';
import { AlertRepository } from '../repositories/AlertRepository.js';

// Initialize Firebase repositories
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const driverRepo = new DriverRepository();
const trackingRepo = new TrackingSessionRepository();
const alertRepo = new AlertRepository();

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

// Existing truck management functions
export async function fetchTrucks() {
  const res = await fetch(`${API_BASE}/api/trucks`)
  if (!res.ok) throw new Error('Failed to fetch trucks')
  const data = await res.json()
  return data.trucks || []
}

export async function fetchTruck(id){
  const res = await fetch(`${API_BASE}/api/trucks/${id}`)
  if(!res.ok) throw new Error('Failed to fetch truck')
  const data = await res.json()
  return data.truck
}

// GPS Tracking API functions

// Send tracking link to driver
export async function sendTrackingLink(vehicleId, driverPhone, driverName = 'Driver', customMessage = null) {
  const res = await fetch(`${API_BASE}/api/tracking/send-tracking-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: driverPhone,
      vehicleId,
      driverName,
      customMessage
    })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to send tracking link')
  }
  
  return await res.json()
}

// Get active tracking sessions
export async function fetchActiveSessions() {
  const res = await fetch(`${API_BASE}/api/tracking/sessions?status=active`)
  if (!res.ok) throw new Error('Failed to fetch active sessions')
  const data = await res.json()
  return data.sessions || []
}

// Get real-time vehicle locations
export async function fetchVehicleLocations() {
  const res = await fetch(`${API_BASE}/api/tracking/vehicles/locations`)
  if (!res.ok) throw new Error('Failed to fetch vehicle locations')
  const data = await res.json()
  return data.vehicles || []
}

// Get active alerts
export async function fetchActiveAlerts() {
  const res = await fetch(`${API_BASE}/api/tracking/alerts?status=active`)
  if (!res.ok) throw new Error('Failed to fetch alerts')
  const data = await res.json()
  return data.alerts || []
}

// Acknowledge an alert
export async function acknowledgeAlert(alertId, acknowledgedBy = 'Fleet Manager') {
  const res = await fetch(`${API_BASE}/api/tracking/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ acknowledgedBy })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to acknowledge alert')
  }
  
  return await res.json()
}

// Calculate ETA for vehicle
export async function calculateETA(vehicleId, destination, waypoints = []) {
  const res = await fetch(`${API_BASE}/api/tracking/vehicles/${vehicleId}/eta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ destination, waypoints })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to calculate ETA')
  }
  
  return await res.json()
}

// Get vehicle location history
export async function fetchVehicleHistory(vehicleId, limit = 100) {
  const res = await fetch(`${API_BASE}/api/tracking/vehicles/${vehicleId}/history?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch vehicle history')
  const data = await res.json()
  return data.locations || []
}

// End tracking session
export async function endTrackingSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to end tracking session')
  }
  
  return await res.json()
}

// Resend tracking link
export async function resendTrackingLink(sessionId, driverName = 'Driver') {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ driverName })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to resend tracking link')
  }
  
  return await res.json()
}

// Get session info (for driver interface)
export async function fetchSessionInfo(sessionId) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/info`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch session info')
  }
  
  return await res.json()
}

// Start location tracking (for driver)
export async function startLocationTracking(sessionId, driverConsent, initialLocation) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      driverConsent,
      initialLocation
    })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to start location tracking')
  }
  
  return await res.json()
}

// Update vehicle location (for driver)
export async function updateVehicleLocation(sessionId, locationData) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(locationData)
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update location')
  }
  
  return await res.json()
}

// Firebase-integrated functions

// Enhanced tracking session management
export async function createTrackingSession(sessionData) {
  try {
    // Create session in Firebase
    const firebaseSession = await trackingRepo.createSession(sessionData);
    
    // Optionally sync with backend API if needed
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/api/tracking/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firebaseSession)
        });
      } catch (error) {
        console.warn('Failed to sync with backend API:', error);
      }
    }
    
    return firebaseSession;
  } catch (error) {
    console.error('Error creating tracking session:', error);
    throw error;
  }
}

// Enhanced alert management
export async function createAlert(alertData) {
  try {
    // Create alert in Firebase
    const firebaseAlert = await alertRepo.createAlert(alertData);
    
    // Optionally sync with backend API
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/api/tracking/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firebaseAlert)
        });
      } catch (error) {
        console.warn('Failed to sync alert with backend API:', error);
      }
    }
    
    return firebaseAlert;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
}

// Get user profile from Firebase
export async function getUserProfile(uid, userType) {
  try {
    let profile = null;
    
    switch (userType) {
      case 'business':
        profile = await businessRepo.findByUserId(uid);
        break;
      case 'driver':
        profile = await driverRepo.findByUserId(uid);
        break;
      case 'postal':
        profile = await postalRepo.findByUserId(uid);
        break;
      default:
        throw new Error('Invalid user type');
    }
    
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

// Enhanced vehicle tracking with Firebase
export async function getFirebaseTrackingSessions(filters = {}) {
  try {
    const { businessUid, status, driverUid } = filters;
    let sessions = [];
    
    if (businessUid) {
      sessions = await trackingRepo.findByBusinessUid(businessUid, status);
    } else if (driverUid) {
      sessions = await trackingRepo.findByDriverUid(driverUid, status);
    } else {
      sessions = status ? 
        await trackingRepo.findWhere([{ field: 'status', operator: '==', value: status }]) :
        await trackingRepo.findAll();
    }
    
    return sessions;
  } catch (error) {
    console.error('Error fetching Firebase tracking sessions:', error);
    throw error;
  }
}

// Enhanced alerts with Firebase
export async function getFirebaseAlerts(filters = {}) {
  try {
    const { businessUid, severity, vehicleId } = filters;
    let alerts = [];
    
    if (businessUid) {
      alerts = await alertRepo.findByBusinessUid(businessUid, severity);
    } else if (vehicleId) {
      alerts = await alertRepo.findByVehicleId(vehicleId);
    } else {
      alerts = await alertRepo.findAll();
    }
    
    return alerts;
  } catch (error) {
    console.error('Error fetching Firebase alerts:', error);
    throw error;
  }
}

export default { 
  // Existing functions
  fetchTrucks, 
  fetchTruck,
  
  // GPS Tracking functions
  sendTrackingLink,
  fetchActiveSessions,
  fetchVehicleLocations,
  fetchActiveAlerts,
  acknowledgeAlert,
  calculateETA,
  fetchVehicleHistory,
  endTrackingSession,
  resendTrackingLink,
  fetchSessionInfo,
  startLocationTracking,
  updateVehicleLocation
}
