// Firebase imports for enhanced functionality
import { UserRepository } from "../repositories/UserRepository.js";
import { BusinessRepository } from "../repositories/BusinessRepository.js";
import { DriverRepository } from "../repositories/DriverRepository.js";
import { TrackingSessionRepository } from "../repositories/TrackingSessionRepository.js";
import { AlertRepository } from "../repositories/AlertRepository.js";
import axios from "axios";
// Initialize Firebase repositories
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const driverRepo = new DriverRepository();
const trackingRepo = new TrackingSessionRepository();
const alertRepo = new AlertRepository();

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4001";

// Existing truck management functions
export async function fetchTrucks() {
  const res = await fetch(`${API_BASE}/api/trucks`);
  if (!res.ok) throw new Error("Failed to fetch trucks");
  const data = await res.json();
  return data.trucks || [];
}

export async function fetchTruck(id) {
  const res = await fetch(`${API_BASE}/api/trucks/${id}`);
  if (!res.ok) throw new Error("Failed to fetch truck");
  const data = await res.json();
  return data.truck;
}

// Enhanced Fleet Management API functions

// Fetch enhanced fleet data with reservations and sentiment
export async function fetchEnhancedFleet(
  includeReserved = true,
  includeSentiment = true,
  businessUid = null
) {
  const params = new URLSearchParams({
    includeReserved: includeReserved.toString(),
    includeSentiment: includeSentiment.toString(),
  });

  // Add business UID to filter results if provided
  if (businessUid) {
    params.set("businessUid", businessUid);
  }

  const res = await fetch(`${API_BASE}/api/trucks/enhanced?${params}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch enhanced fleet data");
  }

  return await res.json();
}

// Reserve truck for existing reservation
export async function reserveTruck(
  truckId,
  reservationId,
  assignDriver = false
) {
  const res = await fetch(`${API_BASE}/api/trucks/${truckId}/reserve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reservationId,
      assignDriver,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reserve truck");
  }

  return await res.json();
}

// Sentiment Analysis API functions

// Submit driver sentiment survey
export async function submitSentimentSurvey(surveyData) {
  const res = await fetch(`${API_BASE}/api/sentiment/survey`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(surveyData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to submit sentiment survey");
  }

  return await res.json();
}

// Get driver sentiment history
export async function fetchDriverSentimentHistory(driverId, limit = 10) {
  const res = await fetch(
    `${API_BASE}/api/sentiment/driver/${driverId}?limit=${limit}`
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sentiment history");
  }

  return await res.json();
}

// Get current driver sentiment
export async function fetchDriverSentiment(driverId) {
  const res = await fetch(
    `${API_BASE}/api/sentiment/driver/${driverId}/current`
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch driver sentiment");
  }

  return await res.json();
}

// Get driver sentiment submission quota (2-per-month limit)
export async function fetchSentimentQuota(driverId) {
  const res = await fetch(`${API_BASE}/api/sentiment/driver/${driverId}/quota`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch sentiment quota");
  }

  return await res.json();
}

// Get fleet sentiment statistics
export async function fetchFleetSentimentStats() {
  const res = await fetch(`${API_BASE}/api/sentiment/fleet/stats`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || "Failed to fetch fleet sentiment statistics"
    );
  }

  return await res.json();
}

// GPS Tracking API functions

// Send tracking link to driver (supports both phone and email)
export async function sendTrackingLink(
  vehicleId,
  contactInfo,
  contactMethod = "phone",
  driverName = "Driver",
  customMessage = null
) {
  const requestData = {
    vehicleId,
    driverName,
    customMessage,
    contactMethod,
  };

  if (contactMethod === "phone") {
    requestData.phone = contactInfo;
  } else if (contactMethod === "email") {
    requestData.email = contactInfo;
  } else {
    throw new Error('Invalid contact method. Must be "phone" or "email"');
  }

  const res = await fetch(`${API_BASE}/api/tracking/send-tracking-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send tracking link");
  }

  return await res.json();
}

// Get active tracking sessions
export async function fetchActiveSessions() {
  const res = await fetch(`${API_BASE}/api/tracking/sessions?status=active`);
  if (!res.ok) throw new Error("Failed to fetch active sessions");
  const data = await res.json();
  return data.sessions || [];
}

// Get real-time vehicle locations
export async function fetchVehicleLocations() {
  const res = await fetch(`${API_BASE}/api/tracking/vehicles/locations`);
  if (!res.ok) throw new Error("Failed to fetch vehicle locations");
  const data = await res.json();
  return data.vehicles || [];
}

// Get active alerts
export async function fetchActiveAlerts() {
  const res = await fetch(`${API_BASE}/api/tracking/alerts?status=active`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  const data = await res.json();
  return data.alerts || [];
}

// Acknowledge an alert
export async function acknowledgeAlert(
  alertId,
  acknowledgedBy = "Fleet Manager"
) {
  const res = await fetch(
    `${API_BASE}/api/tracking/alerts/${alertId}/acknowledge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acknowledgedBy }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to acknowledge alert");
  }

  return await res.json();
}

// Calculate ETA for vehicle
export async function calculateETA(vehicleId, destination, waypoints = []) {
  const res = await fetch(
    `${API_BASE}/api/tracking/vehicles/${vehicleId}/eta`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ destination, waypoints }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to calculate ETA");
  }

  return await res.json();
}

// Get vehicle location history
export async function fetchVehicleHistory(vehicleId, limit = 100) {
  const res = await fetch(
    `${API_BASE}/api/tracking/vehicles/${vehicleId}/history?limit=${limit}`
  );
  if (!res.ok) throw new Error("Failed to fetch vehicle history");
  const data = await res.json();
  return data.locations || [];
}

// End tracking session
export async function endTrackingSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to end tracking session");
  }

  return await res.json();
}

// Resend tracking link
export async function resendTrackingLink(sessionId, driverName = "Driver") {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ driverName }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to resend tracking link");
  }

  return await res.json();
}

// Get session info (for driver interface)
export async function fetchSessionInfo(sessionId) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/info`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch session info");
  }

  return await res.json();
}

// Start location tracking (for driver)
export async function startLocationTracking(
  sessionId,
  driverConsent,
  initialLocation
) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      driverConsent,
      initialLocation,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to start location tracking");
  }

  return await res.json();
}

// Update vehicle location (for driver)
export async function updateVehicleLocation(sessionId, locationData) {
  const res = await fetch(`${API_BASE}/api/tracking/${sessionId}/location`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(locationData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update location");
  }

  return await res.json();
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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(firebaseSession),
        });
      } catch (error) {
        console.warn("Failed to sync with backend API:", error);
      }
    }

    return firebaseSession;
  } catch (error) {
    console.error("Error creating tracking session:", error);
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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(firebaseAlert),
        });
      } catch (error) {
        console.warn("Failed to sync alert with backend API:", error);
      }
    }

    return firebaseAlert;
  } catch (error) {
    console.error("Error creating alert:", error);
    throw error;
  }
}

// Get user profile from Firebase by user type
export async function getUserProfileByType(uid, userType) {
  try {
    let profile = null;

    switch (userType) {
      case "business":
        profile = await businessRepo.findByUserId(uid);
        break;
      case "driver":
        profile = await driverRepo.findByUserId(uid);
        break;
      case "postal":
        profile = await postalRepo.findByUserId(uid);
        break;
      default:
        throw new Error("Invalid user type");
    }

    return profile;
  } catch (error) {
    console.error("Error fetching user profile by type:", error);
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
      sessions = status
        ? await trackingRepo.findWhere([
            { field: "status", operator: "==", value: status },
          ])
        : await trackingRepo.findAll();
    }

    return sessions;
  } catch (error) {
    console.error("Error fetching Firebase tracking sessions:", error);
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
    console.error("Error fetching Firebase alerts:", error);
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
  updateVehicleLocation,

  // Truck Reservation functions
  createReservation,
  fetchReservations,
  fetchReservation,
  updateReservationStatus,
  updatePaymentStatus,
  getReservationStats,
  getUpcomingPickups,

  // User Management functions
  registerUser,
  loginUser,
  getUserProfile,
  getUserProfileByType,
  updateUserProfile,

  // Business Profile functions
  createBusinessProfile,
  getBusinessProfile,
  updateBusinessProfile,
  getBusinessProfiles,

  // Driver Profile functions
  createDriverProfile,
  getDriverProfile,
  updateDriverProfile,
  updateDriverProfessionalInfo,
  getDriverProfiles,
  fetchAvailableDrivers,
  updateDriverAssignment,

  // Analytics functions
  getFleetStats,
  getPerformanceData,
  getRouteAnalytics,
  getDriverAnalytics,

  // WebSocket and Real-time functions
  sendRealtimeLocationUpdate,
  createRealtimeAlert,
  getWebSocketStats,
  sendTestMessage,
};

// Truck Reservation API functions

// reservations.js
// export async function createReservation(reservationData) {
//   const res = await fetch(`${API_BASE}/api/reservations`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(reservationData)
//   });

//   if (!res.ok) {
//     const error = await res.json();
//     throw new Error(error.error || 'Failed to create reservation');
//   }

//   return await res.json();
// }
export async function createReservation(reservationData) {
  try {
    const res = await axios.post(
      `${API_BASE}/api/reservations`,
      reservationData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.data.success) {
      throw new Error(res.data.message || "Failed to create reservation");
    }

    return res.data;
  } catch (error) {
    // Handle axios errors
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.message || `Server error: ${error.response.status}`);
    } else if (error.request) {
      // Request was made but no response
      throw new Error("No response from server. Please check your connection.");
    } else {
      // Other errors
      throw new Error(error.message || "Failed to create reservation");
    }
  }
}
// Fetch reservations (with optional filters)
export async function fetchReservations(filters = {}) {
  const params = new URLSearchParams();

  if (filters.businessUid) params.append("businessUid", filters.businessUid);
  if (filters.status) params.append("status", filters.status);

  const res = await fetch(`${API_BASE}/api/reservations?${params}`);
  if (!res.ok) throw new Error("Failed to fetch reservations");

  const data = await res.json();
  return data.reservations || [];
}

// Fetch a single reservation
export async function fetchReservation(reservationId) {
  const res = await fetch(`${API_BASE}/api/reservations/${reservationId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch reservation");
  }

  const data = await res.json();
  return data.reservation;
}

// Update reservation status
export async function updateReservationStatus(reservationId, status) {
  const res = await fetch(
    `${API_BASE}/api/reservations/${reservationId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update reservation status");
  }

  return await res.json();
}

// Update payment status
export async function updatePaymentStatus(
  reservationId,
  paymentStatus,
  paymentDetails = {}
) {
  const res = await fetch(
    `${API_BASE}/api/reservations/${reservationId}/payment`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentStatus, paymentDetails }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update payment status");
  }

  return await res.json();
}

// Get reservation statistics
export async function getReservationStats(businessUid = null) {
  const params = businessUid ? `?businessUid=${businessUid}` : "";
  const res = await fetch(
    `${API_BASE}/api/reservations/stats/summary${params}`
  );

  if (!res.ok) throw new Error("Failed to fetch reservation statistics");

  const data = await res.json();
  return data.statistics;
}

// Get upcoming pickups
export async function getUpcomingPickups(days = 7) {
  const res = await fetch(
    `${API_BASE}/api/reservations/upcoming/pickups?days=${days}`
  );
  if (!res.ok) throw new Error("Failed to fetch upcoming pickups");

  const data = await res.json();
  return data.upcomingPickups || [];
}

// User Management API functions

// Register user
export async function registerUser(userData) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to register user");
  }

  return await res.json();
}

// Login user
export async function loginUser(credentials) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to login");
  }

  return await res.json();
}

// Get user profile
export async function getUserProfile(userId) {
  const res = await fetch(`${API_BASE}/api/users/${userId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch user profile");
  }

  const data = await res.json();
  return data.user;
}

// Update user profile
export async function updateUserProfile(userId, updateData) {
  const res = await fetch(`${API_BASE}/api/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update user profile");
  }

  return await res.json();
}

// Business Profile API functions

// Create business profile
export async function createBusinessProfile(profileData) {
  const res = await fetch(`${API_BASE}/api/business-profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create business profile");
  }

  return await res.json();
}

// Get business profile
export async function getBusinessProfile(uid) {
  const res = await fetch(`${API_BASE}/api/business-profiles/${uid}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch business profile");
  }

  const data = await res.json();
  return data.profile;
}

// Update business profile
export async function updateBusinessProfile(uid, updateData) {
  const res = await fetch(`${API_BASE}/api/business-profiles/${uid}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update business profile");
  }

  return await res.json();
}

// List business profiles
export async function getBusinessProfiles(filters = {}) {
  const params = new URLSearchParams();

  if (filters.limit) params.append("limit", filters.limit);
  if (filters.postalBranch) params.append("postalBranch", filters.postalBranch);
  if (filters.businessType) params.append("businessType", filters.businessType);

  const res = await fetch(`${API_BASE}/api/business-profiles?${params}`);
  if (!res.ok) throw new Error("Failed to fetch business profiles");

  const data = await res.json();
  return data.profiles || [];
}

// Driver Profile API functions

// Create driver profile
export async function createDriverProfile(profileData) {
  const res = await fetch(`${API_BASE}/api/driver-profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create driver profile");
  }

  return await res.json();
}

// Get driver profile
export async function getDriverProfile(uid) {
  const res = await fetch(`${API_BASE}/api/driver-profiles/${uid}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch driver profile");
  }

  const data = await res.json();
  return data.profile;
}

// Update driver profile
export async function updateDriverProfile(uid, updateData) {
  const res = await fetch(`${API_BASE}/api/driver-profiles/${uid}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update driver profile");
  }

  return await res.json();
}

// Update driver professional info
export async function updateDriverProfessionalInfo(uid, professionalInfo) {
  const res = await fetch(
    `${API_BASE}/api/driver-profiles/${uid}/professional`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ professionalInfo }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update professional information");
  }

  return await res.json();
}

// List driver profiles
export async function getDriverProfiles(filters = {}) {
  const params = new URLSearchParams();

  if (filters.limit) params.append("limit", filters.limit);
  if (filters.status) params.append("status", filters.status);
  if (filters.verified) params.append("verified", filters.verified);
  if (filters.stateOfIssue) params.append("stateOfIssue", filters.stateOfIssue);

  const res = await fetch(`${API_BASE}/api/driver-profiles?${params}`);
  if (!res.ok) throw new Error("Failed to fetch driver profiles");

  const data = await res.json();
  return data.profiles || [];
}

// Fetch available drivers for truck assignment
export async function fetchAvailableDrivers(
  includeAssigned = false,
  includeSentiment = true
) {
  const params = new URLSearchParams({
    includeAssigned: includeAssigned.toString(),
    includeSentiment: includeSentiment.toString(),
  });

  const res = await fetch(`${API_BASE}/api/drivers/available?${params}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch available drivers");
  }

  return await res.json();
}

// Update driver assignment status
export async function updateDriverAssignment(driverId, assignmentData) {
  const res = await fetch(`${API_BASE}/api/drivers/${driverId}/assignment`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assignmentData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update driver assignment");
  }

  return await res.json();
}

// Analytics and MIS Reports API functions

// Get fleet statistics
export async function getFleetStats(businessUid = null, timeRange = "30d") {
  const params = new URLSearchParams();
  if (businessUid) params.append("businessUid", businessUid);
  if (timeRange) params.append("timeRange", timeRange);

  const res = await fetch(`${API_BASE}/api/analytics/fleet-stats?${params}`);
  if (!res.ok) throw new Error("Failed to fetch fleet statistics");

  const data = await res.json();
  return data.stats;
}

// Get performance metrics
export async function getPerformanceData(
  businessUid = null,
  period = "monthly"
) {
  const params = new URLSearchParams();
  if (businessUid) params.append("businessUid", businessUid);
  if (period) params.append("period", period);

  const res = await fetch(`${API_BASE}/api/analytics/performance?${params}`);
  if (!res.ok) throw new Error("Failed to fetch performance data");

  const data = await res.json();
  return data.data || [];
}

// Get route analytics
export async function getRouteAnalytics(businessUid = null) {
  const params = businessUid ? `?businessUid=${businessUid}` : "";
  const res = await fetch(`${API_BASE}/api/analytics/routes${params}`);

  if (!res.ok) throw new Error("Failed to fetch route analytics");

  const data = await res.json();
  return data.routes || [];
}

// Get driver analytics
export async function getDriverAnalytics(businessUid = null) {
  const params = businessUid ? `?businessUid=${businessUid}` : "";
  const res = await fetch(`${API_BASE}/api/analytics/drivers${params}`);

  if (!res.ok) throw new Error("Failed to fetch driver analytics");

  const data = await res.json();
  return data.drivers || [];
}

// WebSocket and Real-time API functions

// Send real-time location update
export async function sendRealtimeLocationUpdate(locationData) {
  const res = await fetch(`${API_BASE}/api/realtime/location-update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(locationData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send location update");
  }

  return await res.json();
}

// Create real-time alert
export async function createRealtimeAlert(alertData) {
  const res = await fetch(`${API_BASE}/api/realtime/alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(alertData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create alert");
  }

  return await res.json();
}

// Get WebSocket connection statistics
export async function getWebSocketStats() {
  const res = await fetch(`${API_BASE}/api/realtime/stats`);
  if (!res.ok) throw new Error("Failed to fetch WebSocket statistics");

  const data = await res.json();
  return data.stats;
}

// Send test WebSocket message
export async function sendTestMessage(message, event = "test_message") {
  const res = await fetch(`${API_BASE}/api/realtime/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, event }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send test message");
  }

  return await res.json();
}
