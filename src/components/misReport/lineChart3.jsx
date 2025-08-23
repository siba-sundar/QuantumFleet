import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const tirePressureData = [
  { time: '8 AM', pressure: 90 },
  { time: '9 AM', pressure: 150 },
  { time: '10 AM', pressure: 120 },
  { time: '11 AM', pressure: 150 },
  { time: '12 PM', pressure: 100 },
  { time: '1 PM', pressure: 120 },
  { time: '2 PM', pressure: 180 },
];

function TirePressureChart() {
  return (
    <div className="flex items-center justify-center h-full w-full p-2">
      <div className="w-full h-full" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <h3 className="text-center text-md font-semibold mb-4">Tire Pressure Over Time</h3>
        <LineChart width={400} height={300} data={tirePressureData}>
          <XAxis dataKey="time" />
          <YAxis />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pressure" stroke="#82ca9d" />
        </LineChart>
      </div>
    </div>
  );
}

export default TirePressureChart;