import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  CreditCard, 
  MapPin, 
  Truck, 
  Star, 
  TrendingUp, 
  Clock, 
  Shield,
  X,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Award
} from 'lucide-react';
import { fetchDriverSentiment, getDriverProfile } from '../../utils/api.js';

const DriverInfoDisplay = ({ driver, truck, reservation, onClose, className = "" }) => {
  const [driverDetails, setDriverDetails] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (driver?.id) {
      fetchDriverDetails();
    }
  }, [driver?.id]);

  const fetchDriverDetails = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch complete driver profile
      const profilePromise = getDriverProfile(driver.id).catch(() => null);
      
      // Fetch sentiment data
      const sentimentPromise = fetchDriverSentiment(driver.id).catch(() => null);

      const [profile, sentiment] = await Promise.all([profilePromise, sentimentPromise]);

      setDriverDetails(profile);
      setSentimentData(sentiment);
    } catch (err) {
      console.error('Error fetching driver details:', err);
      setError('Failed to load driver details');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentBgColor = (score) => {
    if (!score) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-blue-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading driver information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Driver Information</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-32 text-red-600">
          <AlertTriangle className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{driver?.name || 'Unknown Driver'}</h3>
              <p className="text-blue-100 text-sm">Professional Driver</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-lg font-semibold text-gray-800">
              {driver?.profile?.rating || '4.5'}
            </div>
            <div className="text-sm text-gray-600">Rating</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-lg font-semibold text-gray-800">
              {driver?.profile?.totalTrips || '25'}
            </div>
            <div className="text-sm text-gray-600">Trips</div>
          </div>
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${getSentimentBgColor(sentimentData?.currentScore)}`}>
              <Shield className={`w-6 h-6 ${getSentimentColor(sentimentData?.currentScore)}`} />
            </div>
            <div className={`text-lg font-semibold ${getSentimentColor(sentimentData?.currentScore)}`}>
              {sentimentData?.currentScore || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Sentiment</div>
          </div>
        </div>

        {/* Driver Details */}
        <div className="space-y-4">
          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              Contact Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Phone:</span>
                <div className="font-medium">{driver?.phone || 'Not available'}</div>
              </div>
              <div>
                <span className="text-gray-600">License:</span>
                <div className="font-medium">{driver?.licenseNumber || 'Not available'}</div>
              </div>
              {driverDetails?.personalInfo?.email && (
                <div className="col-span-2">
                  <span className="text-gray-600">Email:</span>
                  <div className="font-medium">{driverDetails.personalInfo.email}</div>
                </div>
              )}
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Professional Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Experience:</span>
                <div className="font-medium">{driver?.experience || 0} years</div>
              </div>
              <div>
                <span className="text-gray-600">License Type:</span>
                <div className="font-medium">{driverDetails?.licenseInfo?.licenseType || 'N/A'}</div>
              </div>
              <div>
                <span className="text-gray-600">Safety Score:</span>
                <div className="font-medium">{driver?.profile?.safetyScore || 'N/A'}</div>
              </div>
              <div>
                <span className="text-gray-600">License State:</span>
                <div className="font-medium">{driverDetails?.licenseInfo?.stateOfIssue || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Current Assignment */}
          {truck && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Truck className="w-4 h-4 mr-2" />
                Current Assignment
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Truck:</span>
                  <span className="font-medium">{truck.number}</span>
                </div>
                {reservation && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">{reservation.customerInfo?.contactName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route:</span>
                      <span className="font-medium text-right max-w-xs truncate">
                        {reservation.route?.pickupLocation} → {reservation.route?.dropLocation}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pickup Date:</span>
                      <span className="font-medium">{formatDate(reservation.route?.pickupDate)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sentiment Details */}
          {sentimentData && sentimentData.hasSentimentData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Sentiment Analysis
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Score:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${getSentimentColor(sentimentData.currentScore)}`}>
                      {sentimentData.currentScore}/100
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getSentimentBgColor(sentimentData.currentScore)} ${getSentimentColor(sentimentData.currentScore)}`}>
                      {sentimentData.currentLabel}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-medium">{formatDate(sentimentData.lastUpdated)}</span>
                </div>
                {sentimentData.recommendations && sentimentData.recommendations.length > 0 && (
                  <div className="mt-3">
                    <span className="text-gray-600 block mb-1">Recommendations:</span>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {sentimentData.recommendations.slice(0, 2).map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              <Phone className="w-4 h-4 mr-2" />
              Call Driver
            </button>
            <button className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center">
              <MapPin className="w-4 h-4 mr-2" />
              Track Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverInfoDisplay;