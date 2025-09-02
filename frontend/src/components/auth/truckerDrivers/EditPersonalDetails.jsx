import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrivers } from '../../../hooks/useFirestore.js';
import { useAuth } from '../../../hooks/useAuth.jsx';

const EditPersonalDetails = () => {
  // Form state for personal information
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    dateOfBirth: '',
    licenseNumber: '',
    stateOfIssue: '',
    licenseExpiration: '',
    previousAddresses: ''
  });
  
  const [addressYears, setAddressYears] = useState(null);
  const [validLicense, setValidLicense] = useState(null);
  const [military, setMilitary] = useState(null);
  const [truckSchool, setTruckSchool] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { update: updateDriverProfile, findByUserId } = useDrivers();

  // Redirect if no user authenticated
  useEffect(() => {
    if (!user?.uid) {
      navigate('/auth/driver/signin');
    }
  }, [user, navigate]);

  // Load existing profile data
  useEffect(() => {
    const loadExistingData = async () => {
      if (user?.uid) {
        try {
          const result = await findByUserId(user.uid);
          if (result.success && result.data) {
            const data = result.data;
            
            // Load personal info
            if (data.personalInfo) {
              setFormData(prev => ({
                ...prev,
                firstName: data.personalInfo.firstName || '',
                middleName: data.personalInfo.middleName || '',
                lastName: data.personalInfo.lastName || '',
                dateOfBirth: data.personalInfo.dateOfBirth || ''
              }));
            }
            
            // Load address info
            if (data.address) {
              setFormData(prev => ({
                ...prev,
                streetAddress: data.address.streetAddress || '',
                city: data.address.city || '',
                state: data.address.state || '',
                zipCode: data.address.zipCode || '',
                country: data.address.country || 'India',
                previousAddresses: data.address.previousAddresses || ''
              }));
              setAddressYears(data.address.residencyYears);
            }
            
            // Load license info
            if (data.licenseInfo) {
              setFormData(prev => ({
                ...prev,
                licenseNumber: data.licenseInfo.licenseNumber || '',
                stateOfIssue: data.licenseInfo.stateOfIssue || '',
                licenseExpiration: data.licenseInfo.licenseExpiration || ''
              }));
              setValidLicense(data.licenseInfo.validFor36Months);
            }
            
            // Load background info
            if (data.background) {
              setMilitary(data.background.militaryService);
              setTruckSchool(data.background.truckSchool);
            }
          }
        } catch (error) {
          console.error('Error loading existing data:', error);
          setError('Failed to load existing profile data');
        } finally {
          setLoading(false);
        }
      }
    };

    loadExistingData();
  }, [user, findByUserId]);

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
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First name and last name are required');
        return;
      }

      if (!formData.dateOfBirth) {
        setError('Date of birth is required');
        return;
      }

      if (!formData.streetAddress.trim() || !formData.city.trim() || !formData.state.trim() || !formData.zipCode.trim()) {
        setError('Complete address is required');
        return;
      }

      if (addressYears === null) {
        setError('Please specify if you have been at this address for 3 years or more');
        return;
      }

      if (addressYears === false && !formData.previousAddresses.trim()) {
        setError('Please provide previous addresses for the last 3 years');
        return;
      }

      if (!formData.licenseNumber.trim() || !formData.stateOfIssue.trim() || !formData.licenseExpiration) {
        setError('Complete license information is required');
        return;
      }

      if (validLicense === null) {
        setError('Please specify if you have held a valid license for the past 36 months');
        return;
      }

      if (military === null) {
        setError('Please specify your military service status');
        return;
      }

      if (truckSchool === null) {
        setError('Please specify if you attended truck driving school');
        return;
      }

      // Prepare update data
      const updateData = {
        personalInfo: {
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim(),
          lastName: formData.lastName.trim(),
          dateOfBirth: formData.dateOfBirth
        },
        address: {
          streetAddress: formData.streetAddress.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zipCode: formData.zipCode.trim(),
          country: formData.country.trim(),
          residencyYears: addressYears,
          previousAddresses: !addressYears ? formData.previousAddresses.trim() : ''
        },
        licenseInfo: {
          licenseNumber: formData.licenseNumber.trim(),
          stateOfIssue: formData.stateOfIssue.trim(),
          licenseExpiration: formData.licenseExpiration,
          validFor36Months: validLicense
        },
        background: {
          militaryService: military,
          truckSchool: truckSchool
        },
        lastUpdated: new Date().toISOString()
      };

      // Update driver profile
      const result = await updateDriverProfile(user.uid, updateData);
      
      if (result.success) {
        // Navigate back to driver details with success message
        navigate('/driver/driver-details', {
          state: {
            updated: true,
            message: 'Personal details updated successfully'
          }
        });
      } else {
        setError(result.error || 'Failed to update personal details. Please try again.');
      }
    } catch (error) {
      console.error('Error updating personal details:', error);
      setError('An error occurred while updating your details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/driver/driver-details');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading personal details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      <h1 className="text-3xl font-bold text-center mb-4">Edit Personal Details</h1>

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-8">Update Your Personal Information</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <hr className="bg-black border-2 border-black mb-8" />
        
        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Full Name</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input 
                type="text" 
                name="firstName"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="First Name" 
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
              <input 
                type="text" 
                name="middleName"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Middle Name" 
                value={formData.middleName}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <input 
                type="text" 
                name="lastName"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Last Name" 
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Address</h3>
            <div className="mb-4">
              <input 
                type="text" 
                name="streetAddress"
                className="w-full px-4 py-2 border rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Street Address" 
                value={formData.streetAddress}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <input 
                  type="text" 
                  name="city"
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="City" 
                  value={formData.city}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
                <input 
                  type="text" 
                  name="state"
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="State" 
                  value={formData.state}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
                <input 
                  type="text" 
                  name="zipCode"
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Zip Code" 
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
              <input 
                type="text" 
                name="country"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Country" 
                value={formData.country}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          {/* Address Years */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Were you at this address for 3 years or more? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="addressYears"
                    checked={addressYears === true}
                    onChange={() => setAddressYears(true)}
                    disabled={isSubmitting}
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="addressYears"
                    checked={addressYears === false}
                    onChange={() => setAddressYears(false)}
                    disabled={isSubmitting}
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          {/* Previous Address (Conditional) */}
          {addressYears === false && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">Previous Address (Last 3 Years) *</h3>
              <div className="mb-4">
                <textarea
                  name="previousAddresses"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter previous addresses"
                  value={formData.previousAddresses}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  rows="3"
                  required
                ></textarea>
              </div>
            </div>
          )}

          {/* Date of Birth */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Date of Birth *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                type="date" 
                name="dateOfBirth"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          {/* License Details */}
          <h2 className="text-2xl font-bold text-center mb-8">License Details</h2>
          <hr className="bg-black border-2 border-black mb-8" />
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Have you held a VALID INDIAN license for the past 36 months? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="validLicense"
                    checked={validLicense === true}
                    onChange={() => setValidLicense(true)}
                    disabled={isSubmitting}
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="validLicense"
                    checked={validLicense === false}
                    onChange={() => setValidLicense(false)}
                    disabled={isSubmitting}
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">License Information *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                type="text" 
                name="licenseNumber"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="License Number" 
                value={formData.licenseNumber}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
              <input 
                type="text" 
                name="stateOfIssue"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="State of Issue" 
                value={formData.stateOfIssue}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                type="date" 
                name="licenseExpiration"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="License Expiration Date" 
                value={formData.licenseExpiration}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          {/* Background Questions */}
          <h2 className="text-2xl font-bold text-center mb-8">Background Information</h2>
          <hr className="bg-black border-2 border-black mb-8" />
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Have you ever served in the military? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="military"
                    checked={military === true}
                    onChange={() => setMilitary(true)}
                    disabled={isSubmitting}
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="military"
                    checked={military === false}
                    onChange={() => setMilitary(false)}
                    disabled={isSubmitting}
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Have you attended a truck driving school? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="truckSchool"
                    checked={truckSchool === true}
                    onChange={() => setTruckSchool(true)}
                    disabled={isSubmitting}
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    name="truckSchool"
                    checked={truckSchool === false}
                    onChange={() => setTruckSchool(false)}
                    disabled={isSubmitting}
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-44 px-4 py-2 text-lg font-semibold rounded-full transition-all duration-200 ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white hover:shadow-lg hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? 'Updating...' : 'Update Details'}
            </button>
            
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="w-full sm:w-44 px-4 py-2 text-lg font-semibold rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPersonalDetails;