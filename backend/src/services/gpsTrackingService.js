import { TrackingSession, VehicleLocation, Alert } from '../models/gpsModels.js';
import { Client } from '@googlemaps/google-maps-services-js';
import geofencingService from './geofencingService.js';
import webSocketService from './webSocketService.js';
import { LocationCacheRepository } from '../repositories/LocationCacheRepository.js';

class GpsTrackingService {
  constructor() {
    this.googleMapsClient = new Client({});
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.accuracyThreshold = parseInt(process.env.GPS_ACCURACY_THRESHOLD) || 100;
    this.deviationThreshold = parseInt(process.env.DEVIATION_THRESHOLD_METERS) || 500;
    this.delayThreshold = parseInt(process.env.DELAY_THRESHOLD_MINUTES) || 30;
    this.locationCache = new LocationCacheRepository();
  }

  /**
   * Start location tracking session
   * @param {string} sessionId - Tracking session ID
   * @param {Object} driverConsent - Driver consent data
   * @param {Object} initialLocation - Initial location data
   * @returns {Promise<Object>} Session start result
   */
  async startLocationTracking(sessionId, driverConsent, initialLocation) {
    try {
      const session = TrackingSession.findBySessionId(sessionId);
      if (!session) {
        throw new Error('Tracking session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Tracking session is not active');
      }

      // Check if session has expired
      if (new Date() > new Date(session.expiresAt)) {
        session.status = 'expired';
        session.save();
        throw new Error('Tracking session has expired');
      }

      // Update session with driver consent
      session.driverConsent = driverConsent;
      session.consentTimestamp = new Date().toISOString();
      session.lastLocationUpdate = new Date().toISOString();
      session.save();

      // Save initial location
      if (initialLocation && initialLocation.latitude && initialLocation.longitude) {
        await this.updateVehicleLocation(sessionId, initialLocation);
      }

      return {
        success: true,
        sessionActive: true,
        updateInterval: session.updateIntervalSeconds,
        vehicleInfo: {
          vehicleId: session.vehicleId,
          routeId: session.routeId
        }
      };

    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  /**
   * Update vehicle location
   * @param {string} sessionId - Tracking session ID
   * @param {Object} locationData - Location data from browser
   * @returns {Promise<Object>} Update result
   */
  async updateVehicleLocation(sessionId, locationData) {
    try {
      const session = TrackingSession.findBySessionId(sessionId);
      if (!session) {
        throw new Error('Tracking session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Tracking session is not active');
      }

      // Validate location data
      if (!this.validateLocationData(locationData)) {
        throw new Error('Invalid location data');
      }

      // Check location accuracy
      if (locationData.accuracy && locationData.accuracy > this.accuracyThreshold) {
        console.warn(`Low GPS accuracy: ${locationData.accuracy}m for session ${sessionId}`);
        // Still process but flag as low accuracy
      }

      // Geocode address if not provided
      let address = locationData.address;
      if (!address && this.apiKey) {
        try {
          address = await this.reverseGeocode(locationData.latitude, locationData.longitude);
        } catch (geocodeError) {
          console.warn('Geocoding failed:', geocodeError.message);
          address = `${locationData.latitude}, ${locationData.longitude}`;
        }
      }

      // Create location record
      const location = new VehicleLocation({
        sessionId,
        vehicleId: session.vehicleId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp || new Date().toISOString(),
        address,
        source: 'browser'
      });

      location.save();

      // Update session last location update
      session.lastLocationUpdate = new Date().toISOString();
      session.save();

      // Check for alerts (route deviation, speed violations, etc.)
      const alerts = await this.checkForAlerts(session, location);

      return {
        success: true,
        vehicleId: session.vehicleId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading
        },
        sessionStatus: session.status,
        alerts: alerts.map(alert => alert.alertType)
      };

    } catch (error) {
      console.error('Error updating vehicle location:', error);
      throw error;
    }
  }

  /**
   * Get real-time vehicle locations
   * @param {string} fleetId - Fleet ID (optional)
   * @returns {Promise<Array>} Array of vehicle locations
   */
  async getVehicleLocations(fleetId = null) {
    try {
      const activeSessions = TrackingSession.getActiveSessions();
      const vehicles = [];

      for (const session of activeSessions) {
        const latestLocation = VehicleLocation.getLatestLocation(session.vehicleId);
        
        if (latestLocation) {
          // Check if location is recent (within last 5 minutes)
          const locationAge = Date.now() - new Date(latestLocation.timestamp).getTime();
          const isStale = locationAge > 5 * 60 * 1000; // 5 minutes

          // Get route progress if available
          // const routeProgress = RouteProgress.findByVehicleId(session.vehicleId);

          // Get active alerts for this vehicle
          const vehicleAlerts = Alert.findByVehicleId(session.vehicleId)
            .filter(alert => !alert.isAcknowledged)
            .slice(0, 5); // Limit to 5 most recent alerts

          vehicles.push({
            vehicleId: session.vehicleId,
            location: {
              latitude: latestLocation.latitude,
              longitude: latestLocation.longitude,
              address: latestLocation.address,
              timestamp: latestLocation.timestamp,
              speed: latestLocation.speed,
              heading: latestLocation.heading,
              accuracy: latestLocation.accuracy,
              isStale
            },
            route: {
              routeId: session.routeId,
              // progress: routeProgress ? routeProgress.progressPercentage : 0,
              // eta: routeProgress ? routeProgress.estimatedArrival : null,
              // nextCheckpoint: routeProgress ? `Checkpoint ${routeProgress.currentCheckpoint + 1}` : null
            },
            status: isStale ? 'connection_lost' : 'in_transit',
            alerts: vehicleAlerts.map(alert => alert.alertType),
            sessionId: session.sessionId,
            lastUpdate: latestLocation.timestamp
          });
        }
      }

      return vehicles;

    } catch (error) {
      console.error('Error getting vehicle locations:', error);
      throw error;
    }
  }

  /**
   * Calculate ETA using Google Maps Distance Matrix API
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} destination - Destination coordinates
   * @param {Array} waypoints - Optional waypoints
   * @returns {Promise<Object>} ETA calculation result
   */
  async calculateETA(vehicleId, destination, waypoints = []) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const latestLocation = VehicleLocation.getLatestLocation(vehicleId);
      if (!latestLocation) {
        throw new Error('No location data available for vehicle');
      }

      const origin = `${latestLocation.latitude},${latestLocation.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;

      // Prepare waypoints if provided
      const waypointStrings = waypoints.map(wp => `${wp.latitude},${wp.longitude}`);

      // Call Google Maps Distance Matrix API
      const response = await this.googleMapsClient.distancematrix({
        params: {
          origins: [origin],
          destinations: [dest],
          key: this.apiKey,
          units: 'metric',
          mode: 'driving',
          departure_time: 'now',
          traffic_model: 'best_guess'
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const element = response.data.rows[0].elements[0];
      
      if (element.status !== 'OK') {
        throw new Error(`Route calculation failed: ${element.status}`);
      }

      // Calculate ETA
      const durationInSeconds = element.duration_in_traffic ? 
        element.duration_in_traffic.value : element.duration.value;
      
      const eta = new Date(Date.now() + durationInSeconds * 1000);

      // Get detailed route if needed (using Directions API)
      let routeDetails = null;
      if (waypoints.length > 0) {
        routeDetails = await this.getDetailedRoute(origin, dest, waypointStrings);
      }

      return {
        eta: eta.toISOString(),
        duration: durationInSeconds,
        distance: element.distance.value,
        durationText: element.duration.text,
        distanceText: element.distance.text,
        trafficDuration: element.duration_in_traffic ? element.duration_in_traffic.text : null,
        route: routeDetails
      };

    } catch (error) {
      console.error('Error calculating ETA:', error);
      throw error;
    }
  }

  /**
   * Get detailed route using Google Directions API
   * @param {string} origin - Origin coordinates
   * @param {string} destination - Destination coordinates
   * @param {Array} waypoints - Waypoint coordinates
   * @returns {Promise<Object>} Route details
   */
  async getDetailedRoute(origin, destination, waypoints = []) {
    try {
      const response = await this.googleMapsClient.directions({
        params: {
          origin,
          destination,
          waypoints: waypoints.length > 0 ? waypoints.join('|') : undefined,
          key: this.apiKey,
          mode: 'driving',
          departure_time: 'now'
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Directions API error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      
      return {
        polyline: route.overview_polyline.points,
        steps: route.legs.map(leg => ({
          distance: leg.distance,
          duration: leg.duration,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          steps: leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.text,
            duration: step.duration.text
          }))
        }))
      };

    } catch (error) {
      console.error('Error getting detailed route:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address with enhanced data
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} Enhanced address data
   */
  async reverseGeocode(latitude, longitude, useCache = true) {
    try {
      if (!this.apiKey) {
        return {
          address: `${latitude}, ${longitude}`,
          coordinates: { lat: latitude, lng: longitude },
          source: 'fallback'
        };
      }

      // Check cache first if enabled
      if (useCache) {
        const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        const cached = await this.locationCache.getCachedLocation(cacheKey);
        if (cached) {
          return {
            ...cached,
            source: 'cache'
          };
        }
      }

      const response = await this.googleMapsClient.reverseGeocode({
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey,
          result_type: 'street_address|route|neighborhood|locality|administrative_area_level_1|administrative_area_level_2|country'
        }
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        return {
          address: `${latitude}, ${longitude}`,
          coordinates: { lat: latitude, lng: longitude },
          source: 'fallback'
        };
      }

      const result = response.data.results[0];
      const locationData = {
        address: result.formatted_address,
        coordinates: { lat: latitude, lng: longitude },
        placeId: result.place_id,
        addressComponents: this.parseAddressComponents(result.address_components),
        types: result.types,
        source: 'google_api'
      };

      // Cache the result for future use
      if (useCache) {
        const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        await this.locationCache.cacheLocation(cacheKey, locationData);
      }

      return locationData;

    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        address: `${latitude}, ${longitude}`,
        coordinates: { lat: latitude, lng: longitude },
        source: 'fallback',
        error: error.message
      };
    }
  }

  /**
   * Forward geocode address to coordinates
   * @param {string} address - Address to geocode
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} Location data with coordinates
   */
  async geocodeAddress(address, useCache = true) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      // Check cache first if enabled
      if (useCache) {
        const cached = await this.locationCache.getCachedLocation(address);
        if (cached) {
          return {
            ...cached,
            source: 'cache'
          };
        }
      }

      const response = await this.googleMapsClient.geocode({
        params: {
          address: address,
          key: this.apiKey,
          region: 'IN', // Bias towards India
          components: 'country:IN' // Restrict to India
        }
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      const locationData = {
        address: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        placeId: result.place_id,
        addressComponents: this.parseAddressComponents(result.address_components),
        types: result.types,
        source: 'google_api'
      };

      // Cache the result
      if (useCache) {
        await this.locationCache.cacheLocation(address, locationData);
      }

      return locationData;

    } catch (error) {
      console.error('Forward geocoding error:', error);
      throw error;
    }
  }

  /**
   * Search for places near coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of nearby places
   */
  async findNearbyPlaces(latitude, longitude, options = {}) {
    try {
      if (!this.apiKey) {
        return [];
      }

      const defaultOptions = {
        radius: 1000, // 1km default
        type: 'establishment'
      };

      const searchOptions = { ...defaultOptions, ...options };

      const response = await this.googleMapsClient.placesNearby({
        params: {
          location: `${latitude},${longitude}`,
          radius: searchOptions.radius,
          type: searchOptions.type,
          key: this.apiKey
        }
      });

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        types: place.types,
        rating: place.rating,
        priceLevel: place.price_level
      }));

    } catch (error) {
      console.error('Error finding nearby places:', error);
      return [];
    }
  }

  /**
   * Update vehicle location with enhanced address data
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} locationData - GPS location data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateVehicleLocationEnhanced(vehicleId, locationData, options = {}) {
    try {
      const { latitude, longitude, accuracy, timestamp, source = 'gps' } = locationData;
      
      // Get enhanced address information
      const addressData = await this.reverseGeocode(latitude, longitude);
      
      // Find nearby places for context
      const nearbyPlaces = options.includeNearbyPlaces ? 
        await this.findNearbyPlaces(latitude, longitude, { radius: 500 }) : [];
      
      // Prepare enhanced location data
      const enhancedLocation = {
        address: addressData.address,
        formattedAddress: addressData.address,
        latitude,
        longitude,
        addressComponents: addressData.addressComponents || {},
        placeId: addressData.placeId,
        placeTypes: addressData.types || [],
        accuracy: accuracy || null,
        timestamp: timestamp || new Date(),
        source,
        isVerified: source === 'manual',
        confidence: this.calculateLocationConfidence(accuracy, source),
        nearbyPlaces: nearbyPlaces.slice(0, 3) // Top 3 nearby places
      };

      // Save to vehicle location (this would integrate with your existing vehicle storage)
      const result = await this.saveVehicleLocation(vehicleId, enhancedLocation);
      
      // Broadcast real-time update
      if (webSocketService) {
        webSocketService.broadcast('vehicle_location_update', {
          vehicleId,
          location: enhancedLocation,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        location: enhancedLocation,
        result
      };

    } catch (error) {
      console.error('Error updating enhanced vehicle location:', error);
      throw error;
    }
  }

  /**
   * Parse Google Maps address components
   * @param {Array} components - Address components from Google
   * @returns {Object} Parsed components
   */
  parseAddressComponents(components) {
    if (!components) return {};

    return components.reduce((acc, component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        acc.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        acc.route = component.long_name;
      }
      if (types.includes('locality')) {
        acc.locality = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        acc.administrativeArea = component.long_name;
      }
      if (types.includes('administrative_area_level_2')) {
        acc.administrativeAreaLevel2 = component.long_name;
      }
      if (types.includes('country')) {
        acc.country = component.long_name;
        acc.countryCode = component.short_name;
      }
      if (types.includes('postal_code')) {
        acc.postalCode = component.long_name;
      }
      if (types.includes('sublocality')) {
        acc.sublocality = component.long_name;
      }
      
      return acc;
    }, {});
  }

  /**
   * Calculate location confidence score
   * @param {number} accuracy - GPS accuracy in meters
   * @param {string} source - Location source
   * @returns {number} Confidence score (0-100)
   */
  calculateLocationConfidence(accuracy, source) {
    let baseScore = 100;
    
    // Reduce score based on GPS accuracy
    if (accuracy) {
      if (accuracy > 100) baseScore -= 50;
      else if (accuracy > 50) baseScore -= 30;
      else if (accuracy > 20) baseScore -= 15;
      else if (accuracy > 10) baseScore -= 5;
    }
    
    // Adjust based on source
    switch (source) {
      case 'manual':
        baseScore = Math.min(baseScore + 20, 100);
        break;
      case 'api':
        baseScore = Math.min(baseScore + 10, 100);
        break;
      case 'gps':
        // No adjustment for GPS
        break;
      default:
        baseScore -= 10;
    }
    
    return Math.max(0, Math.min(100, baseScore));
  }

  /**
   * Get location suggestions for autocomplete
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Location suggestions
   */
  async getLocationSuggestions(query, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      // Check for similar cached locations first
      const cachedSuggestions = await this.locationCache.searchSimilarCached(query, 3);
      
      const response = await this.googleMapsClient.placeAutocomplete({
        params: {
          input: query,
          key: this.apiKey,
          components: 'country:IN',
          types: options.types || 'establishment|geocode',
          ...options
        }
      });

      if (response.data.status !== 'OK') {
        return cachedSuggestions; // Return cached results if API fails
      }

      const apiSuggestions = response.data.predictions.map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || '',
        types: prediction.types,
        source: 'google_api'
      }));

      // Combine cached and API suggestions, prioritizing API results
      const combined = [
        ...apiSuggestions,
        ...cachedSuggestions.filter(cached => 
          !apiSuggestions.some(api => api.description === cached.address)
        ).map(cached => ({
          description: cached.address,
          mainText: cached.name || cached.address.split(',')[0],
          secondaryText: cached.address.split(',').slice(1).join(','),
          source: 'cache',
          usageCount: cached.usageCount
        }))
      ];

      return combined;

    } catch (error) {
      console.error('Error getting location suggestions:', error);
      // Return cached suggestions as fallback
      return await this.locationCache.searchSimilarCached(query, 5);
    }
  }

  /**
   * Check for various alerts based on location update
   * @param {Object} session - Tracking session
   * @param {Object} location - Current location
   * @returns {Promise<Array>} Array of new alerts
   */
  async checkForAlerts(session, location) {
    const alerts = [];

    try {
      // Check for low accuracy alert
      if (location.accuracy && location.accuracy > this.accuracyThreshold) {
        const existingAccuracyAlert = Alert.findByVehicleId(session.vehicleId)
          .find(alert => alert.alertType === 'low_accuracy' && !alert.isAcknowledged);

        if (!existingAccuracyAlert) {
          const alert = new Alert({
            alertType: 'low_accuracy',
            severity: 'low',
            vehicleId: session.vehicleId,
            message: `GPS accuracy is low (${location.accuracy}m). Location updates may be unreliable.`,
            locationLat: location.latitude,
            locationLng: location.longitude
          });
          alert.save();
          alerts.push(alert);

          // Broadcast alert via WebSocket
          webSocketService.broadcastAlert(alert);
        }
      }

      // Check for geofence violations
      const geofenceViolations = geofencingService.checkGeofenceViolations(
        session.vehicleId,
        location
      );

      if (geofenceViolations.length > 0) {
        const geofenceAlerts = geofencingService.processGeofenceViolations(
          session.vehicleId,
          geofenceViolations
        );
        alerts.push(...geofenceAlerts);
      }

      // Check for speed violations
      if (location.speed && location.speed > 0) {
        const speedKmh = location.speed * 3.6; // Convert m/s to km/h
        
        // Check speed zones
        const speedZoneCheck = geofencingService.checkSpeedZone(
          location.latitude,
          location.longitude,
          speedKmh
        );

        if (speedZoneCheck.inSpeedZone && speedZoneCheck.violation > 10) {
          const existingSpeedAlert = Alert.findByVehicleId(session.vehicleId)
            .find(alert => alert.alertType === 'speed' && !alert.isAcknowledged);

          if (!existingSpeedAlert) {
            const alert = new Alert({
              alertType: 'speed',
              severity: speedZoneCheck.violation > 20 ? 'high' : 'medium',
              vehicleId: session.vehicleId,
              message: `Speed violation in ${speedZoneCheck.zoneName}: ${Math.round(speedKmh)} km/h (limit: ${speedZoneCheck.speedLimit} km/h)`,
              locationLat: location.latitude,
              locationLng: location.longitude
            });
            alert.save();
            alerts.push(alert);

            // Broadcast alert via WebSocket
            webSocketService.broadcastAlert(alert);
          }
        }
        
        // General speed limit check (80 km/h default)
        else if (speedKmh > 80) {
          const existingSpeedAlert = Alert.findByVehicleId(session.vehicleId)
            .find(alert => 
              alert.alertType === 'speed' && 
              !alert.isAcknowledged &&
              new Date() - new Date(alert.createdAt) < 5 * 60 * 1000 // Within last 5 minutes
            );

          if (!existingSpeedAlert) {
            const alert = new Alert({
              alertType: 'speed',
              severity: speedKmh > 100 ? 'high' : 'medium',
              vehicleId: session.vehicleId,
              message: `Vehicle exceeding speed limit: ${Math.round(speedKmh)} km/h`,
              locationLat: location.latitude,
              locationLng: location.longitude
            });
            alert.save();
            alerts.push(alert);

            // Broadcast alert via WebSocket
            webSocketService.broadcastAlert(alert);
          }
        }
      }

      // Check for stationary vehicle (no movement for extended period)
      const previousLocations = VehicleLocation.findByVehicleId(session.vehicleId, 5);
      if (previousLocations.length > 3) {
        const recentLocations = previousLocations.slice(0, 3);
        const isStationary = recentLocations.every(loc => 
          this.calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude) < 50
        );

        if (isStationary) {
          const stationaryTime = new Date(location.timestamp) - new Date(recentLocations[2].timestamp);
          const stationaryMinutes = stationaryTime / (1000 * 60);
          
          if (stationaryMinutes > 30) { // 30 minutes
            const existingBreakdownAlert = Alert.findByVehicleId(session.vehicleId)
              .find(alert => alert.alertType === 'breakdown' && !alert.isAcknowledged);

            if (!existingBreakdownAlert) {
              const alert = new Alert({
                alertType: 'breakdown',
                severity: stationaryMinutes > 60 ? 'critical' : 'high',
                vehicleId: session.vehicleId,
                message: `Vehicle stationary for ${Math.round(stationaryMinutes)} minutes. Possible breakdown or extended stop.`,
                locationLat: location.latitude,
                locationLng: location.longitude
              });
              alert.save();
              alerts.push(alert);

              // Broadcast alert via WebSocket
              webSocketService.broadcastAlert(alert);
            }
          }
        }
      }

      // Check for route deviation (if route is defined)
      if (session.routeId) {
        // This would typically fetch route points from the route database
        // For now, we'll skip route deviation check if no route points are available
        // const routePoints = await this.getRoutePoints(session.routeId);
        // const deviationCheck = geofencingService.checkRouteDeviation(
        //   session.vehicleId,
        //   location,
        //   routePoints
        // );
        
        // if (deviationCheck.isDeviated && deviationCheck.alert) {
        //   alerts.push(deviationCheck.alert);
        // }
      }

      // Check for battery/device issues (low accuracy over time)
      if (location.accuracy && location.accuracy > 200) {
        const recentLowAccuracy = previousLocations.slice(0, 3)
          .filter(loc => loc.accuracy && loc.accuracy > 200);
        
        if (recentLowAccuracy.length >= 2) {
          const existingDeviceAlert = Alert.findByVehicleId(session.vehicleId)
            .find(alert => alert.alertType === 'device_issue' && !alert.isAcknowledged);

          if (!existingDeviceAlert) {
            const alert = new Alert({
              alertType: 'device_issue',
              severity: 'medium',
              vehicleId: session.vehicleId,
              message: `Persistent GPS accuracy issues. Check device signal or battery.`,
              locationLat: location.latitude,
              locationLng: location.longitude
            });
            alert.save();
            alerts.push(alert);

            // Broadcast alert via WebSocket
            webSocketService.broadcastAlert(alert);
          }
        }
      }

    } catch (error) {
      console.error('Error checking for alerts:', error);
    }

    return alerts;
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
   * Validate location data
   * @param {Object} locationData - Location data to validate
   * @returns {boolean} Whether location data is valid
   */
  validateLocationData(locationData) {
    if (!locationData) return false;
    
    const { latitude, longitude } = locationData;
    
    // Check if coordinates are valid numbers
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
    
    // Check if coordinates are within valid ranges
    if (latitude < -90 || latitude > 90) return false;
    if (longitude < -180 || longitude > 180) return false;
    
    return true;
  }

  /**
   * Get location history for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {number} limit - Number of locations to return
   * @returns {Array} Location history
   */
  getLocationHistory(vehicleId, limit = 100) {
    return VehicleLocation.findByVehicleId(vehicleId, limit);
  }

  /**
   * End tracking session
   * @param {string} sessionId - Session ID to end
   * @returns {Object} End session result
   */
  endTrackingSession(sessionId) {
    try {
      const session = TrackingSession.findBySessionId(sessionId);
      if (!session) {
        throw new Error('Tracking session not found');
      }

      session.status = 'completed';
      session.save();

      return {
        success: true,
        sessionId: sessionId,
        status: 'completed'
      };

    } catch (error) {
      console.error('Error ending tracking session:', error);
      throw error;
    }
  }
}

// Create singleton instance
const gpsTrackingService = new GpsTrackingService();

export default gpsTrackingService;