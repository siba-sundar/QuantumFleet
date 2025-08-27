import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { User, Activity, Heart, Brain, AlertTriangle, Edit, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useDrivers } from '../../hooks/useFirestore.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchDriverSentiment } from '../../utils/api.js';

const DriverDetailsUpdated = () => {
  const [driverData, setDriverData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
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
    
    // Check for sentiment data from survey completion
    if (location.state?.sentimentData) {
      setSentimentData({
        hasSentimentData: true,
        currentScore: location.state.sentimentData.sentimentScore,
        currentLabel: location.state.sentimentData.sentimentLabel,
        analysis: location.state.sentimentData.analysis,
        lastUpdated: new Date().toISOString()
      });
    }
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
        
        // Fetch sentiment data if not already loaded from location state
        if (!location.state?.sentimentData) {
          try {
            console.log('Fetching sentiment data for driver:', user.uid);
            const sentimentResult = await fetchDriverSentiment(user.uid);
            console.log('Sentiment data received:', sentimentResult);
            setSentimentData(sentimentResult);
          } catch (sentimentError) {
            console.warn('No sentiment data available:', sentimentError.message);
            setSentimentData({
              hasSentimentData: false,
              message: 'No sentiment data available. Take a survey to get started!'
            });
          }
        }
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
  
  // Helper function to get sentiment status and color
  const getSentimentStatus = () => {
    if (!sentimentData?.hasSentimentData) {
      return {
        status: 'No Data',
        color: 'bg-gray-100',
        iconColor: 'text-gray-600',
        score: 'N/A'
      };
    }
    
    const score = sentimentData.currentScore;
    if (score >= 81) return { status: 'Excellent', color: 'bg-green-100', iconColor: 'text-green-600', score };
    if (score >= 61) return { status: 'Good', color: 'bg-blue-100', iconColor: 'text-blue-600', score };
    if (score >= 41) return { status: 'Fair', color: 'bg-yellow-100', iconColor: 'text-yellow-600', score };
    if (score >= 21) return { status: 'Poor', color: 'bg-orange-100', iconColor: 'text-orange-600', score };
    return { status: 'Critical', color: 'bg-red-100', iconColor: 'text-red-600', score };
  };

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

      {/* Additional Information Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600">
              <Activity className="h-4 w-4 inline mr-2" />
              Performance
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
              <Heart className="h-4 w-4 inline mr-2" />
              Health
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
              <Brain className="h-4 w-4 inline mr-2" />
              Sentiment
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Status</h3>
              <p className="text-gray-600">Good</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Performance</h3>
              <p className="text-gray-600">Excellent</p>
            </div>

            <div className="text-center">
              <div className={`${getSentimentStatus().color} rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center`}>
                <Brain className={`h-8 w-8 ${getSentimentStatus().iconColor}`} />
              </div>
              <h3 className="font-semibold text-gray-900">Sentiment Score</h3>
              <div className="space-y-1">
                <p className="text-gray-900 font-bold text-lg">{getSentimentStatus().score}</p>
                <p className="text-gray-600 text-sm">{getSentimentStatus().status}</p>
                {sentimentData?.lastUpdated && (
                  <p className="text-gray-400 text-xs">
                    Updated: {new Date(sentimentData.lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>
              {!sentimentData?.hasSentimentData && (
                <div className="mt-2">
                  <button 
                    onClick={() => navigate('/driver/sentiment-analysis')}
                    className="text-xs text-blue-600 underline hover:text-blue-800"
                  >
                    Take Survey Now
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            {sentimentData?.hasSentimentData ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800 font-medium mb-2">
                    Latest Sentiment Analysis Complete
                  </p>
                  <p className="text-green-600 text-sm">
                    Score: {sentimentData.currentScore}/100 ({sentimentData.currentLabel})
                  </p>
                  {sentimentData.analysis && (
                    <p className="text-green-600 text-sm mt-1">
                      {sentimentData.analysis}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => navigate('/driver/sentiment-analysis')}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retake Survey
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Complete your professional details and sentiment analysis to unlock advanced analytics and performance tracking.
                </p>
                <div className="flex gap-4 justify-center">
                  {!driverData?.professionalInfo?.employeeId && (
                    <button 
                      onClick={handleEditProfessionalInfo}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Complete Professional Profile
                    </button>
                  )}
                  <button 
                    onClick={() => navigate('/driver/sentiment-analysis')}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Take Sentiment Survey
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDetailsUpdated;