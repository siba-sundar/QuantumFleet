import React, { useState, useEffect, useRef } from 'react';
import { Plus, Truck, MapPin, Building, Send, Loader2, X, Map, Navigation } from 'lucide-react';

// Enhanced LocationSearchComponent with real Google Places API integration
const LocationSearchComponent = ({ placeholder, onLocationSelect, initialValue, label }) => {
  const [searchValue, setSearchValue] = useState(initialValue || '');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

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
const GoogleMap = ({ results, depots, locations }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderers, setDirectionsRenderers] = useState([]);

  useEffect(() => {
    // Load Google Maps Script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
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
        mapTypeId: 'roadmap'
      });

      setMap(mapInstance);
      setDirectionsService(new window.google.maps.DirectionsService());
    }
  };

  const displayRoutes = () => {
    if (!map || !results || !directionsService) return;

    // Clear existing routes
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    setDirectionsRenderers([]);

    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FF00FF', '#FFA500', '#800080'];
    const newRenderers = [];

    Object.entries(results.assignments).forEach(([truckId, assignedLocations], index) => {
      if (assignedLocations.length === 0) return;

      const truckInfo = results.per_vehicle_summary[truckId];
      const startingDepot = depots.find(depot => depot.id === truckInfo.starting_depot);
      
      if (!startingDepot) return;

      // Create waypoints for the route
      const waypoints = assignedLocations.map(locId => {
        const location = locations.find(loc => loc.id === locId);
        return {
          location: { lat: location.lat, lng: location.lon },
          stopover: true
        };
      }).filter(Boolean);

      if (waypoints.length === 0) return;

      const start = { lat: startingDepot.lat, lng: startingDepot.lon };
      const end = waypoints[waypoints.length - 1].location;
      const intermediateWaypoints = waypoints.slice(0, -1);

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

      // Request directions
      directionsService.route({
        origin: start,
        destination: end,
        waypoints: intermediateWaypoints,
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK') {
          renderer.setDirections(result);
          
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
        }
      });
    });

    setDirectionsRenderers(newRenderers);

    // Add depot markers
    depots.forEach((depot, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: depot.lat, lng: depot.lon },
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
    locations.forEach((location, index) => {
      const assignedTruck = Object.entries(results.assignments).find(([truck, locs]) => 
        locs.includes(location.id)
      );
      const truckIndex = assignedTruck ? Object.keys(results.assignments).indexOf(assignedTruck[0]) : 0;
      
      const marker = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lon },
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
    <div className="h-96 w-full">
      <div ref={mapRef} className="w-full h-full rounded-lg border border-gray-300" />
    </div>
  );
};

const VehicleRoutingOptimizer = () => {
  const [vehicles, setVehicles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [locations, setLocations] = useState([]);
  const [constraints, setConstraints] = useState({
    max_stops_per_vehicle: 4,
    max_distance_per_vehicle: 20.0,
    max_time_per_vehicle: 10.0,
    priority_handling: true,
    allowed_vehicle_types: ["small", "medium", "large"]
  });

  const quantumServerUrl = "http://localhost:8000";
  const shots = 300;
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Updated default data to match your exact requirements
  const defaultData = {
    vehicles: [
      {"id": "truck_1", "capacity": 1000, "type": "small", "max_shift_hours": 8, "current_location": "depot_1"},
      {"id": "truck_2", "capacity": 1500, "type": "medium", "max_shift_hours": 10, "current_location": "depot_2"},
      {"id": "truck_3", "capacity": 1200, "type": "medium", "max_shift_hours": 9, "current_location": "depot_1"}
    ],
    depots: [
      {"id": "depot_1", "lat": 12.9716, "lon": 77.5946},
      {"id": "depot_2", "lat": 12.9350, "lon": 77.6100}
    ],
    locations: [
      {"id": "loc_1", "lat": 12.9352, "lon": 77.6245, "demand": 300, "priority": 1, "time_window": [8, 12]},
      {"id": "loc_2", "lat": 12.9878, "lon": 77.5966, "demand": 200, "priority": 2, "time_window": [10, 15]},
      {"id": "loc_3", "lat": 12.9200, "lon": 77.6100, "demand": 400, "priority": 1, "time_window": [9, 14]},
      {"id": "loc_5", "lat": 12.9600, "lon": 77.6000, "demand": 500, "priority": 2, "time_window": [8, 11]},
      {"id": "loc_8", "lat": 12.9700, "lon": 77.6200, "demand": 300, "priority": 1, "time_window": [9, 13]}
    ]
  };

  const addVehicle = () => {
    const newVehicle = {
      id: `truck_${vehicles.length + 1}`,
      capacity: 1000,
      type: 'medium',
      max_shift_hours: 8,
      current_location: depots.length > 0 ? depots[0].id : ''
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

  // Load default data
  const loadDefaultData = () => {
    setVehicles(defaultData.vehicles);
    setDepots(defaultData.depots.map(depot => ({
      ...depot,
      address: `Depot at ${depot.lat}, ${depot.lon}`,
      placeId: `default_${depot.id}`
    })));
    setLocations(defaultData.locations.map(location => ({
      ...location,
      address: `Location at ${location.lat}, ${location.lon}`,
      placeId: `default_${location.id}`
    })));
  };

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
            depots={depots.length > 0 ? depots : defaultData.depots.map(depot => ({
              ...depot,
              address: `Depot at ${depot.lat}, ${depot.lon}`
            }))} 
            locations={locations.length > 0 ? locations : defaultData.locations.map(location => ({
              ...location,
              address: `Location at ${location.lat}, ${location.lon}`
            }))} 
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-[#020073] mb-2 text-center">Vehicle Routing Optimizer</h1>
          <p className="text-gray-600 text-center mb-6">Optimize delivery routes using quantum computing algorithms with Google Maps integration</p>
          
          {/* Quick Actions */}
          <div className="mb-6 flex flex-wrap gap-3 justify-center">
            <button
              onClick={loadDefaultData}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Load Sample Data
            </button>
          </div>

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
                  <h3 className="font-medium text-gray-700">Vehicle {index + 1}</h3>
                  <button
                    onClick={() => removeItem(index, 'vehicle')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Vehicle ID</label>
                    <input
                      type="text"
                      placeholder="e.g., truck_1"
                      value={vehicle.id}
                      onChange={(e) => updateVehicle(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#020073] focus:border-[#020073]"
                    />
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