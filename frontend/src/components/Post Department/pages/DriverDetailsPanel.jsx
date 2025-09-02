import React, { useState, useEffect } from 'react';
import { User, Activity, Heart, Brain, AlertTriangle } from 'lucide-react';
import { fetchDriverSentiment } from '../../../utils/api.js';
import { DriverRepository } from '../../../repositories/DriverRepository.js';

const driverRepo = new DriverRepository();

const DriverDetailsPanel = ({ driverId }) => {
  const [driverData, setDriverData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const currentId = driverId;

    // reset state for new driver selection
    setLoading(true);
    setError('');
    setDriverData(null);
    setSentimentData(null);

    const fetchDriverData = async () => {
      if (!currentId) {
        if (!cancelled) {
          setError('No driver selected');
          setLoading(false);
        }
        return;
      }

      try {
        console.log("Attempting to fetch driver data for ID:", currentId);
        const result = await driverRepo.findById(currentId);

        if (!result) {
          throw new Error('Driver not found in database');
        }
        if (cancelled) return;
        setDriverData(result);

        // Fetch sentiment (best-effort)
        try {
          const sentimentResult = await fetchDriverSentiment(currentId);
          if (!cancelled) setSentimentData(sentimentResult);
        } catch (sentimentError) {
          console.warn('API sentiment data not available:', sentimentError.message);
          if (!cancelled) {
            setSentimentData({ hasSentimentData: false, message: 'No sentiment data available' });
          }
        }
      } catch (err) {
        console.error('Error fetching driver data:', err);
        if (!cancelled) setError('Failed to load driver profile: ' + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDriverData();
    return () => { cancelled = true; };
  }, [driverId]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error && !driverData) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!driverData) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Profile Not Found</h2>
          <p className="text-gray-600">No data available for this driver</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
        {/* Personal Information Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-4">
            <User className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-bold">Personal Information</h2>
          </div>
          
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mr-4">
              {driverData.photoUrl ? (
                <img 
                  src={driverData.photoUrl} 
                  alt={`${driverData.personalInfo?.firstName || 'Driver'}`}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                    e.target.parentNode.classList.add('bg-gray-300');
                    e.target.parentNode.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
                  }}
                />
              ) : (
                <User className="h-8 w-8 text-gray-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {driverData.personalInfo?.firstName || driverData.name || 'N/A'} {driverData.personalInfo?.lastName || ''}
              </h3>
              <p className="text-gray-600">Driver</p>
              <p className="text-sm text-gray-500">
                Phone: {driverData.phoneNumber || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Date of Birth:</strong> {driverData.personalInfo?.dateOfBirth || 'Not provided'}</p>
              <p><strong>License Number:</strong> {driverData.licenseInfo?.licenseNumber || 'Not provided'}</p>
              <p><strong>State of Issue:</strong> {driverData.licenseInfo?.stateOfIssue || 'Not provided'}</p>
            </div>
            <div>
              <p><strong>License Expires:</strong> {driverData.licenseInfo?.licenseExpiration || 'Not provided'}</p>
              <p><strong>Address:</strong> {driverData.address?.city || 'Not provided'}, {driverData.address?.state || ''}</p>
              <p><strong>Registration Status:</strong> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  driverData.registrationStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {driverData.registrationStatus || 'Pending'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Professional Summary Card */}
        <div className="bg-[#020073] text-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Professional Summary</h2>
          
          {driverData.professionalInfo?.employeeId ? (
            <div className="space-y-3">
              <p><strong>Employee ID:</strong> {driverData.professionalInfo.employeeId}</p>
              <p><strong>Experience:</strong> {driverData.professionalInfo.experience} years</p>
              <p><strong>Current Assignment:</strong> {driverData.professionalInfo.currentAssignment || 'Not assigned'}</p>
              <p><strong>Truck ID:</strong> {driverData.professionalInfo.truckId || 'Not assigned'}</p>
              {driverData.professionalInfo.department && (
                <p><strong>Department:</strong> {driverData.professionalInfo.department}</p>
              )}
              {driverData.professionalInfo.supervisor && (
                <p><strong>Supervisor:</strong> {driverData.professionalInfo.supervisor}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p>Professional details not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Information Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600">
              <Activity className="h-4 w-4 inline mr-2" />
              Performance & Sentiment
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
              <p className="text-gray-600">{driverData.status || 'Active'}</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Experience</h3>
              <p className="text-gray-600">{driverData.professionalInfo?.experience || 'N/A'} years</p>
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
            </div>
          </div>

          {/* Sentiment Analysis Summary */}
          {sentimentData?.hasSentimentData && (
            <div className="mt-8 text-center">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 font-medium mb-2">
                  Latest Sentiment Analysis
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDetailsPanel;