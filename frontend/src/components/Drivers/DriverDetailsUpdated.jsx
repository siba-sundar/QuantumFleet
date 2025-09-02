import React, { useState, useEffect } from 'react';
import { User, AlertTriangle, Edit, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useDrivers } from '../../hooks/useFirestore.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchDriverSentiment } from '../../utils/api.js';
import VehicleDetailsContainer from './VehicleDetailsContainer.jsx';

const DriverDetailsUpdated = () => {
  const [driverData, setDriverData] = useState(null);
  // Sentiment removed from driver details per requirement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useAuth();
  const { findByUserId } = useDrivers();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from location state
  useEffect(() => {
    if (location.state?.updated && location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
    
  // Sentiment display removed
  }, [location.state]);

  useEffect(() => {
    const fetchDriverData = async () => {
      if (!user?.uid) {
        setError('No user authenticated');
        setLoading(false);
        return;
      }

      try {
        // Fetch driver profile data
        const result = await findByUserId(user.uid);
        if (result.success && result.data) {
          setDriverData(result.data);
        } else {
          setError('Driver profile not found');
        }
        
  // Sentiment fetching removed
      } catch (err) {
        console.error('Error fetching driver data:', err);
        setError('Failed to load driver profile');
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [user?.uid, findByUserId, location.state?.sentimentData]);

  const colorCodes = {
    excellent: "bg-green-500",
    good: "bg-blue-500",
    satisfactory: "bg-yellow-500",
    concern: "bg-red-500"
  };

  // Helper function to get status based on data completeness
  const getStatus = () => {
    if (!driverData) return 'concern';
    const hasPersonal = driverData.personalInfo?.firstName && driverData.personalInfo?.lastName;
    const hasLicense = driverData.licenseInfo?.licenseNumber;
    const hasProfessional = driverData.professionalInfo?.employeeId;
    
    if (hasPersonal && hasLicense && hasProfessional) return 'excellent';
    if (hasPersonal && hasLicense) return 'good';
    if (hasPersonal) return 'satisfactory';
    return 'concern';
  };
  
  // Sentiment helpers removed

  const handleEditProfessionalInfo = () => {
    navigate('/auth/driver/professional-details', {
      state: {
        isNewUser: false
      }
    });
  };

  const handleEditPersonalInfo = () => {
    navigate('/auth/driver/personal-details', {
      state: {
        isEditing: true
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/auth/driver/professional-details')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Complete Profile Setup
          </button>
        </div>
      </div>
    );
  }

  const status = getStatus();
  const statusText = status === 'excellent' ? 'Complete Profile' : 
                   status === 'good' ? 'Professional Details Needed' : 
                   status === 'satisfactory' ? 'License & Professional Details Needed' : 
                   'Profile Incomplete';

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Driver Details</h1>
        <span className={`px-3 py-1 rounded text-white text-sm ${colorCodes[status]}`}>
          {statusText}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
        {/* Personal Information Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <User className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-bold">Personal Information</h2>
            </div>
            <button 
              onClick={handleEditPersonalInfo}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              title="Edit Personal Information"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mr-4">
              <User className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {driverData?.personalInfo?.firstName || 'N/A'} {driverData?.personalInfo?.lastName || ''}
              </h3>
              <p className="text-gray-600">Driver</p>
              <p className="text-sm text-gray-500">
                Phone: {driverData?.phoneNumber || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Date of Birth:</strong> {driverData?.personalInfo?.dateOfBirth || 'Not provided'}</p>
              <p><strong>License Number:</strong> {driverData?.licenseInfo?.licenseNumber || 'Not provided'}</p>
              <p><strong>State of Issue:</strong> {driverData?.licenseInfo?.stateOfIssue || 'Not provided'}</p>
            </div>
            <div>
              <p><strong>License Expires:</strong> {driverData?.licenseInfo?.licenseExpiration || 'Not provided'}</p>
              <p><strong>Address:</strong> {driverData?.address?.city || 'Not provided'}, {driverData?.address?.state || ''}</p>
              <p><strong>Registration Status:</strong> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  driverData?.registrationStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {driverData?.registrationStatus || 'Pending'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Professional Summary Card */}
        <div className="bg-[#020073] text-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Professional Summary</h2>
            <button 
              onClick={handleEditProfessionalInfo}
              className="p-2 bg-white text-blue-900 rounded-lg hover:bg-gray-100 transition-colors"
              title="Edit Professional Information"
            >
              {driverData?.professionalInfo?.employeeId ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
          
          {driverData?.professionalInfo?.employeeId ? (
            <div className="space-y-3">
              <p><strong>Employee ID:</strong> {driverData.professionalInfo.employeeId}</p>
              <p><strong>Experience:</strong> {driverData.professionalInfo.experience} years</p>
              <p><strong>Current Assignment:</strong> {driverData.professionalInfo.currentAssignment}</p>
              <p><strong>Truck ID:</strong> {driverData.professionalInfo.truckId}</p>
              {driverData.professionalInfo.department && (
                <p><strong>Department:</strong> {driverData.professionalInfo.department}</p>
              )}
              {driverData.professionalInfo.supervisor && (
                <p><strong>Supervisor:</strong> {driverData.professionalInfo.supervisor}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Professional details not completed</p>
              <button 
                onClick={handleEditProfessionalInfo}
                className="px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Add Professional Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Details Section */}
      <div className="mt-6">
        <VehicleDetailsContainer driverId={user?.uid} />
      </div>

  {/* Sentiment section removed from driver details */}
    </div>
  );
};

export default DriverDetailsUpdated;