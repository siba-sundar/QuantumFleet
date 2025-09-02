import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrivers } from '../../../hooks/useFirestore.js';
import { useAuth } from '../../../hooks/useAuth.jsx';

const SignUpDetailsTD = () => {
  // Form state
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
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { createProfile: createDriverProfile } = useDrivers();
  
  const { phone, registrationMethod, userId, isNewUser } = location.state || {};

  // Redirect if no authentication context available
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
  }, [phone, user, registrationMethod, isNewUser, userId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDetailsSubmitTD = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'streetAddress', 'city', 'state', 'zipCode', 'dateOfBirth', 'licenseNumber', 'stateOfIssue', 'licenseExpiration'];
      const missingFields = requiredFields.filter(field => !formData[field].trim());
      
      if (missingFields.length > 0) {
        setError('Please fill in all required fields');
        return;
      }

      if (addressYears === null) {
        setError('Please specify if you lived at this address for 3+ years');
        return;
      }

      if (validLicense === null) {
        setError('Please specify if you held a valid Indian license for 36 months');
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

      // Prepare profile data
      const profileData = {
        uid: user?.uid || userId, // Use userId from state if user context not available yet
        phoneNumber: phone || user?.phoneNumber,
        email: user?.email,
        isPhoneVerified: !!phone, // True for phone registration, false for email
        isEmailVerified: registrationMethod === 'email',
        registrationMethod: registrationMethod || 'phone',
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
        registrationStatus: 'completed'
      };

      // Save to Firebase
      const result = await createDriverProfile(profileData);
      
      if (result.success) {
        // Navigate to professional details as next step in registration wizard
        navigate('/auth/driver/professional-details', {
          state: {
            phone: phone || user?.phoneNumber,
            registrationMethod: registrationMethod || 'phone',
            userId: user?.uid || userId,
            isNewUser: true,
            step: 'professional',
            personalDataCompleted: true
          }
        });
      } else {
        setError(result.error || 'Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving driver profile:', error);
      setError('An error occurred while saving your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      {/* Progress indicator */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <span className="ml-2 text-blue-600 font-medium">Personal Details</span>
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <span className="ml-2 text-gray-500">Professional Details</span>
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <span className="ml-2 text-gray-500">Truck Details</span>
          </div>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-center mb-4">Step 1: Personal Details</h1>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-8">Complete Your Driver Profile</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <hr className="bg-black border-2 border-black mb-8" />
        <form onSubmit={handleDetailsSubmitTD}>
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Full Name</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input 
                type="text" 
                name="firstName"
                className="px-4 py-2 border rounded-lg" 
                placeholder="First Name" 
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
              <input 
                type="text" 
                name="middleName"
                className="px-4 py-2 border rounded-lg" 
                placeholder="Middle Name" 
                value={formData.middleName}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <input 
                type="text" 
                name="lastName"
                className="px-4 py-2 border rounded-lg" 
                placeholder="Last Name" 
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Address</h3>
            <div className="mb-4">
              <input 
                type="text" 
                name="streetAddress"
                className="w-full px-4 py-2 border rounded-lg mb-2" 
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
                  className="px-4 py-2 border rounded-lg" 
                  placeholder="City" 
                  value={formData.city}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
                <input 
                  type="text" 
                  name="state"
                  className="px-4 py-2 border rounded-lg" 
                  placeholder="State" 
                  value={formData.state}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
                <input 
                  type="text" 
                  name="zipCode"
                  className="px-4 py-2 border rounded-lg" 
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
                className="w-full px-4 py-2 border rounded-lg" 
                placeholder="Country" 
                value={formData.country}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Were you at this address for 3 years or more?</h3>
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
          {addressYears === false && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg">Please list prior 3 years addresses here</h3>
              <div className="mb-4">
                <textarea
                  name="previousAddresses"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Previous Addresses"
                  value={formData.previousAddresses}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  rows="3"
                  required
                ></textarea>
              </div>
            </div>
          )}

          <div className="mb-14">
            <h3 className="font-semibold text-lg">Date of Birth</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                type="date" 
                name="dateOfBirth"
                className="px-4 py-2 border rounded-lg" 
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-8">License Details</h2>
          <hr className="bg-black border-2 border-black mb-8" />
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Have you held a VALID INDIAN license for the past 36 months? *</h3>
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
            <h3 className="font-semibold text-lg">License Number *</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input 
                type="text" 
                name="licenseNumber"
                className="px-4 py-2 border rounded-lg" 
                placeholder="License Number"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg">State of Issue *</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input 
                type="text" 
                name="stateOfIssue"
                className="px-4 py-2 border rounded-lg" 
                placeholder="State of Issue"
                value={formData.stateOfIssue}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg">License expiration date *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                type="date" 
                name="licenseExpiration"
                className="px-4 py-2 border rounded-lg" 
                value={formData.licenseExpiration}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Were you ever in the military? *</h3>
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
            <h3 className="font-semibold text-lg">Have you been to truck driving school?</h3>
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

          <div className="flex text-center justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-44 px-4 py-2 text-lg font-semibold rounded-full mb-2 transition-all duration-200 ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white hover:shadow-lg hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? 'Saving Details...' : 'Next: Professional Details'}
            </button>
          </div>

          <div className="flex gap-2 text-center justify-center">
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

export default SignUpDetailsTD;