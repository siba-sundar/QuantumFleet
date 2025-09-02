import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import React from 'react';

// Data for the fuel status pie chart
const fuelData = [
  { name: '6:00 AM', value: 40 },
  { name: '8:00 AM', value: 30 },
  { name: '10:00 AM', value: 20 },
  { name: '12:00 PM', value: 10 },
];

// Colors related to logistics
const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545'];

function FuelStatusPieChart() {
  return (
    <div className="flex flex-col items-center w-full h-full">
      <h3 className="text-center text-sm font-semibold mb-2">Fuel Status</h3>
      <PieChart width={300} height={300}>
        <Pie
          data={fuelData}
          dataKey="value"
          outerRadius={80}
          fill="#82ca9d"
          label={({ name, value }) => `${value}%`}
        >
          {fuelData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
        <Legend />
      </PieChart>
    </div>
  );
}

export default FuelStatusPieChart;
