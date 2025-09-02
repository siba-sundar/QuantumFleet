import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';
import LocationSearchComponent from '../../src/components/common/LocationSearchComponent.jsx';

function AddTruck() {
  const [maxCapacity, setMaxCapacity] = useState('');
  const [routeId, setRouteId] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [depotLocation, setDepotLocation] = useState('');
  const [depotLocationData, setDepotLocationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLocationSelect = (locationData) => {
    if (locationData) {
      setDepotLocation(locationData.address);
      setDepotLocationData(locationData);
    } else {
      setDepotLocation('');
      setDepotLocationData(null);
    }
  };

  const validateForm = () => {
    if (!maxCapacity || isNaN(maxCapacity) || parseFloat(maxCapacity) <= 0) {
      setError('Please enter a valid maximum capacity');
      return false;
    }
    if (!truckNumber.trim()) {
      setError('Please enter a truck number');
      return false;
    }
    if (!driverName.trim()) {
      setError('Please enter driver name');
      return false;
    }
    if (!driverPhone.trim()) {
      setError('Please enter driver phone number');
      return false;
    }
    if (!depotLocationData) {
      setError('Please select a depot location');
      return false;
    }
    return true;
  };

  const addTruck = async () => {
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare enhanced truck data
      const truckData = {
        maxCapacity: parseFloat(maxCapacity),
        routeId: routeId ? parseInt(routeId) : null,
        number: truckNumber,
        driver: {
          name: driverName,
          phone: driverPhone
        },
        status: 'available',
        currentLocation: {
          address: depotLocationData.address,
          formattedAddress: depotLocationData.address,
          latitude: depotLocationData.coordinates.lat,
          longitude: depotLocationData.coordinates.lng,
          placeId: depotLocationData.placeId,
          addressComponents: depotLocationData.addressComponents || {},
          timestamp: new Date(),
          source: 'manual',
          isVerified: true,
          confidence: 100
        }
      };

      // Save to Firebase via API
      const response = await fetch('/api/trucks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(truckData)
      });

      if (!response.ok) {
        throw new Error('Failed to save truck data');
      }

      const result = await response.json();

      // If blockchain integration is available, also add to blockchain
      if (typeof window.ethereum !== 'undefined') {
        try {
          const web3 = new Web3(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const contract = new web3.eth.Contract(contractABI, contractAddress);
          const accounts = await web3.eth.getAccounts();

          await contract.methods.addTruck(maxCapacity, routeId || 0).send({ from: accounts[0] });
          console.log('Truck also added to blockchain');
        } catch (blockchainError) {
          console.warn('Blockchain integration failed:', blockchainError);
          // Don't fail the entire operation if blockchain fails
        }
      }

      setSuccess(`Truck ${truckNumber} added successfully!`);
      
      // Reset form
      setMaxCapacity('');
      setRouteId('');
      setTruckNumber('');
      setDriverName('');
      setDriverPhone('');
      setDepotLocation('');
      setDepotLocationData(null);
      
    } catch (error) {
      console.error('Error adding truck:', error);
      setError(`Failed to add truck: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Add New Truck</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600">{success}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="truckNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Truck Number *
            </label>
            <input
              type="text"
              id="truckNumber"
              placeholder="e.g., MH-01-AB-1234"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">
              Max Capacity (kg) *
            </label>
            <input
              type="number"
              id="maxCapacity"
              placeholder="e.g., 5000"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
            />
          </div>
        </div>

        {/* Driver Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-1">
              Driver Name *
            </label>
            <input
              type="text"
              id="driverName"
              placeholder="Enter driver's full name"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="driverPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Driver Phone *
            </label>
            <input
              type="tel"
              id="driverPhone"
              placeholder="e.g., +91 9876543210"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Location Information */}
        <div>
          <LocationSearchComponent
            label="Depot/Base Location *"
            placeholder="Search for truck's base location or depot..."
            onLocationSelect={handleLocationSelect}
            required
            initialValue={depotLocation}
          />
        </div>

        {/* Optional Route ID */}
        <div>
          <label htmlFor="routeId" className="block text-sm font-medium text-gray-700 mb-1">
            Route ID (Optional)
          </label>
          <input
            type="number"
            id="routeId"
            placeholder="Enter route ID if applicable"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
          />
        </div>
      </div>
      
      <div className="mt-8">
        <button
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          onClick={addTruck}
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Adding Truck...
            </div>
          ) : (
            'Add Truck'
          )}
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>* Required fields</p>
        <p>The truck will be registered with the selected depot location and can be tracked in real-time.</p>
      </div>
    </div>
  );
}

export default AddTruck;