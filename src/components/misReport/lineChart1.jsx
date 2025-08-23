import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const truckStatusData = [
  { time: '8 AM', status: 1 }, // Early
  { time: '9 AM', status: 2 }, // On Time
  { time: '10 AM', status: 3 }, // Delay
  { time: '11 AM', status: 1 }, // Early
  { time: '12 PM', status: 2 }, // On Time
  { time: '1 PM', status: 3 }, // Delay
  { time: '2 PM', status: 2 }, // On Time
];

function TruckStatusChart() {
  return (
    <div className="flex items-center justify-center h-full w-full p-2">
      <div className="w-full h-full" style={{ maxWidth: '100%', maxHeight: '100%' }}>
      <h3 className="text-center text-md font-semibold mb-4">Truck Status Over Time</h3>
        <LineChart width={400} height={300} data={truckStatusData}>
          <XAxis dataKey="time" />
          <YAxis />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="status" stroke="#8884d8" />
        </LineChart>
      </div>
    </div>
  );
}

export default TruckStatusChart;