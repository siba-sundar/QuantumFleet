import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, Truck, MapPin, Package, CreditCard, AlertCircle, CheckCircle, Loader, User } from 'lucide-react';
import { createReservation, fetchAvailableDrivers, updateDriverAssignment } from '../../../utils/api.js';
import { useAuth } from '../../../hooks/useAuth.jsx';
import LocationSearchComponent from '../../common/LocationSearchComponent.jsx';

const ReservationSystem = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reservationId, setReservationId] = useState(null);
  
  // Available drivers state
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState({});
  
  const [trucks, setTrucks] = useState([
    {
      pickupLocation: '',
      pickupLocationData: null, // Store full location data
      dropLocation: '',
      dropLocationData: null, // Store full location data
      pickupDate: '',
      dropDate: '',
      checkpoints: [{ location: '', locationData: null, date: '', weight: '', goodsType: '', handlingInstructions: '' }]
    }
  ]);

  const [customerInfo, setCustomerInfo] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    company: '',
    specialInstructions: ''
  });

  const addTruck = () => {
    setTrucks([...trucks, {
      pickupLocation: '',
      pickupLocationData: null,
      dropLocation: '',
      dropLocationData: null,
      pickupDate: '',
      dropDate: '',
      checkpoints: [{ location: '', locationData: null, date: '', weight: '', goodsType: '', handlingInstructions: '' }]
    }]);
  };

  const removeTruck = (index) => {
    setTrucks(trucks.filter((_, i) => i !== index));
  };

  const addCheckpoint = (truckIndex) => {
    const newTrucks = [...trucks];
    newTrucks[truckIndex].checkpoints.push({ location: '', locationData: null, date: '', weight: '', goodsType: '', handlingInstructions: '' });
    setTrucks(newTrucks);
  };

  const removeCheckpoint = (truckIndex, checkpointIndex) => {
    const newTrucks = [...trucks];
    newTrucks[truckIndex].checkpoints.splice(checkpointIndex, 1);
    setTrucks(newTrucks);
  };

  const updateTruck = (index, field, value) => {
    const newTrucks = [...trucks];
    newTrucks[index][field] = value;
    setTrucks(newTrucks);
  };

  // Handle location selection for pickup/drop locations
  const handleLocationSelect = (truckIndex, locationType, locationData) => {
    const newTrucks = [...trucks];
    if (locationType === 'pickup') {
      newTrucks[truckIndex].pickupLocation = locationData ? locationData.address : '';
      newTrucks[truckIndex].pickupLocationData = locationData;
    } else if (locationType === 'drop') {
      newTrucks[truckIndex].dropLocation = locationData ? locationData.address : '';
      newTrucks[truckIndex].dropLocationData = locationData;
    }
    setTrucks(newTrucks);
  };

  // Handle checkpoint location selection
  const handleCheckpointLocationSelect = (truckIndex, checkpointIndex, locationData) => {
    const newTrucks = [...trucks];
    newTrucks[truckIndex].checkpoints[checkpointIndex].location = locationData ? locationData.address : '';
    newTrucks[truckIndex].checkpoints[checkpointIndex].locationData = locationData;
    setTrucks(newTrucks);
  };

  const updateCheckpoint = (truckIndex, checkpointIndex, field, value) => {
    const newTrucks = [...trucks];
    newTrucks[truckIndex].checkpoints[checkpointIndex][field] = value;
    setTrucks(newTrucks);
  };

  const updateCustomerInfo = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  // Driver selection functions
  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const response = await fetchAvailableDrivers(false, true);
      setAvailableDrivers(response.drivers || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setError('Failed to load available drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const selectDriver = (truckIndex, driver) => {
    setSelectedDrivers(prev => ({
      ...prev,
      [truckIndex]: driver
    }));
  };

  const removeDriverSelection = (truckIndex) => {
    setSelectedDrivers(prev => {
      const newSelections = { ...prev };
      delete newSelections[truckIndex];
      return newSelections;
    });
  };

  // Load drivers when component mounts
  useEffect(() => {
    fetchDrivers();
  }, []);

  const validateForm = () => {
    // Clear previous errors
    setError('');
    
    // Validate customer info
    if (!customerInfo.contactName.trim()) {
      setError('Contact name is required');
      return false;
    }
    
    if (!customerInfo.contactPhone.trim()) {
      setError('Contact phone is required');
      return false;
    }
    
    // Validate trucks
    for (let i = 0; i < trucks.length; i++) {
      const truck = trucks[i];
      if (!truck.pickupLocation.trim()) {
        setError(`Pickup location is required for truck ${i + 1}`);
        return false;
      }
      if (!truck.dropLocation.trim()) {
        setError(`Drop location is required for truck ${i + 1}`);
        return false;
      }
      if (!truck.pickupDate) {
        setError(`Pickup date is required for truck ${i + 1}`);
        return false;
      }
      if (!truck.dropDate) {
        setError(`Drop date is required for truck ${i + 1}`);
        return false;
      }
      
      // Validate driver assignment for truck reservation
      if (!selectedDrivers[i]) {
        setError(`Please assign a driver to truck ${i + 1}`);
        return false;
      }
      
      // Validate checkpoints
      for (let j = 0; j < truck.checkpoints.length; j++) {
        const checkpoint = truck.checkpoints[j];
        if (!checkpoint.location.trim()) {
          setError(`Checkpoint ${j + 1} location is required for truck ${i + 1}`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handleReservationSubmit = async () => {
    if (!validateForm()) return;
    
    // Check if auth is still loading
    if (authLoading) {
      setError('Authentication is loading, please wait...');
      return;
    }
    
    if (!currentUser) {
      setError('You must be logged in to make a reservation');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Get the user ID (try multiple properties for compatibility)
      const userId = currentUser.uid || currentUser.id;
      
      if (!userId) {
        console.error('User object missing ID:', currentUser);
        setError('Authentication error: User ID not found. Please try logging out and back in.');
        return;
      }
      
      const reservationData = {
        businessUid: userId,
        customerInfo,
        trucks: trucks.map((truck, index) => ({
          ...truck,
          assignedDriver: selectedDrivers[index] ? {
            id: selectedDrivers[index].id,
            name: selectedDrivers[index].name,
            phone: selectedDrivers[index].phone,
            licenseNumber: selectedDrivers[index].licenseNumber
          } : null
        }))
      };
      
      const response = await createReservation(reservationData);
      
      if (response.success) {
        setSuccess('Reservation created successfully!');
        setReservationId(response.reservation.id);
        
        // Update driver assignments
        try {
          const assignmentPromises = Object.entries(selectedDrivers).map(([truckIndex, driver]) => 
            updateDriverAssignment(driver.id, {
              truckId: `reservation-${response.reservation.id}-truck-${truckIndex}`,
              reservationId: response.reservation.id,
              status: 'assigned'
            })
          );
          
          await Promise.all(assignmentPromises);
        } catch (assignmentError) {
          console.warn('Failed to update driver assignments:', assignmentError);
          // Don't fail the reservation for assignment errors
        }
        
        // Redirect to track truck page after successful reservation
        setTimeout(() => {
          navigate('/business/track-truck');
        }, 2000); // Redirect after 2 seconds to show success message
      } else {
        setError('Failed to create reservation');
      }
    } catch (error) {
      console.error('Reservation error:', error);
      
      let errorMessage = 'Failed to create reservation';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('CONNECTION_REFUSED')) {
  errorMessage = 'Cannot connect to server. Please check if the backend is running on port 4000.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    const baseCost = 1000;
    const costPerKm = 2;
    const costPerKg = 0.5;
    const costPerCheckpoint = 100;

    return trucks.reduce((total, truck) => {
      const truckCost = baseCost +
        (Math.random() * 1000) * costPerKm +
        truck.checkpoints.reduce((sum, cp) => sum + parseInt(cp.weight || 0) * costPerKg, 0) +
        truck.checkpoints.length * costPerCheckpoint;
      return total + truckCost;
    }, 0).toFixed(2);
  };

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">3PL Reservation System</h1>
        
        {/* User Authentication Status */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg" data-testid="auth-status">
          {authLoading ? (
            <div className="flex items-center text-gray-600">
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Loading authentication...
            </div>
          ) : currentUser ? (
            <div className="flex items-center text-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Logged in as: <span className="font-semibold ml-1">{currentUser.email || currentUser.phoneNumber || 'User'}</span>
              {currentUser.userType && <span className="text-gray-600 ml-2">({currentUser.userType})</span>}
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              Not logged in
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {['Truck Selection', 'Route Details', 'Driver Assignment', 'Customer Info', 'Final Confirmation'].map((label, index) => (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > index ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm ${step > index ? 'font-semibold text-black' : 'text-gray-600'}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-black rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
                  
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Truck className="w-6 h-6 mr-2 text-black" />
              Truck Selection
            </h2>
            {trucks.map((truck, index) => (
              <div key={index} className="p-6 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-700">Truck {index + 1}</h3>
                  {index > 0 && (
                    <button onClick={() => removeTruck(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`pickup-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Location
                    </label>
                    <LocationSearchComponent
                      placeholder="Search for pickup location..."
                      initialValue={truck.pickupLocation}
                      onLocationSelect={(locationData) => handleLocationSelect(index, 'pickup', locationData)}
                      required
                      label=""
                    />
                  </div>
                  <div>
                    <label htmlFor={`drop-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Drop Location
                    </label>
                    <LocationSearchComponent
                      placeholder="Search for drop location..."
                      initialValue={truck.dropLocation}
                      onLocationSelect={(locationData) => handleLocationSelect(index, 'drop', locationData)}
                      required
                      label=""
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addTruck}
              className="w-full p-3 border border-dashed border-black rounded-lg text-black hover:bg-blue-50 transition duration-150 flex items-center justify-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add Another Truck
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-black-300" />
              Route Details
            </h2>
            {trucks.map((truck, truckIndex) => (
              <div key={truckIndex} className="p-6 border border-gray-200 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Truck {truckIndex + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`pickup-date-${truckIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      id={`pickup-date-${truckIndex}`}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                      value={truck.pickupDate}
                      onChange={(e) => updateTruck(truckIndex, 'pickupDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor={`drop-date-${truckIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Drop Date
                    </label>
                    <input
                      type="date"
                      id={`drop-date-${truckIndex}`}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                      value={truck.dropDate}
                      onChange={(e) => updateTruck(truckIndex, 'dropDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-6 h-6 mr-2 text-black" />
              Driver Assignment
            </h2>
            
            {loadingDrivers ? (
              <div className="flex items-center justify-center p-8">
                <Loader className="w-6 h-6 animate-spin mr-2" />
                <span>Loading available drivers...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {trucks.map((truck, truckIndex) => (
                  <div key={truckIndex} className="p-6 border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Truck {truckIndex + 1}</h3>
                        <p className="text-sm text-gray-500">
                          {truck.pickupLocation} → {truck.dropLocation}
                        </p>
                        <p className="text-sm text-gray-500">
                          {truck.pickupDate} to {truck.dropDate}
                        </p>
                      </div>
                      {selectedDrivers[truckIndex] && (
                        <button
                          onClick={() => removeDriverSelection(truckIndex)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove Driver
                        </button>
                      )}
                    </div>
                    
                    {selectedDrivers[truckIndex] ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-green-800">{selectedDrivers[truckIndex].name}</h4>
                              <p className="text-sm text-green-600">License: {selectedDrivers[truckIndex].licenseNumber}</p>
                              <p className="text-sm text-green-600">Phone: {selectedDrivers[truckIndex].phone}</p>
                              {selectedDrivers[truckIndex].sentiment && (
                                <p className="text-sm text-green-600">
                                  Sentiment: {selectedDrivers[truckIndex].sentiment.label} ({selectedDrivers[truckIndex].sentiment.score}/100)
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-green-600">{selectedDrivers[truckIndex].experience} years exp.</div>
                            <div className="text-sm text-green-600">Rating: {selectedDrivers[truckIndex].profile.rating}⭐</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-3">Select Driver:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                          {availableDrivers.map((driver) => (
                            <div
                              key={driver.id}
                              onClick={() => selectDriver(truckIndex, driver)}
                              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-800">{driver.name}</h5>
                                  <p className="text-sm text-gray-600">License: {driver.licenseNumber}</p>
                                  <p className="text-sm text-gray-600">{driver.experience} years experience</p>
                                  {driver.sentiment && (
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-block w-2 h-2 rounded-full ${
                                        driver.sentiment.score >= 70 ? 'bg-green-500' :
                                        driver.sentiment.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}></span>
                                      <span className="text-xs text-gray-500">
                                        {driver.sentiment.label} ({driver.sentiment.score}/100)
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600">⭐ {driver.profile.rating}</div>
                                  <div className="text-xs text-gray-500">{driver.profile.totalTrips} trips</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {availableDrivers.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No available drivers found</p>
                            <button
                              onClick={fetchDrivers}
                              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Refresh
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-6 h-6 mr-2 text-black" />
              Customer Information
            </h2>
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    value={customerInfo.contactName}
                    onChange={(e) => updateCustomerInfo('contactName', e.target.value)}
                    placeholder="Enter contact name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    id="contactPhone"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    value={customerInfo.contactPhone}
                    onChange={(e) => updateCustomerInfo('contactPhone', e.target.value)}
                    placeholder="Enter contact phone"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    id="contactEmail"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    value={customerInfo.contactEmail}
                    onChange={(e) => updateCustomerInfo('contactEmail', e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    value={customerInfo.company}
                    onChange={(e) => updateCustomerInfo('company', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  id="specialInstructions"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                  value={customerInfo.specialInstructions}
                  onChange={(e) => updateCustomerInfo('specialInstructions', e.target.value)}
                  placeholder="Enter any special instructions or requirements"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-6 h-6 mr-2 text-black" />
              Checkpoints
            </h2>
            {trucks.map((truck, truckIndex) => (
              <div key={truckIndex} className="p-6 border border-gray-200 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Truck {truckIndex + 1} Checkpoints</h3>
                {truck.checkpoints.map((checkpoint, checkpointIndex) => (
                  <div key={checkpointIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-700">Checkpoint {checkpointIndex + 1}</h4>
                      {checkpointIndex > 0 && (
                        <button onClick={() => removeCheckpoint(truckIndex, checkpointIndex)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`location-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <LocationSearchComponent
                          placeholder="Search for checkpoint location..."
                          initialValue={checkpoint.location}
                          onLocationSelect={(locationData) => handleCheckpointLocationSelect(truckIndex, checkpointIndex, locationData)}
                          required
                          label=""
                        />
                      </div>
                      <div>
                        <label htmlFor={`date-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          id={`date-${truckIndex}-${checkpointIndex}`}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          value={checkpoint.date}
                          onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'date', e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor={`weight-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Goods Weight (kgs)
                        </label>
                        <input
                          type="number"
                          id={`weight-${truckIndex}-${checkpointIndex}`}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                          value={checkpoint.weight}
                          onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'weight', e.target.value)}
                          placeholder="Enter goods weight"
                        />
                      </div>
                      <div>
                        <label htmlFor={`type-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Goods Type
                        </label>
                        <input
                          type="text"
                          id={`type-${truckIndex}-${checkpointIndex}`}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                          value={checkpoint.goodsType}
                          onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'goodsType', e.target.value)}
                          placeholder="e.g., Fragile, Perishable, Hazardous"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor={`instructions-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Handling Instructions
                      </label>
                      <textarea
                        id={`instructions-${truckIndex}-${checkpointIndex}`}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={checkpoint.handlingInstructions}
                        onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'handlingInstructions', e.target.value)}
                        placeholder="Enter any special handling instructions"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addCheckpoint(truckIndex)}
                  className="w-full p-3 border border-dashed border-black rounded-lg text-black hover:bg-blue-50 transition duration-150 flex items-center justify-center"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Add Checkpoint
                </button>
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <CreditCard className="w-6 h-6 mr-2 text-blue-500" />
              Final Confirmation
            </h2>
            
            {/* Customer Information Summary */}
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Contact Name:</span>
                  <span className="font-semibold text-gray-800 ml-2">{customerInfo.contactName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Contact Phone:</span>
                  <span className="font-semibold text-gray-800 ml-2">{customerInfo.contactPhone}</span>
                </div>
                {customerInfo.contactEmail && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold text-gray-800 ml-2">{customerInfo.contactEmail}</span>
                  </div>
                )}
                {customerInfo.company && (
                  <div>
                    <span className="text-gray-600">Company:</span>
                    <span className="font-semibold text-gray-800 ml-2">{customerInfo.company}</span>
                  </div>
                )}
              </div>
              {customerInfo.specialInstructions && (
                <div className="mt-4">
                  <span className="text-gray-600">Special Instructions:</span>
                  <p className="text-gray-800 mt-1">{customerInfo.specialInstructions}</p>
                </div>
              )}
            </div>
            
            {/* Reservation Summary */}
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Reservation Summary</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Trucks:</span>
                  <span className="font-semibold text-gray-800">{trucks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Checkpoints:</span>
                  <span className="font-semibold text-gray-800">
                    {trucks.reduce((sum, truck) => sum + truck.checkpoints.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Weight:</span>
                  <span className="font-semibold text-gray-800">
                    {trucks.reduce((sum, truck) => sum + truck.checkpoints.reduce((cpSum, cp) => cpSum + parseInt(cp.weight || '0'), 0), 0)} kgs
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Estimated Cost:</span>
                  <span className="text-2xl font-bold text-black">₹{calculateTotalCost()}</span>
                </div>
              </div>
            </div>
            
            {/* Success Message */}
            {reservationId && (
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-green-800">Reservation Confirmed!</h3>
                    <p className="text-green-700">Your reservation ID is: <span className="font-mono font-semibold">{reservationId}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              onClick={prevStep}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition duration-150 disabled:opacity-50"
            >
              Previous
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={nextStep}
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-md hover:px-8 transition duration-300 ml-auto disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleReservationSubmit}
              disabled={loading || reservationId}
              className="px-6 py-2 bg-black text-white rounded-md hover:px-8 transition duration-150 ml-auto flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : reservationId ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Confirmed
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Submit Reservation
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationSystem;