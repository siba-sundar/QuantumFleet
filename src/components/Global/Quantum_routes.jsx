import React, { useState } from 'react';
import { Plus, Truck, MapPin, Building, Send, Loader2, X } from 'lucide-react';

 
const VehicleRoutingOptimizer = () => {
  const [vehicles, setVehicles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [locations, setLocations] = useState([]);
  const [constraints, setConstraints] = useState({
    max_stops_per_vehicle: 4,
    max_distance_per_vehicle: 20,
    max_time_per_vehicle: 10,
    priority_handling: true,
    allowed_vehicle_types: ["small", "medium", "large"]
  });
  


  const quantumServerUrl = import.meta.env.VITE_API_QUANTUM_SERVER || "http://127.0.0.1:8000";

  console.log(quantumServerUrl)
  const shots = 2000;
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Default data
  const defaultData = {
    vehicles: [
      {"id": "truck_1", "capacity": 1000, "type": "small", "max_shift_hours": 8, "current_location": "depot_1"},
      {"id": "truck_3", "capacity": 1500, "type": "medium", "max_shift_hours": 10, "current_location": "depot_2"},
      {"id": "truck_2", "capacity": 1700, "type": "medium", "max_shift_hours":29, "current_location": "depot_2"}
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
      current_location: ''
    };
    setVehicles([...vehicles, newVehicle]);
  };

  const addDepot = () => {
    const newDepot = {
      id: `depot_${depots.length + 1}`,
      lat: 0,
      lon: 0
    };
    setDepots([...depots, newDepot]);
  };

  const addLocation = () => {
    const newLocation = {
      id: `loc_${locations.length + 1}`,
      lat: 0,
      lon: 0,
      demand: 0,
      priority: 1,
      time_window: [8, 12]
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

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    // Use default data if no data is entered
    const finalVehicles = vehicles.length > 0 ? vehicles : defaultData.vehicles;
    const finalDepots = depots.length > 0 ? depots : defaultData.depots;
    const finalLocations = locations.length > 0 ? locations : defaultData.locations;

    const payload = {
      num_vehicles: finalVehicles.length,
      vehicles: finalVehicles,
      depots: finalDepots,
      locations: finalLocations,
      constraints
    };

    try {
      const response = await fetch(`${quantumServerUrl}/optimize?shots=${shots}&include_counts=true`, {
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
        <h2 className="text-2xl font-bold text-blue-600 mb-6">Optimization Results</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-700 mb-3">Summary</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Total Trucks:</span> {results.meta.num_trucks}</p>
              <p><span className="font-medium">Total Locations:</span> {results.meta.num_locations}</p>
              <p><span className="font-medium">Unassigned:</span> {results.unassigned.length > 0 ? results.unassigned.join(', ') : 'None'}</p>
            </div>
          </div>

          {/* Vehicle Assignments */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Vehicle Assignments</h3>
            <div className="space-y-3">
              {Object.entries(results.assignments).map(([truck, locations]) => (
                <div key={truck} className="bg-white rounded p-3 border-l-4 border-blue-400">
                  <p className="font-medium text-blue-700">{truck}</p>
                  <p className="text-sm text-gray-600">
                    {locations.length > 0 ? locations.join(' → ') : 'No assignments'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Summary */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Per Vehicle Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(results.per_vehicle_summary).map(([truck, summary]) => (
              <div key={truck} className="bg-white border-2 border-blue-100 rounded-lg p-4">
                <h4 className="font-semibold text-blue-600 mb-2">{truck}</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Stops:</span> {summary.stops}</p>
                  <p><span className="font-medium">Total Demand:</span> {summary.total_demand}</p>
                  <p><span className="font-medium">Distance:</span> {summary.approx_distance_km.toFixed(2)} km</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Counts by Location */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Assignment Probability by Location</h3>
          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-blue-700">Location</th>
                  {Object.keys(results.counts_by_location[Object.keys(results.counts_by_location)[0]]).map(truck => (
                    <th key={truck} className="px-4 py-2 text-center font-semibold text-blue-700">{truck}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(results.counts_by_location).map(([location, counts], index) => (
                  <tr key={location} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 font-medium">{location}</td>
                    {Object.entries(counts).map(([truck, count]) => (
                      <td key={truck} className="px-4 py-2 text-center">{count}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">Vehicle Routing Optimizer</h1>
          


          {/* Vehicles Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Truck className="text-blue-500" size={24} />
                Vehicles
              </h2>
              <button
                onClick={addVehicle}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Vehicle
              </button>
            </div>
            
            {vehicles.map((vehicle, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-700">Vehicle {index + 1}</h3>
                  <button
                    onClick={() => removeItem(index, 'vehicle')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle ID</label>
                    <input
                      type="text"
                      placeholder="truck_1"
                      value={vehicle.id}
                      onChange={(e) => updateVehicle(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (units)</label>
                    <input
                      type="number"
                      placeholder="1000"
                      value={vehicle.capacity}
                      onChange={(e) => updateVehicle(index, 'capacity', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                    <select
                      value={vehicle.type}
                      onChange={(e) => updateVehicle(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Shift (hours)</label>
                    <input
                      type="number"
                      placeholder="8"
                      value={vehicle.max_shift_hours}
                      onChange={(e) => updateVehicle(index, 'max_shift_hours', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
                    <input
                      type="text"
                      placeholder="depot_1"
                      value={vehicle.current_location}
                      onChange={(e) => updateVehicle(index, 'current_location', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Depots Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Building className="text-blue-500" size={24} />
                Depots
              </h2>
              <button
                onClick={addDepot}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Depot
              </button>
            </div>
            
            {depots.map((depot, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-700">Depot {index + 1}</h3>
                  <button
                    onClick={() => removeItem(index, 'depot')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Depot ID</label>
                    <input
                      type="text"
                      placeholder="depot_1"
                      value={depot.id}
                      onChange={(e) => updateDepot(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="12.9716"
                      value={depot.lat}
                      onChange={(e) => updateDepot(index, 'lat', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="77.5946"
                      value={depot.lon}
                      onChange={(e) => updateDepot(index, 'lon', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Locations Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="text-blue-500" size={24} />
                Locations
              </h2>
              <button
                onClick={addLocation}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Location
              </button>
            </div>
            
            {locations.map((location, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-700">Location {index + 1}</h3>
                  <button
                    onClick={() => removeItem(index, 'location')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location ID</label>
                    <input
                      type="text"
                      placeholder="loc_1"
                      value={location.id}
                      onChange={(e) => updateLocation(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="12.9352"
                      value={location.lat}
                      onChange={(e) => updateLocation(index, 'lat', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="77.6245"
                      value={location.lon}
                      onChange={(e) => updateLocation(index, 'lon', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demand (units)</label>
                    <input
                      type="number"
                      placeholder="300"
                      value={location.demand}
                      onChange={(e) => updateLocation(index, 'demand', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
                    <select
                      value={location.priority}
                      onChange={(e) => updateLocation(index, 'priority', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>High Priority (1)</option>
                      <option value={2}>Medium Priority (2)</option>
                      <option value={3}>Low Priority (3)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Window (hours)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="8"
                        value={location.time_window[0]}
                        onChange={(e) => updateLocation(index, 'time_window', [parseInt(e.target.value) || 0, location.time_window[1]])}
                        className="w-1/2 px-2 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        title="Start time"
                      />
                      <input
                        type="number"
                        placeholder="12"
                        value={location.time_window[1]}
                        onChange={(e) => updateLocation(index, 'time_window', [location.time_window[0], parseInt(e.target.value) || 0])}
                        className="w-1/2 px-2 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        title="End time"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Start - End</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Constraints Section */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-700 mb-3">Optimization Constraints</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Stops per Vehicle</label>
                <input
                  type="number"
                  placeholder="4"
                  value={constraints.max_stops_per_vehicle}
                  onChange={(e) => setConstraints({...constraints, max_stops_per_vehicle: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Distance per Vehicle (km)</label>
                <input
                  type="number"
                  placeholder="20"
                  value={constraints.max_distance_per_vehicle}
                  onChange={(e) => setConstraints({...constraints, max_distance_per_vehicle: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Time per Vehicle (hours)</label>
                <input
                  type="number"
                  placeholder="10"
                  value={constraints.max_time_per_vehicle}
                  onChange={(e) => setConstraints({...constraints, max_time_per_vehicle: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={constraints.priority_handling}
                  onChange={(e) => setConstraints({...constraints, priority_handling: e.target.checked})}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Priority Handling</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto text-lg font-semibold disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {loading ? 'Optimizing...' : 'Optimize Routes'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
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