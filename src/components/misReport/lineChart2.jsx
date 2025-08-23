import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const engineTempData = [
  { time: '8 AM', temperature: 85 },
  { time: '9 AM', temperature: 120 },
  { time: '10 AM', temperature: 140 },
  { time: '11 AM', temperature: 150 },
  { time: '12 PM', temperature: 160 },
  { time: '1 PM', temperature: 145 },
  { time: '2 PM', temperature: 135 },
];

function EngineTemperatureChart() {
  return (
    <div className="flex items-center justify-center h-full w-full p-2">
      <div className="w-full h-full" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <h3 className="text-center text-md font-semibold mb-4">Engine Temperature Over Time</h3>
        <LineChart width={400} height={300} data={engineTempData}>
          <XAxis dataKey="time" />
          <YAxis />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke="#ff7300" />
        </LineChart>
      </div>
    </div>
  );
}

export default EngineTemperatureChart;