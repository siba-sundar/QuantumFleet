import React, { useState, useEffect } from 'react';
import { fetchDriverSentiment, fetchDriverSentimentHistory } from '../../utils/api.js';
import driverImg from "../../assets/driver-profile.svg";

/**
 * Enhanced Driver Card with real sentiment data integration
 */
const EnhancedDriverCard = ({ 
  driverId, 
  driverName = "Driver", 
  driverData = {},
  showHistory = false,
  className = ""
}) => {
  const [sentimentData, setSentimentData] = useState(null);
  const [sentimentHistory, setSentimentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (driverId) {
      console.log('Loading sentiment for driver ID:', driverId);
      loadDriverSentiment();
      if (showHistory) {
        loadSentimentHistory();
      }
    }
  }, [driverId, showHistory]);

  const loadDriverSentiment = async () => {
    try {
      setLoading(true);
      console.log('Fetching sentiment for driver:', driverId);
      const data = await fetchDriverSentiment(driverId);
      console.log('Received sentiment data:', data);
      setSentimentData(data);
    } catch (error) {
      console.error('Error loading driver sentiment:', error);
      setError(`Unable to load sentiment data: ${error.message}`);
      // Set default empty sentiment data
      setSentimentData({
        driverId,
        hasSentimentData: false,
        message: 'No sentiment data available for this driver'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSentimentHistory = async () => {
    try {
      const history = await fetchDriverSentimentHistory(driverId, 5);
      setSentimentHistory(history.history || []);
    } catch (error) {
      console.error('Error loading sentiment history:', error);
    }
  };

  const getBackgroundColor = (score) => {
    if (!score) return 'bg-gray-300';
    if (score >= 81) return 'bg-green-500';
    if (score >= 61) return 'bg-green-700';
    if (score >= 41) return 'bg-gray-500';
    if (score >= 21) return 'bg-red-700';
    return 'bg-red-500';
  };

  const getSentimentStatus = (score) => {
    if (!score) return 'Unknown';
    if (score >= 81) return 'Excellent';
    if (score >= 61) return 'Good';
    if (score >= 41) return 'Fair';
    if (score >= 21) return 'Poor';
    return 'Critical';
  };

  const getSentimentTrend = () => {
    if (sentimentHistory.length < 2) return null;
    
    const latest = sentimentHistory[0]?.score || 0;
    const previous = sentimentHistory[1]?.score || 0;
    const change = latest - previous;
    
    if (Math.abs(change) < 5) return { trend: 'stable', icon: '→', color: 'text-gray-400' };
    if (change > 0) return { trend: 'improving', icon: '↗', color: 'text-green-400' };
    return { trend: 'declining', icon: '↘', color: 'text-red-400' };
  };

  const backgroundColor = sentimentData?.hasSentimentData 
    ? getBackgroundColor(sentimentData.currentScore)
    : 'bg-gray-300';

  const sentimentTrend = getSentimentTrend();

  if (loading) {
    return (
      <div className={`w-full h-[40vh] bg-gray-200 rounded-lg shadow-lg p-5 flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          <span className="text-gray-600">Loading driver information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex gap-6 mt-4 h-[40vh] ml-4 ${backgroundColor} p-5 rounded-lg shadow-lg transition duration-300 ${className}`}>
      {/* Driver personal information */}
      <div className="flex flex-col flex-grow">
        <p className='text-white text-xl font-semibold'>Driver Information</p>

        <div className='flex gap-4 items-start mt-3'> 
          <img
            src={driverData.profileImage || driverImg}
            alt="Driver"
            className="w-16 h-16 rounded-full object-cover"
            onError={(e) => { e.target.src = driverImg; }}
          />
          <div className="flex-grow">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-bold text-white text-base">{driverData.name || driverName}</p>
                <p className="text-gray-300">Age: {driverData.age || 'N/A'}</p>
                <p className="text-gray-300">License: {driverData.licenseNumber || 'N/A'}</p>
                <p className="text-gray-300">Contact: {driverData.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-300">Employee ID: {driverData.employeeId || driverId}</p>
                <p className="text-gray-300">Experience: {driverData.experience || 'N/A'} years</p>
                <p className="text-gray-300">Department: {driverData.department || 'N/A'}</p>
                <p className="text-gray-300">Truck: {driverData.currentTruck || 'Unassigned'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment History Preview */}
        {showHistory && sentimentHistory.length > 0 && (
          <div className="mt-4">
            <p className="text-white text-sm font-medium mb-2">Recent Sentiment Trend</p>
            <div className="flex gap-1">
              {sentimentHistory.slice(0, 5).map((entry, index) => (
                <div
                  key={index}
                  className={`w-8 h-2 rounded ${getBackgroundColor(entry.score)} opacity-${100 - (index * 20)}`}
                  title={`${entry.score}/100 on ${new Date(entry.submittedAt).toLocaleDateString()}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Driver sentiment status */}
      <div className="flex flex-col gap-3 mt-1 min-w-[200px]">
        <div>
          <p className="font-semibold text-white">Overall Status</p>
          <div className="flex items-center gap-2">
            <p className="text-white text-3xl font-bold">
              {sentimentData?.hasSentimentData 
                ? getSentimentStatus(sentimentData.currentScore)
                : 'No Data'
              }
            </p>
            {sentimentTrend && (
              <span className={`text-xl ${sentimentTrend.color}`} title={`Trend: ${sentimentTrend.trend}`}>
                {sentimentTrend.icon}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="font-semibold text-white">Sentiment Score</p>
          <div className="flex items-baseline gap-2">
            <p className="text-white text-3xl font-bold">
              {sentimentData?.hasSentimentData ? sentimentData.currentScore : 'N/A'}
            </p>
            {sentimentData?.hasSentimentData && (
              <span className="text-white/80 text-lg">/100</span>
            )}
          </div>
          {sentimentData?.lastUpdated && (
            <p className="text-gray-300 text-xs mt-1">
              Last updated: {new Date(sentimentData.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-auto">
          {!sentimentData?.hasSentimentData && (
            <div className="bg-white/20 p-2 rounded text-center">
              <p className="text-white text-xs">No sentiment data available</p>
              <button 
                onClick={() => window.location.href = '/sentiment-survey'}
                className="text-xs text-white underline hover:text-gray-200"
              >
                Take Survey
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * Compact driver sentiment indicator for use in lists
 */
export const DriverSentimentIndicator = ({ driverId, score, label, size = 'sm' }) => {
  const getColorClass = (score) => {
    if (!score) return 'bg-gray-400';
    if (score >= 81) return 'bg-green-500';
    if (score >= 61) return 'bg-blue-500';
    if (score >= 41) return 'bg-yellow-500';
    if (score >= 21) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const sizeClasses = {
    xs: 'w-2 h-2 text-xs',
    sm: 'w-3 h-3 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-6 h-6 text-base'
  };

  if (!score) return null;

  return (
    <div 
      className={`${sizeClasses[size]} ${getColorClass(score)} rounded-full flex items-center justify-center text-white font-bold`}
      title={`Sentiment: ${score}/100 - ${label || 'No label'}`}
    >
      {size !== 'xs' && Math.round(score/10)}
    </div>
  );
};

/**
 * Driver sentiment chart for detailed view
 */
export const DriverSentimentChart = ({ driverId, height = '200px' }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driverId) {
      loadHistory();
    }
  }, [driverId]);

  const loadHistory = async () => {
    try {
      const data = await fetchDriverSentimentHistory(driverId, 10);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading sentiment history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`w-full bg-gray-100 rounded-lg flex items-center justify-center`} style={{ height }}>
        <span className="text-gray-500">Loading chart...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={`w-full bg-gray-100 rounded-lg flex items-center justify-center`} style={{ height }}>
        <span className="text-gray-500">No sentiment history available</span>
      </div>
    );
  }

  // Simple line chart representation
  const maxScore = 100;
  const minScore = 0;
  const chartHeight = parseInt(height) - 40;
  
  const points = history.map((entry, index) => {
    const x = (index / (history.length - 1)) * 100;
    const y = ((maxScore - entry.score) / (maxScore - minScore)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full bg-white rounded-lg p-4 border" style={{ height }}>
      <h4 className="text-sm font-medium mb-2">Sentiment Trend</h4>
      <svg width="100%" height={chartHeight} className="border-l border-b">
        <polyline
          points={points}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        {history.map((entry, index) => {
          const x = (index / (history.length - 1)) * 100;
          const y = ((maxScore - entry.score) / (maxScore - minScore)) * chartHeight;
          return (
            <circle
              key={index}
              cx={`${x}%`}
              cy={y}
              r="3"
              fill="#3B82F6"
              title={`${entry.score}/100 on ${new Date(entry.submittedAt).toLocaleDateString()}`}
            />
          );
        })}
        
        {/* Y-axis labels */}
        <text x="5" y="15" fontSize="10" fill="#666">100</text>
        <text x="5" y={chartHeight - 5} fontSize="10" fill="#666">0</text>
      </svg>
    </div>
  );
};

export default EnhancedDriverCard;