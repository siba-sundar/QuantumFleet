import { Geofence, Alert, VehicleLocation } from '../models/gpsModels.js';
import webSocketService from './webSocketService.js';

class GeofencingService {
  constructor() {
    this.deviationThreshold = parseInt(process.env.DEVIATION_THRESHOLD_METERS) || 500;
    this.defaultGeofenceRadius = parseInt(process.env.GEOFENCE_DEFAULT_RADIUS) || 500;
  }

  /**
   * Create a new geofence
   * @param {Object} geofenceData - Geofence configuration
   * @returns {Object} Created geofence
   */
  createGeofence(geofenceData) {
    const {
      name,
      centerLat,
      centerLng,
      radiusMeters,
      alertType = 'both',
      fleetId,
      isActive = true
    } = geofenceData;

    // Validate required fields
    if (!name || !centerLat || !centerLng || !radiusMeters) {
      throw new Error('Missing required geofence parameters');
    }

    // Validate coordinates
    if (centerLat < -90 || centerLat > 90 || centerLng < -180 || centerLng > 180) {
      throw new Error('Invalid coordinates');
    }

    // Validate radius
    if (radiusMeters < 10 || radiusMeters > 50000) {
      throw new Error('Radius must be between 10 and 50,000 meters');
    }

    const geofence = new Geofence({
      name,
      centerLat,
      centerLng,
      radiusMeters,
      alertType,
      fleetId,
      isActive
    });

    geofence.save();

    console.log(`Created geofence: ${name} at ${centerLat}, ${centerLng} with radius ${radiusMeters}m`);

    return {
      success: true,
      geofence: {
        id: geofence.id,
        name: geofence.name,
        center: {
          latitude: geofence.centerLat,
          longitude: geofence.centerLng
        },
        radius: geofence.radiusMeters,
        alertType: geofence.alertType,
        isActive: geofence.isActive
      }
    };
  }

  /**
   * Update an existing geofence
   * @param {string} geofenceId - Geofence ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated geofence
   */
  updateGeofence(geofenceId, updateData) {
    const geofence = Geofence.findById(geofenceId);
    if (!geofence) {
      throw new Error('Geofence not found');
    }

    // Update allowed fields
    const allowedFields = ['name', 'centerLat', 'centerLng', 'radiusMeters', 'alertType', 'isActive'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        geofence[field] = updateData[field];
      }
    });

    geofence.save();

    return {
      success: true,
      geofence: {
        id: geofence.id,
        name: geofence.name,
        center: {
          latitude: geofence.centerLat,
          longitude: geofence.centerLng
        },
        radius: geofence.radiusMeters,
        alertType: geofence.alertType,
        isActive: geofence.isActive
      }
    };
  }

  /**
   * Delete a geofence
   * @param {string} geofenceId - Geofence ID
   * @returns {Object} Delete result
   */
  deleteGeofence(geofenceId) {
    const geofence = Geofence.findById(geofenceId);
    if (!geofence) {
      throw new Error('Geofence not found');
    }

    geofence.isActive = false;
    geofence.save();

    return {
      success: true,
      message: 'Geofence deleted successfully'
    };
  }

  /**
   * Get all geofences for a fleet
   * @param {string} fleetId - Fleet ID
   * @returns {Array} List of geofences
   */
  getGeofences(fleetId = null) {
    let geofences;
    
    if (fleetId) {
      geofences = Geofence.findByFleetId(fleetId);
    } else {
      geofences = Geofence.getAll();
    }

    return geofences.map(geofence => ({
      id: geofence.id,
      name: geofence.name,
      center: {
        latitude: geofence.centerLat,
        longitude: geofence.centerLng
      },
      radius: geofence.radiusMeters,
      alertType: geofence.alertType,
      isActive: geofence.isActive,
      createdAt: geofence.createdAt
    }));
  }

  /**
   * Check if a location is within a geofence
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} geofence - Geofence object
   * @returns {boolean} Whether location is inside geofence
   */
  isLocationInGeofence(lat, lng, geofence) {
    const distance = this.calculateDistance(
      lat, lng,
      geofence.centerLat, geofence.centerLng
    );
    
    return distance <= geofence.radiusMeters;
  }

  /**
   * Check geofence violations for a vehicle location
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} location - Current location
   * @returns {Array} Array of geofence violations
   */
  checkGeofenceViolations(vehicleId, location) {
    const violations = [];
    const activeGeofences = Geofence.getAll();

    for (const geofence of activeGeofences) {
      const isInside = this.isLocationInGeofence(
        location.latitude,
        location.longitude,
        geofence
      );

      // Get previous location to determine entry/exit
      const previousLocations = VehicleLocation.findByVehicleId(vehicleId, 2);
      let wasInside = false;

      if (previousLocations.length > 1) {
        wasInside = this.isLocationInGeofence(
          previousLocations[1].latitude,
          previousLocations[1].longitude,
          geofence
        );
      }

      // Check for violations based on alert type
      let violationType = null;

      if (geofence.alertType === 'entry' && isInside && !wasInside) {
        violationType = 'entry';
      } else if (geofence.alertType === 'exit' && !isInside && wasInside) {
        violationType = 'exit';
      } else if (geofence.alertType === 'both') {
        if (isInside && !wasInside) {
          violationType = 'entry';
        } else if (!isInside && wasInside) {
          violationType = 'exit';
        }
      }

      if (violationType) {
        violations.push({
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          violationType,
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        });
      }
    }

    return violations;
  }

  /**
   * Process geofence violations and create alerts
   * @param {string} vehicleId - Vehicle ID
   * @param {Array} violations - Geofence violations
   * @returns {Array} Created alerts
   */
  processGeofenceViolations(vehicleId, violations) {
    const alerts = [];

    for (const violation of violations) {
      // Check if similar alert already exists and is not acknowledged
      const existingAlert = Alert.findByVehicleId(vehicleId)
        .find(alert => 
          alert.alertType === 'geofence' && 
          !alert.isAcknowledged &&
          alert.message.includes(violation.geofenceName)
        );

      if (!existingAlert) {
        const alert = new Alert({
          alertType: 'geofence',
          severity: 'high',
          vehicleId,
          message: `Vehicle ${violation.violationType} geofence "${violation.geofenceName}"`,
          locationLat: violation.location.latitude,
          locationLng: violation.location.longitude
        });

        alert.save();
        alerts.push(alert);

        // Broadcast alert via WebSocket
        webSocketService.broadcastAlert(alert);

        console.log(`Geofence violation: Vehicle ${vehicleId} ${violation.violationType} ${violation.geofenceName}`);
      }
    }

    return alerts;
  }

  /**
   * Check for route deviation
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} currentLocation - Current location
   * @param {Array} routePoints - Route waypoints
   * @returns {Object} Route deviation check result
   */
  checkRouteDeviation(vehicleId, currentLocation, routePoints = []) {
    if (!routePoints || routePoints.length === 0) {
      return { isDeviated: false, message: 'No route defined' };
    }

    // Find closest point on route
    let minDistance = Infinity;
    let closestPointIndex = 0;

    for (let i = 0; i < routePoints.length; i++) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        routePoints[i].latitude,
        routePoints[i].longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = i;
      }
    }

    // Check if vehicle is too far from route
    const isDeviated = minDistance > this.deviationThreshold;

    if (isDeviated) {
      // Check if deviation alert already exists
      const existingAlert = Alert.findByVehicleId(vehicleId)
        .find(alert => 
          alert.alertType === 'detour' && 
          !alert.isAcknowledged
        );

      if (!existingAlert) {
        const alert = new Alert({
          alertType: 'detour',
          severity: 'medium',
          vehicleId,
          message: `Vehicle deviated from planned route by ${Math.round(minDistance)}m`,
          locationLat: currentLocation.latitude,
          locationLng: currentLocation.longitude
        });

        alert.save();

        // Broadcast alert via WebSocket
        webSocketService.broadcastAlert(alert);

        console.log(`Route deviation: Vehicle ${vehicleId} is ${Math.round(minDistance)}m from route`);

        return {
          isDeviated: true,
          distance: minDistance,
          closestPoint: routePoints[closestPointIndex],
          alert
        };
      }
    }

    return {
      isDeviated,
      distance: minDistance,
      closestPoint: routePoints[closestPointIndex]
    };
  }

  /**
   * Create predefined geofences for common locations
   * @param {string} locationType - Type of location (warehouse, depot, customer)
   * @param {Object} locationData - Location data
   * @returns {Object} Created geofence
   */
  createPredefinedGeofence(locationType, locationData) {
    const { name, latitude, longitude, fleetId } = locationData;
    
    // Define default radius based on location type
    const radiusMap = {
      warehouse: 200,
      depot: 300,
      customer: 100,
      checkpoint: 150,
      fuel_station: 100,
      service_center: 150
    };

    const radius = radiusMap[locationType] || this.defaultGeofenceRadius;

    return this.createGeofence({
      name: `${locationType.toUpperCase()}: ${name}`,
      centerLat: latitude,
      centerLng: longitude,
      radiusMeters: radius,
      alertType: 'both',
      fleetId
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Check if vehicle is in a speed-limited zone
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} currentSpeed - Current speed in km/h
   * @returns {Object} Speed zone check result
   */
  checkSpeedZone(lat, lng, currentSpeed) {
    // Define common speed zones (this would typically come from a database)
    const speedZones = [
      {
        name: 'School Zone',
        center: { lat: 28.7041, lng: 77.1025 }, // Example coordinates
        radius: 500,
        speedLimit: 25 // km/h
      },
      {
        name: 'City Center',
        center: { lat: 28.6139, lng: 77.2090 }, // Example coordinates
        radius: 2000,
        speedLimit: 50 // km/h
      },
      {
        name: 'Highway',
        center: { lat: 28.5355, lng: 77.3910 }, // Example coordinates
        radius: 1000,
        speedLimit: 80 // km/h
      }
    ];

    for (const zone of speedZones) {
      const distance = this.calculateDistance(
        lat, lng,
        zone.center.lat, zone.center.lng
      );

      if (distance <= zone.radius && currentSpeed > zone.speedLimit) {
        return {
          inSpeedZone: true,
          zoneName: zone.name,
          speedLimit: zone.speedLimit,
          currentSpeed,
          violation: currentSpeed - zone.speedLimit
        };
      }
    }

    return { inSpeedZone: false };
  }

  /**
   * Analyze vehicle movement patterns
   * @param {string} vehicleId - Vehicle ID
   * @returns {Object} Movement analysis
   */
  analyzeVehicleMovement(vehicleId) {
    const locations = VehicleLocation.findByVehicleId(vehicleId, 10);
    
    if (locations.length < 3) {
      return { analysis: 'insufficient_data' };
    }

    // Calculate average speed
    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 0; i < locations.length - 1; i++) {
      const distance = this.calculateDistance(
        locations[i].latitude,
        locations[i].longitude,
        locations[i + 1].latitude,
        locations[i + 1].longitude
      );

      const time = (new Date(locations[i].timestamp) - new Date(locations[i + 1].timestamp)) / 1000;
      
      totalDistance += distance;
      totalTime += time;
    }

    const averageSpeed = totalTime > 0 ? (totalDistance / totalTime) * 3.6 : 0; // km/h

    // Check for stationary periods
    const stationaryThreshold = 50; // meters
    let stationaryCount = 0;

    for (let i = 0; i < locations.length - 1; i++) {
      const distance = this.calculateDistance(
        locations[i].latitude,
        locations[i].longitude,
        locations[i + 1].latitude,
        locations[i + 1].longitude
      );

      if (distance < stationaryThreshold) {
        stationaryCount++;
      }
    }

    const stationaryPercentage = (stationaryCount / (locations.length - 1)) * 100;

    return {
      analysis: 'complete',
      averageSpeed: Math.round(averageSpeed),
      totalDistance: Math.round(totalDistance),
      stationaryPercentage: Math.round(stationaryPercentage),
      dataPoints: locations.length,
      timeSpan: totalTime / 60 // minutes
    };
  }

  /**
   * Get geofencing statistics
   * @param {string} fleetId - Fleet ID (optional)
   * @returns {Object} Geofencing statistics
   */
  getGeofencingStats(fleetId = null) {
    const geofences = fleetId ? Geofence.findByFleetId(fleetId) : Geofence.getAll();
    const recentAlerts = Alert.getActiveAlerts().filter(alert => 
      alert.alertType === 'geofence' || alert.alertType === 'detour'
    );

    return {
      totalGeofences: geofences.length,
      activeGeofences: geofences.filter(g => g.isActive).length,
      recentViolations: recentAlerts.length,
      violationsByType: {
        geofence: recentAlerts.filter(a => a.alertType === 'geofence').length,
        routeDeviation: recentAlerts.filter(a => a.alertType === 'detour').length
      }
    };
  }
}

// Create singleton instance
const geofencingService = new GeofencingService();

export default geofencingService;