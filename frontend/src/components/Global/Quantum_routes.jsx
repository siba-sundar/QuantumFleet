import React, { useState, useEffect, useRef } from 'react';
import { Plus, Truck, MapPin, Building, Send, Loader2, X, Map, Navigation } from 'lucide-react';
import { db } from '../../config/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
// Default data for the application (sample mode)
const defaultData = {
  vehicles: [
    { id: 'truck_1', capacity: 1000, type: 'small', max_shift_hours: 8, current_location: 'depot_1' },
    { id: 'truck_2', capacity: 1500, type: 'medium', max_shift_hours: 10, current_location: 'depot_2' },
    { id: 'truck_3', capacity: 1200, type: 'medium', max_shift_hours: 9, current_location: 'depot_1' }
  ],
  depots: [
    { id: 'depot_1', lat: 12.9716, lon: 77.5946 },
    { id: 'depot_2', lat: 12.9350, lon: 77.6100 }
  ],
  locations: [
    { id: 'loc_1', lat: 12.9352, lon: 77.6245, demand: 300, priority: 1, time_window: [8, 12] },
    { id: 'loc_2', lat: 12.9878, lon: 77.5966, demand: 200, priority: 2, time_window: [10, 15] },
    { id: 'loc_3', lat: 12.9200, lon: 77.6100, demand: 400, priority: 1, time_window: [9, 14] },
    { id: 'loc_5', lat: 12.9600, lon: 77.6000, demand: 500, priority: 2, time_window: [8, 11] },
    { id: 'loc_8', lat: 12.9700, lon: 77.6200, demand: 300, priority: 1, time_window: [9, 13] }
  ]
};

// Enhanced LocationSearchComponent with real Google Places API integration
const LocationSearchComponent = ({ placeholder, onLocationSelect, initialValue, label }) => {
  const [searchValue, setSearchValue] = useState(initialValue || '');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  useEffect(() => {
    setSearchValue(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    if (window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    if (value.length > 2 && autocompleteService.current) {
      setIsLoading(true);
      autocompleteService.current.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: 'IN' }, // Restrict to India
        },
        (predictions, status) => {
          setIsLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setPredictions(predictions || []);
          } else {
            setPredictions([]);
          }
        }
      );
    } else {
      setPredictions([]);
    }
  };

  const handleSelect = (prediction) => {
    setSearchValue(prediction.description);
    setPredictions([]);

    if (placesService.current) {
      placesService.current.getDetails(
        { placeId: prediction.place_id },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry) {
            const locationData = {
              address: prediction.description,
              coordinates: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              placeId: prediction.place_id
            };
            onLocationSelect(locationData);
          }
        }
      );
    }
  };

  // Fallback to mock data if Google Maps is not loaded
  const mockLocations = [
    { description: 'Bangalore, Karnataka, India', place_id: 'mock1', coordinates: { lat: 12.9716, lng: 77.5946 } },
    { description: 'Koramangala, Bangalore, India', place_id: 'mock2', coordinates: { lat: 12.9352, lng: 77.6245 } },
    { description: 'Whitefield, Bangalore, India', place_id: 'mock3', coordinates: { lat: 12.9698, lng: 77.7500 } },
    { description: 'Electronic City, Bangalore, India', place_id: 'mock4', coordinates: { lat: 12.8456, lng: 77.6603 } },
  ];

  const handleMockSelect = (location) => {
    setSearchValue(location.description);
    setPredictions([]);
    onLocationSelect({
      address: location.description,
      coordinates: location.coordinates,
      placeId: location.place_id
    });
  };

  const displayPredictions = window.google && window.google.maps ? predictions : 
    (searchValue ? mockLocations.filter(loc => 
      loc.description.toLowerCase().includes(searchValue.toLowerCase())
    ) : []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleInputChange}
        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
      />
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="animate-spin" size={16} />
        </div>
      )}
      {displayPredictions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
          {displayPredictions.map((prediction, index) => (
            <div
              key={prediction.place_id || index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => window.google && window.google.maps ? 
                handleSelect(prediction) : handleMockSelect(prediction)}
            >
              {prediction.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Google Maps component
const GoogleMap = ({ results, depots, locations, vehicles }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderers, setDirectionsRenderers] = useState([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeErrors, setRouteErrors] = useState([]);

  useEffect(() => {
    // Load Google Maps Script
    if (!window.google) {
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        console.error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
        return;
      }
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (map && results && directionsService) {
      displayRoutes();
    }
  }, [map, results, directionsService]);

  const initializeMap = () => {
    if (mapRef.current && window.google) {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 12.9716, lng: 77.5946 }, // Bangalore center
        mapTypeId: 'roadmap',
        gestureHandling: 'cooperative',
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true
      });

      setMap(mapInstance);
      setDirectionsService(new window.google.maps.DirectionsService());
    }
  };

  const displayRoutes = () => {
    if (!map || !results || !directionsService) {
      console.log('displayRoutes called but missing requirements:', { 
        map: !!map, 
        results: !!results, 
        directionsService: !!directionsService 
      });
      return;
    }

    console.log('=== STARTING ROUTE DISPLAY ===');
    console.log('Results:', results);
    console.log('Depots:', depots);
    console.log('Locations:', locations);

    setIsLoadingRoutes(true);
    setRouteErrors([]);

    // Clear existing routes
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    setDirectionsRenderers([]);

    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FF00FF', '#FFA500', '#800080'];
    const newRenderers = [];

    // Get the correct depots and locations data
    const currentDepots = depots.length > 0 ? depots : defaultData.depots;
    const currentLocations = locations.length > 0 ? locations : defaultData.locations;

    console.log('Using depots:', currentDepots);
    console.log('Using locations:', currentLocations);
    console.log('Assignments:', results.assignments);

    const routePromises = [];

    Object.entries(results.assignments).forEach(([truckId, assignedLocations], index) => {
      if (assignedLocations.length === 0) return;

      const truckInfo = results.per_vehicle_summary[truckId];
      if (!truckInfo) {
        console.warn(`No truck info found for ${truckId}`);
        return;
      }

      console.log(`Processing ${truckId}:`, truckInfo);

      // Find starting depot using multiple strategies
      let startingDepot = null;
      
      // Strategy 1: Use starting_depot from backend response
      if (truckInfo.starting_depot) {
        startingDepot = currentDepots.find(depot => depot.id === truckInfo.starting_depot);
        console.log(`Found depot via starting_depot: ${truckInfo.starting_depot}`, startingDepot);
      }
      
      // Strategy 2: Use starting_location coordinates if depot not found
      if (!startingDepot && truckInfo.starting_location) {
        startingDepot = {
          id: `depot_${truckId}`,
          lat: truckInfo.starting_location.lat,
          lon: truckInfo.starting_location.lon
        };
        console.log(`Created depot from starting_location:`, startingDepot);
      }
      
      // Strategy 3: Find depot by truck's current_location
      if (!startingDepot) {
        // Look up the truck in vehicles to find its current_location
        const vehicleData = vehicles.find(v => v.id === truckId) || defaultData.vehicles.find(v => v.id === truckId);
        if (vehicleData && vehicleData.current_location) {
          startingDepot = currentDepots.find(depot => depot.id === vehicleData.current_location);
          console.log(`Found depot via vehicle current_location: ${vehicleData.current_location}`, startingDepot);
        }
      }
      
      // Strategy 4: Use the first depot as fallback
      if (!startingDepot) {
        startingDepot = currentDepots[0];
        console.log(`Using first depot as fallback:`, startingDepot);
      }

      if (!startingDepot) {
        console.warn(`No starting depot found for ${truckId}`);
        return;
      }

      // Create waypoints for the route - these are the delivery locations
      const waypoints = assignedLocations.map(locId => {
        const location = currentLocations.find(loc => loc.id === locId);
        if (!location) {
          console.warn(`Location ${locId} not found`);
          return null;
        }
        return {
          location: { lat: location.lat, lng: location.lon || location.lng },
          stopover: true
        };
      }).filter(Boolean);

      if (waypoints.length === 0) {
        console.warn(`No valid waypoints for ${truckId}`);
        return;
      }

      const start = { lat: startingDepot.lat, lng: startingDepot.lon || startingDepot.lng };
      
      console.log(`Route for ${truckId}:`, {
        startingDepot: startingDepot.id,
        startCoordinates: start,
        assignedLocations,
        waypoints: waypoints.map(w => ({ location: w.location, id: assignedLocations[waypoints.indexOf(w)] }))
      });
      
      // Handle different route scenarios
      let routeRequest;
      if (waypoints.length === 1) {
        // Direct route from depot to single location
        routeRequest = {
          origin: start,
          destination: waypoints[0].location,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          avoidHighways: false,
          avoidTolls: false
        };
      } else {
        // Multi-stop route
        const end = waypoints[waypoints.length - 1].location;
        const intermediateWaypoints = waypoints.slice(0, -1);
        routeRequest = {
          origin: start,
          destination: end,
          waypoints: intermediateWaypoints,
          optimizeWaypoints: true, // Let Google optimize the route for shortest path
          travelMode: window.google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: false
        };
      }

      const renderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: colors[index % colors.length],
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      renderer.setMap(map);
      newRenderers.push(renderer);

      // Create a promise for each route request
      const routePromise = new Promise((resolve) => {
        // Request directions for the shortest path
        console.log(`Creating route for ${truckId}:`, {
          start,
          routeRequest,
          assignedLocations
        });

        directionsService.route(routeRequest, (result, status) => {
          console.log(`🗺️ Route response for ${truckId}:`, status);
          if (result) {
            console.log(`Route has ${result.routes?.length || 0} routes with ${result.routes?.[0]?.legs?.length || 0} legs`);
          }
          
          if (status === 'OK') {
            console.log(`✅ Route created successfully for ${truckId}`);
            renderer.setDirections(result);
            
            // Log route distance information
            const route = result.routes[0];
            if (route) {
              const totalDistance = route.legs.reduce((total, leg) => total + leg.distance.value, 0) / 1000;
              console.log(`📏 Route distance for ${truckId}: ${totalDistance} km`);
              console.log(`🛣️ Route path for ${truckId}:`, route.legs.map(leg => ({
                from: leg.start_address,
                to: leg.end_address,
                distance: leg.distance.text
              })));
            }
            
            // Add custom markers for trucks
            const truckMarker = new window.google.maps.Marker({
              position: start,
              map: map,
              title: `${truckId} - ${truckInfo.vehicle_type}`,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" fill="${colors[index % colors.length]}" rx="4"/>
                    <text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">🚛</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(32, 32)
              }
            });

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div class="p-3">
                  <h3 class="font-bold text-blue-700">${truckId}</h3>
                  <p><strong>Type:</strong> ${truckInfo.vehicle_type}</p>
                  <p><strong>Capacity:</strong> ${truckInfo.capacity}</p>
                  <p><strong>Stops:</strong> ${truckInfo.stops}</p>
                  <p><strong>Total Demand:</strong> ${truckInfo.total_demand}</p>
                  <p><strong>Distance:</strong> ${truckInfo.approx_distance_km?.toFixed(2)} km</p>
                  <p><strong>Capacity Used:</strong> ${truckInfo.capacity_utilization?.toFixed(1)}%</p>
                  <p><strong>Route:</strong> ${assignedLocations.join(' → ')}</p>
                </div>
              `
            });

            truckMarker.addListener('click', () => {
              infoWindow.open(map, truckMarker);
            });
            
            resolve({ success: true, truckId });
          } else {
            console.error(`Directions request failed for ${truckId} due to:`, status);
            setRouteErrors(prev => [...prev, { truckId, status, error: `Failed to create route: ${status}` }]);
            
            // Fallback: draw a simple polyline if directions fail
            const routeCoordinates = [start];
            assignedLocations.forEach(locId => {
              const location = currentLocations.find(loc => loc.id === locId);
              if (location) {
                routeCoordinates.push({ lat: location.lat, lng: location.lon });
              }
            });
            
            const polyline = new window.google.maps.Polyline({
              path: routeCoordinates,
              geodesic: true,
              strokeColor: colors[index % colors.length],
              strokeOpacity: 0.6,
              strokeWeight: 3
            });
            polyline.setMap(map);
            
            // Still add truck marker even if route fails
            const truckMarker = new window.google.maps.Marker({
              position: start,
              map: map,
              title: `${truckId} - ${truckInfo.vehicle_type} (Route Failed)`,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" fill="${colors[index % colors.length]}" rx="4"/>
                    <text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">🚛</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(32, 32)
              }
            });
            
            resolve({ success: false, truckId, error: status });
          }
        });
      });

      routePromises.push(routePromise);
    });

    // Wait for all routes to complete
    Promise.all(routePromises).then(() => {
      setIsLoadingRoutes(false);
    });

    setDirectionsRenderers(newRenderers);

    // Adjust map bounds to fit all markers and routes
    if (currentDepots.length > 0 || currentLocations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add depot bounds
      currentDepots.forEach(depot => {
        const coord = new window.google.maps.LatLng(depot.lat, depot.lon || depot.lng);
        bounds.extend(coord);
        console.log(`Added depot ${depot.id} to bounds:`, depot.lat, depot.lon || depot.lng);
      });
      
      // Add location bounds
      currentLocations.forEach(location => {
        const coord = new window.google.maps.LatLng(location.lat, location.lon || location.lng);
        bounds.extend(coord);
        console.log(`Added location ${location.id} to bounds:`, location.lat, location.lon || location.lng);
      });
      
      console.log('Fitting map to bounds:', bounds);
      map.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(map, "idle", function() {
        if (map.getZoom() > 15) map.setZoom(15);
        window.google.maps.event.removeListener(listener);
      });
    }

    // Add depot markers
    currentDepots.forEach((depot, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: depot.lat, lng: depot.lon || depot.lng },
        map: map,
        title: `${depot.id} - Depot`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#4CAF50"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">🏢</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-bold text-green-700">${depot.id}</h3>
            <p><strong>Type:</strong> Depot</p>
            <p><strong>Address:</strong> ${depot.address || 'N/A'}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });

    // Add location markers
    currentLocations.forEach((location, index) => {
      const assignedTruck = Object.entries(results.assignments).find(([truck, locs]) => 
        locs.includes(location.id)
      );
      const truckIndex = assignedTruck ? Object.keys(results.assignments).indexOf(assignedTruck[0]) : 0;
      
      const marker = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lon || location.lng },
        map: map,
        title: `${location.id} - Delivery Location`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="${colors[truckIndex % colors.length] || '#FF6B6B'}"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">📦</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-bold text-red-700">${location.id}</h3>
            <p><strong>Demand:</strong> ${location.demand}</p>
            <p><strong>Priority:</strong> ${location.priority}</p>
            <p><strong>Time Window:</strong> ${location.time_window[0]}:00 - ${location.time_window[1]}:00</p>
            <p><strong>Assigned to:</strong> ${assignedTruck ? assignedTruck[0] : 'Unassigned'}</p>
            <p><strong>Address:</strong> ${location.address || 'N/A'}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });
  };

  if (!results) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Map className="mx-auto text-gray-400 mb-2" size={48} />
          <p className="text-gray-500">Run optimization to see routes on map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full relative">
      <div ref={mapRef} className="w-full h-full rounded-lg border border-gray-300" />
      
      {/* Loading indicator */}
      {isLoadingRoutes && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={20} />
          <span className="text-sm text-gray-700">Calculating routes...</span>
        </div>
      )}
      
      {/* Route errors */}
      {routeErrors.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm">
          <h4 className="text-sm font-medium text-red-800 mb-1">Route Calculation Issues:</h4>
          {routeErrors.map((error, index) => (
            <p key={index} className="text-xs text-red-600">
              {error.truckId}: {error.error}
            </p>
          ))}
        </div>
      )}
      
      {/* Debug Route Test Button */}
      {window.google && directionsService && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => {
              console.log('Testing simple route...');
              const testRenderer = new window.google.maps.DirectionsRenderer({
                polylineOptions: {
                  strokeColor: '#FF0000',
                  strokeWeight: 5,
                  strokeOpacity: 0.8
                }
              });
              testRenderer.setMap(map);
              
              directionsService.route({
                origin: { lat: 12.9716, lng: 77.5946 },
                destination: { lat: 12.9352, lng: 77.6245 },
                travelMode: window.google.maps.TravelMode.DRIVING
              }, (result, status) => {
                console.log('Test route result:', status, result);
                if (status === 'OK') {
                  testRenderer.setDirections(result);
                }
              });
            }}
            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs"
          >
            See Routes
          </button>
        </div>
      )}
    </div>
  );
};

const VehicleRoutingOptimizer = () => {
  // Mode toggle state
  const [isLiveDataMode, setIsLiveDataMode] = useState(false);
  
  // Assignment rows
  const [vehicles, setVehicles] = useState([]);
  // Always use sample depots
  const [depots, setDepots] = useState([]);
  // Delivery locations
  const [locations, setLocations] = useState([]);
  // Live drivers list
  const [drivers, setDrivers] = useState([]);
  const [constraints, setConstraints] = useState({
    max_stops_per_vehicle: 4,
    max_distance_per_vehicle: 20.0,
    max_time_per_vehicle: 10.0,
    priority_handling: true,
    allowed_vehicle_types: ["small", "medium", "large"]
  });

  const quantumServerUrl = "http://localhost:8000";
  const shots = 600;
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const addVehicle = () => {
    const newVehicle = {
      id: `new_vehicle_${vehicles.length + 1}`,
      capacity: 1000,
      type: 'medium',
      max_shift_hours: 8,
      current_location: ''
    };
    setVehicles([...vehicles, newVehicle]);
  };

  const addDepot = () => {
    const newDepot = {
      id: `depot_${depots.length + 1}`,
      lat: null,
      lon: null,
      address: '',
      placeId: ''
    };
    setDepots([...depots, newDepot]);
  };

  const addLocation = () => {
    const newLocation = {
      id: `loc_${locations.length + 1}`,
      lat: null,
      lon: null,
      demand: 100,
      priority: 1,
      time_window: [8, 12],
      address: '',
      placeId: ''
    };
    setLocations([...locations, newLocation]);
  };

  const removeItem = (index, type) => {
    if (type === 'vehicle') {
      setVehicles(vehicles.filter((_, i) => i !== index));
    } else if (type === 'depot') {
      setDepots(depots.filter((_, i) => i !== index));
    } else if (type === 'location') {
      setLocations(locations.filter((_, i) => i !== index));
    }
  };

  const updateVehicle = (index, field, value) => {
    const updated = [...vehicles];
    updated[index][field] = field === 'capacity' || field === 'max_shift_hours' ? parseInt(value) || 0 : value;
    setVehicles(updated);
  };

  const updateDepot = (index, field, value) => {
    const updated = [...depots];
    updated[index][field] = field === 'lat' || field === 'lon' ? parseFloat(value) || 0 : value;
    setDepots(updated);
  };

  const updateLocation = (index, field, value) => {
    const updated = [...locations];
    if (field === 'time_window') {
      updated[index][field] = value;
    } else {
      updated[index][field] = ['lat', 'lon'].includes(field) ? parseFloat(value) || 0 : 
                              ['demand', 'priority'].includes(field) ? parseInt(value) || 0 : value;
    }
    setLocations(updated);
  };

  // Handle depot location selection from Google Maps
  const handleDepotLocationSelect = (index, locationData) => {
    if (locationData && locationData.coordinates) {
      const updated = [...depots];
      updated[index] = {
        ...updated[index],
        lat: locationData.coordinates.lat,
        lon: locationData.coordinates.lng,
        address: locationData.address,
        placeId: locationData.placeId
      };
      setDepots(updated);
    }
  };

  // Handle delivery location selection from Google Maps
  const handleDeliveryLocationSelect = (index, locationData) => {
    if (locationData && locationData.coordinates) {
      const updated = [...locations];
      updated[index] = {
        ...updated[index],
        lat: locationData.coordinates.lat,
        lon: locationData.coordinates.lng,
        address: locationData.address,
        placeId: locationData.placeId
      };
      setLocations(updated);
    }
  };

  // Reverse geocoding function
  const getAddressFromCoordinates = (lat, lon) => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        return resolve(`Location at ${lat}, ${lon}`);
      }
      const geocoder = new window.google.maps.Geocoder();
      const latlng = { lat, lng: lon };
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK') {
          if (results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(`Location at ${lat}, ${lon}`);
          }
        } else {
          console.warn('Geocoder failed due to: ' + status);
          resolve(`Location at ${lat}, ${lon}`);
        }
      });
    });
  };

  // Load default data
  const loadDefaultData = async () => {
    setVehicles(defaultData.vehicles);

    const depotsWithAddresses = await Promise.all(
      defaultData.depots.map(async (depot) => ({
        ...depot,
        address: await getAddressFromCoordinates(depot.lat, depot.lon),
        placeId: `default_${depot.id}`
      }))
    );
    setDepots(depotsWithAddresses);

    const locationsWithAddresses = await Promise.all(
      defaultData.locations.map(async (location) => ({
        ...location,
        address: await getAddressFromCoordinates(location.lat, location.lon),
        placeId: `default_${location.id}`
      }))
    );
    setLocations(locationsWithAddresses);
  };

  // Load live data from Firebase when in Live Data Mode
  const loadLiveData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch drivers
      const driversCol = collection(db, 'driverProfiles');
      const driversSnap = await getDocs(driversCol);
      const liveDrivers = driversSnap.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          employeeId: data.professionalInfo?.employeeId || doc.id,
          truckId: data.professionalInfo?.truckId,
          currentLocation: data.truckInfo?.currentLocation || data.professionalInfo?.currentAssignment || ''
        };
      });
      setDrivers(liveDrivers);

    // Fetch delivery locations (tasks) - but don't set them yet, will be populated when driver is selected
    const locCol = collection(db, 'locations');
    const locSnap = await getDocs(locCol);
    const liveLocations = locSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Don't set locations yet - will be populated based on driver selection
    
      // Start with empty lists in live mode
      setVehicles([]);
      setLocations([]);
      setDepots([]);
    } catch (err) {
      console.error('Error fetching live data:', err);
      setError('Error fetching live data');
    } finally {
      setLoading(false);
    }
  };

// Effect to load live data on mode change
useEffect(() => {
  if (isLiveDataMode) {
    loadLiveData();
  } else {
    // Load sample data automatically on mode switch
    loadDefaultData();
  }
}, [isLiveDataMode]);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    // Use current data or default data if empty
    const finalVehicles = vehicles.length > 0 ? vehicles : defaultData.vehicles;
    const finalDepots = depots.length > 0 ? depots : defaultData.depots;
    const finalLocations = locations.length > 0 ? locations : defaultData.locations;

    // Validate that all locations have coordinates
    const invalidDepots = finalDepots.filter(depot => !depot.lat || !depot.lon);
    const invalidLocations = finalLocations.filter(location => !location.lat || !location.lon);

    if (invalidDepots.length > 0 || invalidLocations.length > 0) {
      setError('Please select valid locations for all depots and delivery locations using the search functionality.');
      setLoading(false);
      return;
    }

    // Format constraints to match your API requirements
    const formattedConstraints = {
      ...constraints,
      priority_handling: constraints.priority_handling ? "True" : "False"
    };

    const payload = {
      num_vehicles: finalVehicles.length,
      vehicles: finalVehicles,
      depots: finalDepots.map(depot => ({
        id: depot.id,
        lat: depot.lat,
        lon: depot.lon
      })),
      locations: finalLocations.map(location => ({
        id: location.id,
        lat: location.lat,
        lon: location.lon,
        demand: location.demand,
        priority: location.priority,
        time_window: location.time_window
      })),
      constraints: formattedConstraints
    };

    console.log('Sending payload:', payload);

    try {

      console.log("data sent:", JSON.stringify(payload))
      const response = await fetch(`${quantumServerUrl}/optimize?shots=${shots}&method=qaoa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(`Failed to optimize: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const ResultsDisplay = ({ results }) => {
    if (!results) return null;

    return (
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Navigation className="text-[#020073]" size={32} />
          <h2 className="text-2xl font-bold text-[#020073]">Optimization Results</h2>
        </div>
        
        {/* Google Maps Display */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Map size={24} className="text-[#020073]" />
            Route Visualization
          </h3>
          <GoogleMap
            results={results}
            depots={depots.length > 0 ? depots : defaultData.depots}
            locations={locations.length > 0 ? locations : defaultData.locations}
            vehicles={vehicles.length > 0 ? vehicles : defaultData.vehicles}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-[#020073] mb-3">Summary</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Total Trucks:</span> {results.meta?.num_trucks || 'N/A'}</p>
              <p><span className="font-medium">Total Locations:</span> {results.meta?.num_locations || 'N/A'}</p>
              <p><span className="font-medium">Total Distance:</span> {results.optimization_summary?.total_distance_km?.toFixed(2)} km</p>
              <p><span className="font-medium">Avg Capacity Used:</span> {results.optimization_summary?.average_capacity_utilization?.toFixed(1)}%</p>
              <p><span className="font-medium">Processing Time:</span> {results.meta?.api_processing_time?.toFixed(2)}s</p>
              <p><span className="font-medium">Unassigned:</span> {results.unassigned?.length > 0 ? results.unassigned.join(', ') : 'None'}</p>
            </div>
          </div>

          {/* Vehicle Assignments */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Vehicle Assignments</h3>
            <div className="space-y-3">
              {results.assignments && Object.entries(results.assignments).map(([truck, locations]) => (
                <div key={truck} className="bg-white rounded p-3 border-l-4 border-[#020073]">
                  <p className="font-medium text-[#020073]">{truck}</p>
                  <p className="text-sm text-gray-600">
                    {locations.length > 0 ? locations.join(' → ') : 'No assignments'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Summary */}
        {results.per_vehicle_summary && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Per Vehicle Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(results.per_vehicle_summary).map(([truck, summary]) => (
                <div key={truck} className="bg-white border-2 border-blue-100 rounded-lg p-4">
                  <h4 className="font-semibold text-[#020073] mb-2 flex items-center gap-2">
                    <Truck size={20} />
                    {truck}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Type:</span> {summary.vehicle_type}</p>
                    <p><span className="font-medium">Capacity:</span> {summary.capacity}</p>
                    <p><span className="font-medium">Stops:</span> {summary.stops}</p>
                    <p><span className="font-medium">Total Demand:</span> {summary.total_demand}</p>
                    <p><span className="font-medium">Capacity Used:</span> {summary.capacity_utilization?.toFixed(1)}%</p>
                    <p><span className="font-medium">Distance:</span> {summary.approx_distance_km?.toFixed(2)} km</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Handle live driver selection to auto-populate depot and delivery locations
  const handleDriverSelect = async (index, employeeId) => {
    const updatedVehicles = [...vehicles];
    const vehicle = { ...updatedVehicles[index], id: employeeId };
  
    if (isLiveDataMode) {
      const driver = drivers.find(d => d.employeeId === employeeId);
      if (driver) {
        try {
          const resCol = collection(db, 'truckReservations');
          const q = query(resCol);
          const resSnap = await getDocs(q);
          let foundReservation = null;
  
          for (const doc of resSnap.docs) {
            const data = doc.data();
            if (data.trucks && Array.isArray(data.trucks)) {
              const truck = data.trucks.find(t => t.assignedDriver?.id === driver.uid);
              if (truck) {
                foundReservation = truck;
                break;
              }
            }
          }
  
          if (foundReservation) {
            const { pickupLocationData, dropLocationData } = foundReservation;
  
            if (pickupLocationData?.coordinates) {
              const newDepot = {
                id: `depot_${driver.employeeId}_${Date.now()}`,
                lat: pickupLocationData.coordinates.lat,
                lon: pickupLocationData.coordinates.lng,
                address: pickupLocationData.address || 'N/A',
                placeId: pickupLocationData.placeId || `depot_${Date.now()}`
              };
              setDepots(prev => [...prev, newDepot]);
              vehicle.current_location = newDepot.id;
            }
  
            if (dropLocationData?.coordinates) {
              const newLocation = {
                id: `loc_${driver.employeeId}_${Date.now()}`,
                lat: dropLocationData.coordinates.lat,
                lon: dropLocationData.coordinates.lng,
                demand: 100,
                priority: 1,
                time_window: [8, 18],
                address: dropLocationData.address || 'N/A',
                placeId: dropLocationData.placeId || `loc_${Date.now()}`
              };
              setLocations(prev => [...prev, newLocation]);
            }
          }
        } catch (err) {
          console.error('Error fetching reservation data:', err);
        }
      }
    }
    updatedVehicles[index] = vehicle;
    setVehicles(updatedVehicles);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-[#020073] mb-2 text-center">Vehicle Routing Optimizer</h1>
          <p className="text-gray-600 text-center mb-6">Optimize delivery routes using quantum computing algorithms with Google Maps integration</p>
          
          {/* Mode Toggle */}
          <div className="mb-6 flex justify-center">
            <div className="bg-gray-100 p-1 rounded-lg inline-flex">
              <button
                onClick={() => setIsLiveDataMode(false)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  !isLiveDataMode 
                    ? 'bg-white text-[#020073] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Sample Data Mode
              </button>
              <button
                onClick={() => setIsLiveDataMode(true)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isLiveDataMode 
                    ? 'bg-white text-[#020073] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Live Data Mode
              </button>
            </div>
          </div>

          {/* Mode Description */}
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600">
              {isLiveDataMode 
                ? "Fetch registered drivers and vehicles from Firebase database"
                : "Use predefined sample data for testing and demonstration"
              }
            </p>
          </div>
          
          {/* Quick Actions */}
          {!isLiveDataMode && (
            <div className="mb-6 flex flex-wrap gap-3 justify-center">
              <button
                onClick={loadDefaultData}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Load Sample Data
              </button>
            </div>
          )}

          {/* Vehicles Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Truck className="text-[#020073]" size={24} />
                Vehicles ({vehicles.length})
              </h2>
              <button
                onClick={addVehicle}
                className="bg-[#020073] text-white px-4 py-2 rounded-md hover:bg-[#020073]/90 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Vehicle
              </button>
            </div>
            
            {vehicles.map((vehicle, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-700">Assignment {index + 1}</h3>
                  <button
                    onClick={() => removeItem(index, 'vehicle')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Driver</label>
                    <select
                      value={vehicle.id}
                      onChange={(e) => handleDriverSelect(index, e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    >
                      <option value="">Select Driver</option>
                      {isLiveDataMode
                        ? drivers.map((d) => (
                            <option key={d.uid} value={d.employeeId}>{d.employeeId}</option>
                          ))
                        : defaultData.vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.id}</option>
                          ))
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Capacity</label>
                    <input
                      type="number"
                      placeholder="e.g., 1000"
                      value={vehicle.capacity}
                      onChange={(e) => updateVehicle(index, 'capacity', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select
                      value={vehicle.type}
                      onChange={(e) => updateVehicle(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Max Hours</label>
                    <input
                      type="number"
                      placeholder="e.g., 8"
                      value={vehicle.max_shift_hours}
                      onChange={(e) => updateVehicle(index, 'max_shift_hours', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Current Location</label>
                    <select
                      value={vehicle.current_location}
                      onChange={(e) => updateVehicle(index, 'current_location', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    >
                      <option value="">Select Depot</option>
                      {depots.map((depot) => (
                        <option key={depot.id} value={depot.id}>{depot.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Depots Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Building className="text-[#020073]" size={24} />
                Depots ({depots.length})
              </h2>
              <button
                onClick={addDepot}
                className="bg-[#020073] text-white px-4 py-2 rounded-md hover:bg-[#020073]/90 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Depot
              </button>
            </div>
            
            {depots.map((depot, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-700">Depot {index + 1}</h3>
                  <button
                    onClick={() => removeItem(index, 'depot')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Depot ID</label>
                    <input
                      type="text"
                      placeholder="e.g., depot_1"
                      value={depot.id}
                      onChange={(e) => updateDepot(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Depot Location <span className="text-red-500">*</span>
                    </label>
                    <LocationSearchComponent
                      placeholder="Search for depot location using Google Maps..."
                      onLocationSelect={(locationData) => handleDepotLocationSelect(index, locationData)}
                      initialValue={depot.address || ''}
                      label=""
                    />
                    {depot.lat && depot.lon && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                        <div className="text-green-700 font-medium">✓ Location Set</div>
                        <div className="text-gray-600">
                          Coordinates: {depot.lat.toFixed(4)}, {depot.lon.toFixed(4)}
                        </div>
                        {depot.address && (
                          <div className="text-gray-600 mt-1">
                            Address: {depot.address}
                          </div>
                        )}
                      </div>
                    )}
                    {!depot.lat && !depot.lon && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                        <div className="text-yellow-700">⚠ Please select a location</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Locations Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="text-[#020073]" size={24} />
                Delivery Locations ({locations.length})
              </h2>
              <button
                onClick={addLocation}
                className="bg-[#020073] text-white px-4 py-2 rounded-md hover:bg-[#020073]/90 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Location
              </button>
            </div>
            
            {locations.map((location, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-700">Location {index + 1}</h3>
                  <button
                    onClick={() => removeItem(index, 'location')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Location ID</label>
                    <input
                      type="text"
                      placeholder="e.g., loc_1"
                      value={location.id}
                      onChange={(e) => updateLocation(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Demand</label>
                    <input
                      type="number"
                      placeholder="e.g., 300"
                      value={location.demand}
                      onChange={(e) => updateLocation(index, 'demand', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                    <select
                      value={location.priority}
                      onChange={(e) => updateLocation(index, 'priority', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    >
                      <option value={1}>Priority 1 (High)</option>
                      <option value={2}>Priority 2 (Medium)</option>
                      <option value={3}>Priority 3 (Low)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Delivery Location <span className="text-red-500">*</span>
                    </label>
                    <LocationSearchComponent
                      placeholder="Search for delivery location using Google Maps..."
                      onLocationSelect={(locationData) => handleDeliveryLocationSelect(index, locationData)}
                      initialValue={location.address || ''}
                      label=""
                    />
                    {location.lat && location.lon && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                        <div className="text-green-700 font-medium">✓ Location Set</div>
                        <div className="text-gray-600">
                          Coordinates: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                        </div>
                        {location.address && (
                          <div className="text-gray-600 mt-1">
                            Address: {location.address}
                          </div>
                        )}
                      </div>
                    )}
                    {!location.lat && !location.lon && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                        <div className="text-yellow-700">⚠ Please select a location</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Time Window</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="number"
                          placeholder="Start (e.g., 8)"
                          value={location.time_window[0]}
                          onChange={(e) => updateLocation(index, 'time_window', [parseInt(e.target.value) || 0, location.time_window[1]])}
                          className="w-full px-2 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073] text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="End (e.g., 12)"
                          value={location.time_window[1]}
                          onChange={(e) => updateLocation(index, 'time_window', [location.time_window[0], parseInt(e.target.value) || 0])}
                          className="w-full px-2 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073] text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Constraints Section */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h2 className="text-lg font-semibold text-[#020073] mb-3">Optimization Constraints</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Stops per Vehicle</label>
                <input
                  type="number"
                  placeholder="e.g., 4"
                  value={constraints.max_stops_per_vehicle}
                  onChange={(e) => setConstraints({...constraints, max_stops_per_vehicle: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Distance per Vehicle (km)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 20.0"
                  value={constraints.max_distance_per_vehicle}
                  onChange={(e) => setConstraints({...constraints, max_distance_per_vehicle: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Time per Vehicle (hours)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 10.0"
                  value={constraints.max_time_per_vehicle}
                  onChange={(e) => setConstraints({...constraints, max_time_per_vehicle: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={constraints.priority_handling}
                  onChange={(e) => setConstraints({...constraints, priority_handling: e.target.checked})}
                  className="mr-2 h-4 w-4 text-[#020073] focus:ring-[#020073] border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Priority Handling</span>
              </label>
              <div className="text-sm text-gray-600">
                Allowed Vehicle Types: {constraints.allowed_vehicle_types.join(', ')}
              </div>
            </div>
          </div>

          {/* Data Summary */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Data Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-[#020073]">{vehicles.length}</div>
                <div className="text-sm text-gray-600">Vehicles</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-[#020073]">{depots.length}</div>
                <div className="text-sm text-gray-600">Depots</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-[#020073]">{locations.length}</div>
                <div className="text-sm text-gray-600">Locations</div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="bg-[#020073] text-white px-8 py-3 rounded-lg hover:bg-[#020073]/90 transition-colors flex items-center gap-2 mx-auto text-lg font-semibold disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {loading ? 'Optimizing Routes...' : 'Optimize Routes'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              {vehicles.length === 0 && depots.length === 0 && locations.length === 0 
                ? 'Sample data will be used if no data is entered'
                : 'Click to start optimization with current data'
              }
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-700 font-medium">❌ Error</div>
              </div>
              <div className="text-red-700 mt-1">{error}</div>
            </div>
          )}

          {/* Results Display */}
          <ResultsDisplay results={results} />
        </div>
      </div>
    </div>
  );
};

export default VehicleRoutingOptimizer;