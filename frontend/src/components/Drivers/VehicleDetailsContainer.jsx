import React, { useState, useEffect } from 'react';
import { Truck, Calendar, Wrench, Fuel, Settings } from 'lucide-react';
import { useDrivers } from '../../hooks/useFirestore.js';

const VehicleDetailsContainer = ({ driverId }) => {
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { findByUserId } = useDrivers();

  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!driverId) {
        setError('No driver ID provided');
        setLoading(false);
        return;
      }

      try {
        const result = await findByUserId(driverId);
        if (result.success && result.data?.truckInfo) {
          setVehicleData(result.data.truckInfo);
        } else {
          setError('No vehicle information found');
        }
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
        setError('Failed to load vehicle information');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [driverId, findByUserId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicleData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <Truck className="w-6 h-6 text-gray-400 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Vehicle Details</h2>
        </div>
        <div className="text-center py-8">
          <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">{error || 'No vehicle information available'}</p>
          <p className="text-sm text-gray-400">Complete your vehicle registration to see details here</p>
        </div>
      </div>
    );
  }

  const getMaintenanceStatus = () => {
    if (!vehicleData.nextMaintenanceDate) return 'Unknown';
    
    const nextMaintenance = new Date(vehicleData.nextMaintenanceDate);
    const today = new Date();
    const daysUntil = Math.ceil((nextMaintenance - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'Overdue';
    if (daysUntil <= 7) return 'Due Soon';
    if (daysUntil <= 30) return 'Upcoming';
    return 'Good';
  };

  const maintenanceStatus = getMaintenanceStatus();
  const maintenanceColor = 
    maintenanceStatus === 'Overdue' ? 'text-red-600' :
    maintenanceStatus === 'Due Soon' ? 'text-orange-600' :
    maintenanceStatus === 'Upcoming' ? 'text-yellow-600' :
    'text-green-600';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Truck className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">Vehicle Details</h2>
      </div>

      {/* Basic Vehicle Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Truck ID</label>
            <p className="text-lg font-semibold text-gray-800">{vehicleData.truckId}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Model</label>
            <p className="text-lg font-semibold text-gray-800">{vehicleData.model}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Year</label>
            <p className="text-lg font-semibold text-gray-800">{vehicleData.year}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Capacity</label>
            <p className="text-lg font-semibold text-gray-800">{vehicleData.capacity || 'Not specified'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">License Plate</label>
            <p className="text-lg font-semibold text-gray-800">{vehicleData.licensePlate}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Registration Number</label>
            <p className="text-lg font-semibold text-gray-800">{vehicleData.registrationNumber}</p>
          </div>
          
          <div className="flex items-center">
            <Fuel className="w-4 h-4 text-gray-500 mr-2" />
            <div>
              <label className="text-sm font-medium text-gray-500">Fuel Type</label>
              <p className="text-lg font-semibold text-gray-800 capitalize">{vehicleData.fuelType}</p>
            </div>
          </div>
          
          {vehicleData.currentMileage && (
            <div>
              <label className="text-sm font-medium text-gray-500">Current Mileage</label>
              <p className="text-lg font-semibold text-gray-800">{vehicleData.currentMileage.toLocaleString()} km</p>
            </div>
          )}
        </div>
      </div>

      {/* Insurance Information */}
      {vehicleData.insuranceNumber && (
        <div className="border-t pt-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Insurance Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Insurance Number</label>
              <p className="text-lg font-semibold text-gray-800">{vehicleData.insuranceNumber}</p>
            </div>
            {vehicleData.insuranceExpiry && (
              <div>
                <label className="text-sm font-medium text-gray-500">Insurance Expiry</label>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date(vehicleData.insuranceExpiry).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Wrench className="w-5 h-5 mr-2" />
          Maintenance Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vehicleData.lastMaintenanceDate && (
            <div>
              <label className="text-sm font-medium text-gray-500">Last Maintenance</label>
              <p className="text-lg font-semibold text-gray-800">
                {new Date(vehicleData.lastMaintenanceDate).toLocaleDateString()}
              </p>
            </div>
          )}
          
          {vehicleData.nextMaintenanceDate && (
            <div>
              <label className="text-sm font-medium text-gray-500">Next Maintenance</label>
              <p className="text-lg font-semibold text-gray-800">
                {new Date(vehicleData.nextMaintenanceDate).toLocaleDateString()}
              </p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className={`text-lg font-semibold ${maintenanceColor}`}>
              {maintenanceStatus}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsContainer;