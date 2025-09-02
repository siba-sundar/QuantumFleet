import express from 'express';
import smsService from '../services/smsService.js';
import emailService from '../services/emailService.js';
import gpsTrackingService from '../services/gpsTrackingService.js';
import geofencingService from '../services/geofencingService.js';
import { TrackingSession, Alert } from '../models/gpsModels.js';

const router = express.Router();

// SMS Link Management Routes

/**
 * Generate tracking link for vehicle
 * POST /api/tracking/generate-link
 */
router.post('/generate-link', async (req, res) => {
  try {
    const { vehicleId, driverPhone, routeId, sessionDuration = 8 } = req.body;

    // Validate required fields
    if (!vehicleId || !driverPhone) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID and driver phone are required'
      });
    }

    // Format phone number
    const formattedPhone = smsService.formatPhoneNumber(driverPhone);
    
    if (!smsService.validatePhoneNumber(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    // Generate tracking link
    const result = await smsService.generateTrackingLink(
      vehicleId, 
      formattedPhone, 
      routeId, 
      sessionDuration
    );

    res.status(201).json(result);

  } catch (error) {
    console.error('Error generating tracking link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send tracking link to driver via SMS or Email
 * POST /api/tracking/send-tracking-link
 */
router.post('/send-tracking-link', async (req, res) => {
  try {
    const { 
      phone, 
      email, 
      contactMethod = 'phone', 
      vehicleId, 
      driverName = 'Driver', 
      customMessage 
    } = req.body;

    // Validate required fields
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID is required'
      });
    }

    // Validate contact method and contact info
    if (contactMethod === 'phone') {
      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required when using phone contact method'
        });
      }

      // Format and validate phone number
      const formattedPhone = smsService.formatPhoneNumber(phone);
      
      if (!smsService.validatePhoneNumber(formattedPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format'
        });
      }

      // Send tracking link via SMS
      const result = await smsService.sendTrackingLink(
        formattedPhone,
        vehicleId,
        driverName,
        customMessage
      );

      res.json(result);

    } else if (contactMethod === 'email') {
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email address is required when using email contact method'
        });
      }

      // Validate email address
      if (!emailService.validateEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address format'
        });
      }

      // Send tracking link via Email
      const result = await emailService.sendTrackingLink(
        email,
        vehicleId,
        driverName,
        customMessage
      );

      res.json(result);

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact method. Must be "phone" or "email"'
      });
    }

  } catch (error) {
    console.error('Error sending tracking link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get active tracking sessions
 * GET /api/tracking/sessions
 */
router.get('/sessions', (req, res) => {
  try {
    const { fleet_id, status } = req.query;
    
    let sessions = TrackingSession.getActiveSessions();
    
    // Filter by status if provided
    if (status) {
      sessions = sessions.filter(session => session.status === status);
    }

    const formattedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      vehicleId: session.vehicleId,
      driverPhone: session.driverPhone,
      driverEmail: session.driverEmail,
      contactMethod: session.contactMethod || 'phone',
      status: session.status,
      startedAt: session.startedAt,
      lastLocationUpdate: session.lastLocationUpdate,
      expiresAt: session.expiresAt,
      trackingLink: session.trackingLink
    }));

    res.json({
      sessions: formattedSessions
    });

  } catch (error) {
    console.error('Error getting tracking sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Driver Mobile Interface Routes

/**
 * Start location sharing
 * POST /api/tracking/:sessionId/start
 */
router.post('/:sessionId/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { driverConsent, initialLocation } = req.body;

    if (!driverConsent) {
      return res.status(400).json({
        success: false,
        error: 'Driver consent is required to start location sharing'
      });
    }

    const result = await gpsTrackingService.startLocationTracking(
      sessionId,
      driverConsent,
      initialLocation
    );

    res.json(result);

  } catch (error) {
    console.error('Error starting location tracking:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update vehicle location
 * POST /api/tracking/:sessionId/location
 */
router.post('/:sessionId/location', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const locationData = req.body;

    // Validate location data
    if (!locationData.latitude || !locationData.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const result = await gpsTrackingService.updateVehicleLocation(sessionId, locationData);

    res.json(result);

    // Emit real-time update via WebSocket (will be implemented in WebSocket service)
    // socketService.emitLocationUpdate(result);

  } catch (error) {
    console.error('Error updating vehicle location:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get session info for driver interface
 * GET /api/tracking/:sessionId/info
 */
router.get('/:sessionId/info', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = TrackingSession.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Tracking session not found'
      });
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      session.status = 'expired';
      session.save();
      
      return res.status(410).json({
        success: false,
        error: 'Tracking session has expired'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        vehicleId: session.vehicleId,
        routeId: session.routeId,
        status: session.status,
        expiresAt: session.expiresAt,
        updateIntervalSeconds: session.updateIntervalSeconds,
        driverConsent: session.driverConsent
      }
    });

  } catch (error) {
    console.error('Error getting session info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fleet Dashboard Routes

/**
 * Get real-time vehicle locations
 * GET /api/vehicles/locations
 */
router.get('/vehicles/locations', async (req, res) => {
  try {
    const { fleet_id } = req.query;
    
    const vehicles = await gpsTrackingService.getVehicleLocations(fleet_id);
    
    res.json({
      vehicles
    });

  } catch (error) {
    console.error('Error getting vehicle locations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Calculate ETA for vehicle
 * POST /api/vehicles/:vehicleId/eta
 */
router.post('/vehicles/:vehicleId/eta', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { destination, waypoints = [] } = req.body;

    if (!destination || !destination.latitude || !destination.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Destination coordinates are required'
      });
    }

    const result = await gpsTrackingService.calculateETA(vehicleId, destination, waypoints);
    
    res.json(result);

  } catch (error) {
    console.error('Error calculating ETA:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get vehicle location history
 * GET /api/vehicles/:vehicleId/history
 */
router.get('/vehicles/:vehicleId/history', (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { limit = 100 } = req.query;

    const history = gpsTrackingService.getLocationHistory(vehicleId, parseInt(limit));
    
    res.json({
      vehicleId,
      locations: history,
      count: history.length
    });

  } catch (error) {
    console.error('Error getting location history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Alert Management Routes

/**
 * Get active alerts
 * GET /api/alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const { status = 'active', fleet_id, severity } = req.query;
    
    let alerts = Alert.getActiveAlerts();
    
    // Filter by severity if provided
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    res.json({
      alerts: alerts.map(alert => ({
        alertId: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        vehicleId: alert.vehicleId,
        message: alert.message,
        timestamp: alert.createdAt,
        location: alert.locationLat && alert.locationLng ? {
          latitude: alert.locationLat,
          longitude: alert.locationLng
        } : null,
        isAcknowledged: alert.isAcknowledged
      }))
    });

  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Acknowledge alert
 * POST /api/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy = 'System' } = req.body;

    const alert = Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    alert.isAcknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    alert.save();

    res.json({
      success: true,
      alertId: alert.id,
      acknowledgedAt: alert.acknowledgedAt
    });

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * End tracking session
 * POST /api/tracking/:sessionId/end
 */
router.post('/:sessionId/end', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = gpsTrackingService.endTrackingSession(sessionId);
    
    res.json(result);

  } catch (error) {
    console.error('Error ending tracking session:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Resend tracking link
 * POST /api/tracking/:sessionId/resend
 */
router.post('/:sessionId/resend', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { driverName = 'Driver' } = req.body;
    
    // Get session to determine contact method
    const session = TrackingSession.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Tracking session not found'
      });
    }

    let result;
    if (session.contactMethod === 'email' && session.driverEmail) {
      // Resend via email
      result = await emailService.resendTrackingLink(sessionId, driverName);
    } else if (session.driverPhone) {
      // Resend via SMS (default)
      result = await smsService.resendTrackingLink(sessionId, driverName);
    } else {
      throw new Error('No valid contact method found for this session');
    }
    
    res.json(result);

  } catch (error) {
    console.error('Error resending tracking link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Geofencing Routes

/**
 * Create geofence
 * POST /api/geofences
 */
router.post('/geofences', (req, res) => {
  try {
    const geofenceData = req.body;
    
    const result = geofencingService.createGeofence(geofenceData);
    
    res.status(201).json(result);

  } catch (error) {
    console.error('Error creating geofence:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all geofences
 * GET /api/geofences
 */
router.get('/geofences', (req, res) => {
  try {
    const { fleet_id } = req.query;
    
    const geofences = geofencingService.getGeofences(fleet_id);
    
    res.json({
      success: true,
      geofences
    });

  } catch (error) {
    console.error('Error getting geofences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update geofence
 * PUT /api/geofences/:geofenceId
 */
router.put('/geofences/:geofenceId', (req, res) => {
  try {
    const { geofenceId } = req.params;
    const updateData = req.body;
    
    const result = geofencingService.updateGeofence(geofenceId, updateData);
    
    res.json(result);

  } catch (error) {
    console.error('Error updating geofence:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete geofence
 * DELETE /api/geofences/:geofenceId
 */
router.delete('/geofences/:geofenceId', (req, res) => {
  try {
    const { geofenceId } = req.params;
    
    const result = geofencingService.deleteGeofence(geofenceId);
    
    res.json(result);

  } catch (error) {
    console.error('Error deleting geofence:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create predefined geofence
 * POST /api/geofences/predefined
 */
router.post('/geofences/predefined', (req, res) => {
  try {
    const { locationType, locationData } = req.body;
    
    if (!locationType || !locationData) {
      return res.status(400).json({
        success: false,
        error: 'Location type and location data are required'
      });
    }
    
    const result = geofencingService.createPredefinedGeofence(locationType, locationData);
    
    res.status(201).json(result);

  } catch (error) {
    console.error('Error creating predefined geofence:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get geofencing statistics
 * GET /api/geofences/stats
 */
router.get('/geofences/stats', (req, res) => {
  try {
    const { fleet_id } = req.query;
    
    const stats = geofencingService.getGeofencingStats(fleet_id);
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting geofencing stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Analyze vehicle movement
 * GET /api/vehicles/:vehicleId/analysis
 */
router.get('/vehicles/:vehicleId/analysis', (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const analysis = geofencingService.analyzeVehicleMovement(vehicleId);
    
    res.json({
      success: true,
      vehicleId,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing vehicle movement:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;