/**
 * LocationService - Handles Google Maps API integration for location search and geocoding
 */

class LocationService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    this.autocompleteService = null;
    this.placesService = null;
    this.geocoder = null;
    this.initialized = false;
    
    this.init();
  }

  /**
   * Initialize Google Maps services
   */
  async init() {
    if (this.initialized) return;

    try {
  // Ensure Google Maps API is loaded (inject script if needed)
  await this.ensureGoogleMapsLoaded();
  // Wait for Google Maps API to be ready
  await this.waitForGoogleMaps();
      
      // Initialize geocoder first (works without Places library)
      this.geocoder = new window.google.maps.Geocoder();

      // Initialize legacy Places services if available; ignore failures (we'll fallback)
      try {
        if (window.google?.maps?.places?.AutocompleteService) {
          this.autocompleteService = new window.google.maps.places.AutocompleteService();
        }
      } catch (e) {
        this.autocompleteService = null;
      }
      try {
        if (window.google?.maps?.places?.PlacesService) {
          const dummyMap = new window.google.maps.Map(document.createElement('div'));
          this.placesService = new window.google.maps.places.PlacesService(dummyMap);
        }
      } catch (e) {
        this.placesService = null;
      }
      
      this.initialized = true;
      console.log('LocationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LocationService:', error);
      // Do not throw here to avoid uncaught promise rejections during app boot.
      // Methods will attempt lazy init again when called.
      this.initialized = false;
    }
  }

  /**
   * Inject Google Maps script tag if not present
   */
  ensureGoogleMapsLoaded() {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.google && window.google.maps && window.google.maps.places) {
      return Promise.resolve();
    }

    // Reuse a single loading promise to avoid duplicate script tags
    if (window.__gmapsLoadingPromise) return window.__gmapsLoadingPromise;

    const apiKey = this.apiKey;
    if (!apiKey) {
      console.warn('VITE_GOOGLE_MAPS_API_KEY is not set. Google Maps features will be disabled.');
      return Promise.resolve();
    }

    window.__gmapsLoadingPromise = new Promise((resolve, reject) => {
      // If a script already exists, listen to its events
      const existing = document.querySelector('script[data-gmaps="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (e) => reject(e));
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      script.dataset.gmaps = 'true';
  // Load Places + geometry libraries (geometry used for distance calc)
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry`;
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error('Google Maps script failed to load'));
      document.head.appendChild(script);
    });

    return window.__gmapsLoadingPromise;
  }

  /**
   * Dynamically import the Places library (New)
   */
  async loadPlacesLib() {
    if (!window.google?.maps?.importLibrary) return null;
    try {
      const placesLib = await window.google.maps.importLibrary('places');
      return placesLib || window.google.maps.places;
    } catch (e) {
      return null;
    }
  }

  /**
   * Wait for Google Maps API to be loaded
   */
  waitForGoogleMaps() {
    return new Promise((resolve, reject) => {
      // Only require maps core; places may not be available for new customers
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 50;
      
      const checkGoogle = () => {
        attempts++;
        if (window.google && window.google.maps) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Google Maps API failed to load'));
        } else {
          setTimeout(checkGoogle, 100);
        }
      };
      
      checkGoogle();
    });
  }

  /**
   * Search for places using autocomplete
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of place predictions
   */
  async searchPlaces(query, options = {}) {
    if (!this.initialized) {
      await this.init();
    }

    // Prefer Places API (New) Text Search
    const placesLib = await this.loadPlacesLib();
    if (placesLib?.Place?.searchByText) {
      try {
        const req = {
          textQuery: query,
          maxResultCount: 8,
          // Request minimal fields for suggestions
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
          regionCode: options.regionCode || 'IN'
        };
        const resp = await placesLib.Place.searchByText(req);
        const arr = resp?.places || resp || [];
        const suggestions = arr.map(p => ({
          placeId: p.id || p.placeId,
          description: p.formattedAddress || p.displayName?.text || p.displayName,
          mainText: p.displayName?.text || p.displayName || p.formattedAddress?.split(',')[0] || '',
          secondaryText: p.formattedAddress?.split(',').slice(1).join(', ').trim() || '',
          types: p.types || []
        }));
        return suggestions;
      } catch (e) {
        // Continue to legacy/fallback
      }
    }

    // If legacy Autocomplete is available use it next; else fall back to Geocoder.

    const defaultOptions = {
      componentRestrictions: { country: 'IN' },
      types: ['establishment', 'geocode']
    };

    const searchOptions = { ...defaultOptions, ...options, input: query };

  const useAutocomplete = !!(this.autocompleteService && window.google?.maps?.places?.PlacesServiceStatus);

    if (useAutocomplete) {
      try {
        return await new Promise((resolve, reject) => {
          this.autocompleteService.getPlacePredictions(searchOptions, (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              const formattedPredictions = predictions.map(prediction => ({
                placeId: prediction.place_id,
                description: prediction.description,
                mainText: prediction.structured_formatting?.main_text || prediction.description,
                secondaryText: prediction.structured_formatting?.secondary_text || '',
                types: prediction.types,
                terms: prediction.terms
              }));
              resolve(formattedPredictions);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]);
            } else {
              // Fall back when legacy Places is blocked/not enabled for this key
              resolve(this._fallbackGeocoderSearch(query));
            }
          });
        });
      } catch (e) {
        // In case of unexpected runtime errors, also fall back
        return this._fallbackGeocoderSearch(query);
      }
    }

  // If autocomplete isn't available, use Geocoder as a graceful fallback
    return this._fallbackGeocoderSearch(query);
  }

  /**
   * Fallback: use Geocoder to get multiple address results for suggestions
   */
  _fallbackGeocoderSearch(query) {
    if (!this.geocoder) {
      return Promise.reject(new Error('Geocoder service not available'));
    }
    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address: query, region: 'IN' }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && Array.isArray(results)) {
          const suggestions = results.slice(0, 8).map(r => ({
            placeId: r.place_id,
            description: r.formatted_address,
            mainText: r.formatted_address?.split(',')[0] || r.formatted_address,
            secondaryText: r.formatted_address?.split(',').slice(1).join(', ').trim() || '',
            types: r.types || []
          }));
          resolve(suggestions);
        } else if (status === window.google.maps.GeocoderStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          console.warn('Geocoder unavailable or denied, suppressing error. Status:', status);
          resolve([]);
        }
      });
    });
  }

  /**
   * Get detailed information about a place
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object>} Place details with coordinates
   */
  async getPlaceDetails(placeId) {
    if (!this.initialized) {
      await this.init();
    }

    // Prefer Places API (New) Place.fetchFields
    const placesLib = await this.loadPlacesLib();
    if (placesLib?.Place) {
      try {
        // New API: instantiate Place by id then fetch fields
        const place = new placesLib.Place({ id: placeId });
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents', 'types', 'plusCode']
        });
        if (place) {
          const loc = place.location || place.geometry?.location;
          const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
          const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
          return {
            placeId: place.id || place.placeId,
            name: place.displayName?.text || place.displayName || place.name,
            address: place.formattedAddress || place.formatted_address,
            coordinates: lat != null && lng != null ? { lat, lng } : undefined,
            addressComponents: this.parseAddressComponents(place.addressComponents || place.address_components),
            types: place.types,
            plusCode: place.plusCode?.globalCode || place.plus_code?.global_code
          };
        }
      } catch (e) {
        // Continue to legacy/fallback
      }
    }

    // If Places Details is blocked for new customers, fall back to Geocoder by placeId

    const request = {
      placeId: placeId,
      fields: [
        'formatted_address', 
        'geometry', 
        'name', 
        'place_id', 
        'address_components',
        'types',
        'plus_code'
      ]
    };

    if (this.placesService) {
      try {
        return await new Promise((resolve, reject) => {
          this.placesService.getDetails(request, (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              const placeData = {
                placeId: place.place_id,
                name: place.name,
                address: place.formatted_address,
                coordinates: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                },
                addressComponents: this.parseAddressComponents(place.address_components),
                types: place.types,
                plusCode: place.plus_code?.global_code
              };
              resolve(placeData);
            } else {
              // Fall back to geocoder by placeId
              this._fallbackGeocoderDetails(placeId).then(resolve).catch(reject);
            }
          });
        });
      } catch (e) {
        return this._fallbackGeocoderDetails(placeId);
      }
    }

    return this._fallbackGeocoderDetails(placeId);
  }

  /**
   * Fallback: use Geocoder with placeId to get details
   */
  _fallbackGeocoderDetails(placeId) {
    if (!this.geocoder) {
      return Promise.reject(new Error('Geocoder service not available'));
    }
    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ placeId }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
          const result = results[0];
          const placeData = {
            placeId: result.place_id,
            name: result.name || result.address_components?.[0]?.long_name || undefined,
            address: result.formatted_address,
            coordinates: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            },
            addressComponents: this.parseAddressComponents(result.address_components),
            types: result.types
          };
          resolve(placeData);
        } else if (status === window.google.maps.GeocoderStatus.ZERO_RESULTS) {
          resolve(null);
        } else {
          console.warn('Geocoder details unavailable or denied, suppressing error. Status:', status);
          resolve(null);
        }
      });
    });
  }

  /**
   * Geocode an address to get coordinates
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} Geocoding result with coordinates
   */
  async geocodeAddress(address) {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.geocoder) {
      throw new Error('Geocoder service not available');
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address: address }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const result = results[0];
          const locationData = {
            address: result.formatted_address,
            coordinates: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            },
            placeId: result.place_id,
            addressComponents: this.parseAddressComponents(result.address_components),
            types: result.types
          };
          resolve(locationData);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Reverse geocode coordinates to get address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object>} Address information
   */
  async reverseGeocode(lat, lng) {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.geocoder) {
      throw new Error('Geocoder service not available');
    }

    const latLng = new window.google.maps.LatLng(lat, lng);

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const result = results[0];
          const locationData = {
            address: result.formatted_address,
            coordinates: { lat, lng },
            placeId: result.place_id,
            addressComponents: this.parseAddressComponents(result.address_components),
            types: result.types
          };
          resolve(locationData);
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Find nearby places
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of nearby places
   */
  async findNearbyPlaces(lat, lng, options = {}) {
    if (!this.initialized) {
      await this.init();
    }

    // Prefer Places API (New) searchNearby
    const placesLib = await this.loadPlacesLib();
    if (placesLib?.Place?.searchNearby) {
      try {
        const req = {
          locationRestriction: {
            center: { lat, lng },
            radius: options.radius || 1000
          },
          // Use one of: includedTypes/price levels/openNow etc., keep minimal here
          fields: ['id', 'displayName', 'location', 'types', 'rating']
        };
        const resp = await placesLib.Place.searchNearby(req);
        const arr = resp?.places || resp || [];
        return arr.map(p => ({
          placeId: p.id || p.placeId,
          name: p.displayName?.text || p.displayName || p.name,
          vicinity: p.formattedAddress,
          coordinates: {
            lat: typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat,
            lng: typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng
          },
          types: p.types || [],
          rating: p.rating,
          priceLevel: p.priceLevel
        }));
      } catch (e) {
        // Continue to legacy/fallback
      }
    }

    const defaultOptions = {
      radius: 1000, // 1km default radius
      type: 'establishment'
    };

    const searchOptions = {
      ...defaultOptions,
      ...options,
      location: new window.google.maps.LatLng(lat, lng)
    };

    if (this.placesService && window.google?.maps?.places?.PlacesServiceStatus) {
      return new Promise((resolve, reject) => {
        this.placesService.nearbySearch(searchOptions, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const places = results.map(place => ({
              placeId: place.place_id,
              name: place.name,
              vicinity: place.vicinity,
              coordinates: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              types: place.types,
              rating: place.rating,
              priceLevel: place.price_level
            }));
            resolve(places);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            // Degrade gracefully
            resolve([]);
          }
        });
      });
    }

    return Promise.resolve([]);
  }

  /**
   * Save location data to Firebase (backend call)
   * @param {Object} locationData - Location data to save
   * @returns {Promise<Object>} Save result
   */
  async saveLocationToFirebase(locationData) {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      });

      if (!response.ok) {
        throw new Error('Failed to save location to database');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  /**
   * Update vehicle location with enhanced data
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} locationData - Enhanced location data
   * @returns {Promise<Object>} Update result
   */
  async updateVehicleLocation(vehicleId, locationData) {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle location');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating vehicle location:', error);
      throw error;
    }
  }

  /**
   * Get cached location data
   * @param {string} address - Address to lookup
   * @returns {Promise<Object|null>} Cached location data
   */
  async getCachedLocation(address) {
    try {
      const response = await fetch(`/api/locations/cache?address=${encodeURIComponent(address)}`);
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting cached location:', error);
      return null;
    }
  }

  /**
   * Parse Google Maps address components into structured format
   * @param {Array} addressComponents - Google Maps address components
   * @returns {Object} Parsed address components
   */
  parseAddressComponents(addressComponents) {
    if (!addressComponents) return {};

    return addressComponents.reduce((acc, component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        acc.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        acc.route = component.long_name;
      }
      if (types.includes('locality')) {
        acc.locality = component.long_name; // City
      }
      if (types.includes('administrative_area_level_1')) {
        acc.administrativeArea = component.long_name; // State
      }
      if (types.includes('administrative_area_level_2')) {
        acc.administrativeAreaLevel2 = component.long_name; // District
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
   * Calculate distance between two coordinates
   * @param {Object} point1 - First point {lat, lng}
   * @param {Object} point2 - Second point {lat, lng}
   * @returns {number} Distance in kilometers
   */
  calculateDistance(point1, point2) {
    if (!window.google || !window.google.maps || !window.google.maps.geometry) {
      // Fallback to Haversine formula if geometry library not loaded
      return this.haversineDistance(point1, point2);
    }

    const latLng1 = new window.google.maps.LatLng(point1.lat, point1.lng);
    const latLng2 = new window.google.maps.LatLng(point2.lat, point2.lng);
    
    // Distance in meters, convert to kilometers
    return window.google.maps.geometry.spherical.computeDistanceBetween(latLng1, latLng2) / 1000;
  }

  /**
   * Haversine distance calculation (fallback)
   * @param {Object} point1 - First point {lat, lng}
   * @param {Object} point2 - Second point {lat, lng}
   * @returns {number} Distance in kilometers
   */
  haversineDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format location for display
   * @param {Object} locationData - Location data
   * @returns {string} Formatted location string
   */
  formatLocationForDisplay(locationData) {
    if (!locationData) return '';
    
    const { addressComponents } = locationData;
    if (!addressComponents) return locationData.address || '';

    const parts = [];
    
    if (addressComponents.locality) {
      parts.push(addressComponents.locality);
    }
    if (addressComponents.administrativeArea) {
      parts.push(addressComponents.administrativeArea);
    }
    
    return parts.length > 0 ? parts.join(', ') : locationData.address || '';
  }

  /**
   * Validate coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} True if valid coordinates
   */
  isValidCoordinates(lat, lng) {
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }
}

// Create and export a singleton instance
const locationService = new LocationService();
export default locationService;