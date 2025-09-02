import React, { useState, useEffect } from 'react';
import driverImg from "../../../assets/driver-profile.svg";

// This component now only displays sentiment data passed as props
// No automatic API calls to respect the 2-times-per-month limit
const SentimentAnalysis = ({ driverId, sentimentData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Extract sentiment info from props or set defaults
  const sentimentScore = sentimentData?.currentScore || null;
  const sentimentLabel = sentimentData?.currentLabel || '';
  const hasData = sentimentData?.hasSentimentData || false;

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          {error}
        </div>
      )}
      
      <DriverCard 
        sentimentLabel={sentimentLabel} 
        sentimentScore={sentimentScore}
        hasData={hasData}
        loading={loading}
        driverId={driverId}
      />
    </div>
  );
};

// DriverCard Component - Updated to handle cases where no sentiment data exists
const DriverCard = ({ sentimentLabel, sentimentScore, hasData, loading, driverId }) => {
  const backgroundColor = getBackgroundColor(sentimentLabel, hasData);

  return (
    <div className={`w-full flex gap-6 mt-4 h-[40vh] ml-4 ${backgroundColor} p-5 rounded-lg shadow-lg transition duration-300`}>
      {/* Driver personal information */}
      <div className="flex flex-col">
        <p className='text-white text-xl font-semibold'>Driver Information</p>

        <div className='flex gap-2 items-center mt-3'> 
          <img
            src={driverImg}
            alt="Driver"
            className="w-16 h-16 rounded-full"
          />
          <div className="ml-4">
            <p className="font-bold text-white">Driver ID: {driverId || 'Unknown'}</p>
            <p className="text-gray-300">Status: Active</p>
            <p className="text-gray-300">License: Valid</p>
            <p className="text-gray-300">Experience: Professional</p>
          </div>
        </div>
      </div>

      {/* Driver sentiment status */}
      <div className="flex flex-col gap-3 mt-1 min-w-[200px]">
        <div>
          <p className="font-semibold text-white">Overall Status</p>
          <div className="flex items-center gap-2">
            <p className="text-white text-3xl font-bold">
              {loading ? 'Loading...' : hasData ? getSentimentStatus(sentimentScore) : 'No Data'}
            </p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-white">Sentiment Score</p>
          <div className="flex items-baseline gap-2">
            <p className="text-white text-3xl font-bold">
              {loading ? '...' : hasData ? sentimentScore : 'N/A'}
            </p>
            {hasData && (
              <span className="text-white/70 text-sm">/100</span>
            )}
          </div>
          {hasData && (
            <p className="text-white/80 text-sm mt-1">
              Category: {sentimentLabel}
            </p>
          )}
        </div>

        {!hasData && !loading && (
          <div className="mt-2 p-3 bg-white/10 rounded">
            <p className="text-white/80 text-sm">
              No sentiment analysis data available.
            </p>
            <p className="text-white/60 text-xs mt-1">
              Complete a sentiment survey to see your status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get sentiment status text
const getSentimentStatus = (score) => {
  if (!score) return 'Unknown';
  if (score >= 81) return 'Excellent';
  if (score >= 61) return 'Good';
  if (score >= 41) return 'Neutral';
  if (score >= 21) return 'Concerned';
  return 'Critical';
};

// Helper function to get the background color based on sentiment
const getBackgroundColor = (sentimentLabel, hasData) => {
  if (!hasData) return 'bg-gray-500'; // Default when no data
  
  switch (sentimentLabel) {
    case 'Very Positive':
      return 'bg-green-500';
    case 'Positive':
      return 'bg-green-600';
    case 'Neutral':
      return 'bg-yellow-500';
    case 'Negative':
      return 'bg-orange-600';
    case 'Very Negative':
      return 'bg-red-600';
    default:
      return 'bg-gray-500';
  }
};

export default SentimentAnalysis;