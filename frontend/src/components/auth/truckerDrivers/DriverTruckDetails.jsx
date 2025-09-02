import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrivers } from '../../../hooks/useFirestore.js';
import { useAuth } from '../../../hooks/useAuth.jsx';

const DriverTruckDetails = () => {
  // Form state for truck information
  const [formData, setFormData] = useState({
    truckId: '',
    truckModel: '',
    truckYear: '',
    truckCapacity: '',
    licensePlate: '',
    registrationNumber: '',
    insuranceNumber: '',
    insuranceExpiry: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    fuelType: 'diesel',
    currentMileage: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { update: updateDriverProfile } = useDrivers();
  
  const { phone, registrationMethod, userId, isNewUser, profileData } = location.state || {};

  // Redirect if no user authenticated
  useEffect(() => {
    // For phone registration, we need phone number
    // For email registration, we need user authentication and isNewUser flag
    const hasPhoneAuth = phone && user?.phoneNumber;
    const hasEmailAuth = registrationMethod === 'email' && user?.uid && isNewUser;
    // Allow access if userId is provided from registration (even if user auth state is not yet updated)
    const hasValidUserId = registrationMethod === 'email' && userId && isNewUser;
    
    if (!hasPhoneAuth && !hasEmailAuth && !hasValidUserId) {
      navigate('/auth/driver/signin');
    }
  }, [phone, user, registrationMethod, isNewUser, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = ['truckId', 'truckModel', 'truckYear', 'licensePlate', 'registrationNumber'];
      const missingFields = requiredFields.filter(field => !formData[field].trim());
      
      if (missingFields.length > 0) {
        setError('Please fill in all required fields: Truck ID, Model, Year, License Plate, and Registration Number');
        return;
      }

      if (isNaN(formData.truckYear) || parseInt(formData.truckYear) < 1990 || parseInt(formData.truckYear) > new Date().getFullYear() + 1) {
        setError('Please enter a valid truck year');
        return;
      }

      if (formData.currentMileage && (isNaN(formData.currentMileage) || parseInt(formData.currentMileage) < 0)) {
        setError('Please enter a valid mileage');
        return;
      }

      // Prepare truck data
      const truckData = {
        truckInfo: {
          truckId: formData.truckId.trim(),
          model: formData.truckModel.trim(),
          year: parseInt(formData.truckYear),
          capacity: formData.truckCapacity.trim(),
          licensePlate: formData.licensePlate.trim(),
          registrationNumber: formData.registrationNumber.trim(),
          insuranceNumber: formData.insuranceNumber.trim(),
          insuranceExpiry: formData.insuranceExpiry,
          lastMaintenanceDate: formData.lastMaintenanceDate,
          nextMaintenanceDate: formData.nextMaintenanceDate,
          fuelType: formData.fuelType,
          currentMileage: formData.currentMileage ? parseInt(formData.currentMileage) : null
        },
        registrationStatus: 'completed',
        lastUpdated: new Date().toISOString()
      };

      // Update driver profile with truck information
      const targetUserId = user?.uid || userId; // Use userId from state if user context not available
      const result = await updateDriverProfile(targetUserId, truckData);
      
      if (result.success) {
        // Navigate to dashboard - registration completed successfully
        navigate('/driver/your-truck', {
          state: {
            registrationCompleted: true,
            message: 'Registration completed successfully! Welcome to IndiFleet.'
          }
        });
      } else {
        setError(result.error || 'Failed to save truck details. Please try again.');
      }
    } catch (error) {
      console.error('Error saving truck details:', error);
      setError('An error occurred while saving your truck details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Allow users to skip truck details and complete later
    navigate('/driver/your-truck', {
      state: {
        registrationCompleted: true,
        message: 'Basic registration completed! You can add truck details later from your profile.'
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      {/* Progress indicator */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
            <span className="ml-2 text-green-600 font-medium">Personal Details</span>
          </div>
          <div className="w-12 h-1 bg-green-500"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
            <span className="ml-2 text-green-600 font-medium">Professional Details</span>
          </div>
          <div className="w-12 h-1 bg-green-500"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <span className="ml-2 text-blue-600 font-medium">Truck Details</span>
          </div>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-center mb-4">Step 3: Truck Details</h1>

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-8">Complete Your Truck Information</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <hr className="bg-black border-2 border-black mb-8" />
        
        <form onSubmit={handleSubmit}>
          {/* Basic Truck Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Basic Truck Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Truck ID *
                </label>
                <input 
                  type="text" 
                  name="truckId"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter Truck ID (e.g., TRK001)" 
                  value={formData.truckId}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Truck Model *
                </label>
                <input 
                  type="text" 
                  name="truckModel"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g., Tata LPT 2518" 
                  value={formData.truckModel}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year *
                </label>
                <input 
                  type="number" 
                  name="truckYear"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="2020" 
                  value={formData.truckYear}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacity
                </label>
                <input 
                  type="text" 
                  name="truckCapacity"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g., 25 tons" 
                  value={formData.truckCapacity}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Type
                </label>
                <select 
                  name="fuelType"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={formData.fuelType}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="diesel">Diesel</option>
                  <option value="petrol">Petrol</option>
                  <option value="cng">CNG</option>
                  <option value="electric">Electric</option>
                </select>
              </div>
            </div>
          </div>

          {/* Registration & Legal Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Registration & Legal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate *
                </label>
                <input 
                  type="text" 
                  name="licensePlate"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g., MH12AB1234" 
                  value={formData.licensePlate}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number *
                </label>
                <input 
                  type="text" 
                  name="registrationNumber"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Vehicle Registration Number" 
                  value={formData.registrationNumber}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Number
                </label>
                <input 
                  type="text" 
                  name="insuranceNumber"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Insurance Policy Number" 
                  value={formData.insuranceNumber}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Expiry
                </label>
                <input 
                  type="date" 
                  name="insuranceExpiry"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={formData.insuranceExpiry}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Maintenance Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Maintenance Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Maintenance Date
                </label>
                <input 
                  type="date" 
                  name="lastMaintenanceDate"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={formData.lastMaintenanceDate}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Maintenance Date
                </label>
                <input 
                  type="date" 
                  name="nextMaintenanceDate"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={formData.nextMaintenanceDate}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Mileage (km)
                </label>
                <input 
                  type="number" 
                  name="currentMileage"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g., 150000" 
                  value={formData.currentMileage}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-8 py-3 text-lg font-semibold rounded-full transition-all duration-200 ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white hover:shadow-lg hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? 'Completing Registration...' : 'Complete Registration'}
            </button>
            
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 text-lg font-semibold text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip for Now
            </button>
          </div>

          <div className="flex gap-2 text-center justify-center mt-6">
            <h4>Already have an Account?</h4>
            <button 
              type="button"
              className="font-semibold text-blue-600 hover:text-blue-800"
              onClick={() => navigate('/auth/driver/signin')}
              disabled={isSubmitting}
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverTruckDetails;