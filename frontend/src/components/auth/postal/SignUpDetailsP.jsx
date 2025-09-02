import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePostals } from '../../../hooks/useFirestore.js';
import { useAuth } from '../../../hooks/useAuth.jsx';

const SignUpDetailsP = () => {
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
    previousAddresses: '',
    otherNames: '',
    designation: '',
    employeeId: '',
    postalPinCode: '',
    postalBranchName: ''
  });
  
  const [addressYears, setAddressYears] = useState(null);
  const [otherName, setOtherName] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { createProfile: createPostalProfile } = usePostals();
  
  const { email, userId } = location.state || {};

  // Redirect if no user data available
  useEffect(() => {
    if (!email && !user?.email) {
      navigate('/auth/postal/signup');
    }
  }, [email, user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'streetAddress', 'city', 'state', 'zipCode', 'dateOfBirth', 'designation', 'employeeId', 'postalPinCode', 'postalBranchName'];
      const missingFields = requiredFields.filter(field => !formData[field].trim());
      
      if (missingFields.length > 0) {
        setError('Please fill in all required fields');
        return;
      }

      if (addressYears === null) {
        setError('Please specify if you lived at this address for 3+ years');
        return;
      }

      if (otherName === null) {
        setError('Please specify if you have been known by any other name');
        return;
      }

      if (otherName && !formData.otherNames.trim()) {
        setError('Please enter the other names you have been known by');
        return;
      }

      // Prepare profile data
      const profileData = {
        uid: userId || user?.uid,
        email: email || user?.email,
        isEmailVerified: user?.emailVerified || false,
        personalInfo: {
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim(),
          lastName: formData.lastName.trim(),
          dateOfBirth: formData.dateOfBirth,
          hasOtherNames: otherName,
          otherNames: otherName ? formData.otherNames.trim() : ''
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
        postalInfo: {
          designation: formData.designation.trim(),
          employeeId: formData.employeeId.trim(),
          postalPinCode: formData.postalPinCode.trim(),
          postalBranchName: formData.postalBranchName.trim()
        },
        registrationStatus: 'completed'
      };

      // Save to Firebase
      const result = await createPostalProfile(profileData);
      
      if (result.success) {
        // Navigate to super admin dashboard
        navigate('/postal/company-details', {
          state: {
            email: email || user?.email,
            isNewUser: true,
            profileCompleted: true
          }
        });
      } else {
        setError(result.error || 'Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving super admin profile:', error);
      setError('An error occurred while saving your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = () => {
    navigate('/signinp');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      <h1 className="text-3xl font-bold text-center mb-4">Enter Details</h1>

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-8">Complete Your Super Admin Profile</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <hr className="bg-black border-2 border-black mb-8" />
        <form onSubmit={handleDetailsSubmit}>
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
            <h3 className="font-semibold text-lg">Address *</h3>
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
                <label>
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
                <label>
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

          {/* Conditional Field for previous addresses */}
          {addressYears === false && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg">Please list prior 3 years addresses here *</h3>
              <div className="mb-4">
                <textarea
                  name="previousAddresses"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Previous Addresses"
                  value={formData.previousAddresses}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                ></textarea>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Date of Birth *</h3>
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

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Have you ever been known by any other name? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="otherName"
                    checked={otherName === true}
                    onChange={() => setOtherName(true)}
                    disabled={isSubmitting}
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="otherName"
                    checked={otherName === false}
                    onChange={() => setOtherName(false)}
                    disabled={isSubmitting}
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          {/* Show field for entering other names only if 'Yes' is selected */}
          {otherName && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg">Enter the Other Names</h3>
              <div className="mb-4">
                <input
                  type="text"
                  name="otherNames"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Other Names"
                  value={formData.otherNames}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-center mb-8">Super Admin Details</h2>
          <hr className="bg-black border-2 border-black mb-8" />

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Your Designation *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input 
                type="text" 
                name="designation"
                className="px-4 py-2 border rounded-lg" 
                placeholder="Designation" 
                value={formData.designation}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Your Employee ID *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input 
                type="text" 
                name="employeeId"
                className="px-4 py-2 border rounded-lg" 
                placeholder="Employee ID" 
                value={formData.employeeId}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Branch Pin Code *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input 
                type="text" 
                name="postalPinCode"
                className="px-4 py-2 border rounded-lg" 
                placeholder="Branch Pin Code" 
                value={formData.postalPinCode}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required 
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Your Branch Name *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input
                type="text"
                name="postalBranchName"
                className="px-4 py-2 border rounded-lg w-full"
                placeholder="Branch Name"
                value={formData.postalBranchName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="flex text-center justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-44 px-4 py-2 text-lg font-semibold rounded-full hover:shadow-lg mb-2 ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white'
              }`}
            >
              {isSubmitting ? 'Creating Profile...' : 'Complete Registration'}
            </button>
          </div>

          <div className="flex gap-2 text-center justify-center">
            <h4>Already have an Account?</h4>
            <button 
              type="button"
              className="font-semibold text-blue-600 hover:text-blue-800" 
              onClick={handleSignIn}
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

export default SignUpDetailsP;