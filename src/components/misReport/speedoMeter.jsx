import ReactSpeedometer from 'react-d3-speedometer';
import React from 'react';

function Speedometer() {
  return (
    <div className="flex flex-col items-center w-full h-full">
      <h3 className="text-center text-sm font-semibold mb-8">Current Speed</h3>
      <div className="flex items-center justify-center w-full h-full">
        <ReactSpeedometer
          maxValue={276}
          value={150}
          needleColor="#004d40" // Changed to a more muted color
          startColor="#00bfae" // Teal for a modern look
          endColor="#e57373" // Red with a softer tone
          needleHeightRatio={0.8} // Slightly reduced for better proportion
          ringWidth={30} // Thinner ring for a sleeker design
          textColor="#333" // Dark grey for better readability
          segments={9} // Reduced number of segments for simplicity
          segmentColor="#b0bec5" // Light grey for segments
          textSize={20} // Optional: Adjust text size for value
          labelFontSize="14px" // Optional: Adjust font size of labels
          valueFormat=",.0f" // Optional: Format the value with commas
        />
      </div>
    </div>
  );
}

export default Speedometer;