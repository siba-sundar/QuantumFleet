import React, { useState, useEffect } from 'react';

import driverImg from "../../../assets/driver-profile.svg"

const SentimentAnalysis = () => {
  const [requestBody, setRequestBody] = useState(`{
    "driver_id": "00123",
    "job_satisfaction": "Good",
    "relationship_with_management": "Good",
    "work_hours_per_week": "11",
    "mental_health": "Good",
    "physical_health": "Good",
    "salary_satisfaction": "Satisfied",
    "work_conditions": "good"
  }`);

  const [response, setResponse] = useState("Waiting for response...");
  const [sentimentScore, setSentimentScore] = useState(null);
  const [sentimentLabel, setSentimentLabel] = useState("");

  useEffect(() => {
    const url = "https://gemini-sentiment-analysis-sand.vercel.app/api/analyze-survey";

    // Send POST request to the API automatically when the component mounts
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    })
      .then((response) => response.json())
      .then((data) => {
        setResponse(JSON.stringify(data, null, 2));
        setSentimentScore(data.sentiment_score);
        setSentimentLabel(data.sentiment_label);
      })
      .catch((error) => {
        setResponse('Error: ' + error);
      });
  }, [requestBody]);

  // Define background color based on sentiment label
  const getBackgroundColor = (sentimentLabel) => {
    switch (sentimentLabel) {
      case 'Very Positive':
        return 'bg-green-500';
      case 'Positive':
        return 'bg-green-700';
      case 'Neutral':
        return 'bg-gray-500';
      case 'Negative':
        return 'bg-red-700 text-white';
      case 'Very Negative':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-300'; // Default color if no sentiment is available
    }
  };

  return (
    <div>
      {/* <h1>Call Sentiment Analysis API</h1>

      <h3>Request Body (JSON)</h3>
      <textarea
        rows="10"
        style={{ width: '100%', marginBottom: '20px' }}
        value={requestBody}
        onChange={(e) => setRequestBody(e.target.value)}
      /> */}

      {/* <h3>Response:</h3>
      <pre
        id="response"
        style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '5px',
          marginTop: '20px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {response}
      </pre> */}

      <DriverCard sentimentLabel={sentimentLabel} sentimentScore={sentimentScore} />
    </div>
  );
};

// DriverCard Component
const DriverCard = ({ sentimentLabel, sentimentScore }) => {
  const backgroundColor = getBackgroundColor(sentimentLabel);

  return (
    <div className={`w-full flex gap-6  mt-4 h-[40vh] ml-4 ${backgroundColor} p-5 rounded-lg shadow-lg transition duration-300`}>
      {/* Driver personal information */}
      <div className=" flex flex-col">
        <p className='text-white text-xl font-semibold'>Personal Information</p>

        <div className='flex gap-2 items-center mt-3'> 
          <img
            src={driverImg}
            alt="Driver"
            className="w-16 h-16 rounded-full"
          />
          <div className="ml-4">
            <p className="font-bold text-white">Driver Name: Shyam Lal</p>
            <p className=" text-gray-300">Age: 35</p>
            <p className="text-gray-300">License Number: 123456789</p>
            <p className="text-gray-300">Contact: 7013456872</p>
            <p className="text-gray-300">Employee ID: EMP001</p>
          </div>
        </div>
      </div>

      {/* Driver moral status */}
      <div className=" flex flex-col gap-3 mt-1">
        <div>
          <p className="font-semibold text-white">Status</p>
          <p className="text-white text-4xl font-bold">Good</p>
        </div>

        <div>
          <p className="font-semibold text-white">Sentimental Score</p>
          <p className="text-white text-4xl font-bold">{sentimentScore || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

// Helper function to get the background color based on sentiment label
const getBackgroundColor = (sentimentLabel) => {
  switch (sentimentLabel) {
    case 'Very Positive':
      return 'bg-green-500';
    case 'Positive':
      return 'bg-green-700';
    case 'Neutral':
      return 'bg-gray-500';
    case 'Negative':
      return 'bg-red-700 text-white';
    case 'Very Negative':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-300';
  }
};

export default SentimentAnalysis;
