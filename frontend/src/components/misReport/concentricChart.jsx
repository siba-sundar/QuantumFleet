import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import React from 'react';

// Data for the concentric circle chart
const data = [
  { name: '9:00AM', value: 100 },
  { name: '10:00AM', value: 150 },
  { name: '11:00AM', value: 200 },
  { name: '12:00PM', value: 250 },
  { name: '1:00PM', value: 200 },
  { name: '2:00PM', value: 150 },
];

// Colors related to logistics
const COLORS = ['#006400', '#008000', '#228B22', '#32CD32', '#3CB371', '#90EE90'];

function ConcentricCircleChart() {
  return (
    <div className="flex flex-col items-center w-full h-full">
      <h3 className="text-center text-sm font-semibold mb-2">Load Weight</h3>
      <PieChart width={300} height={300}>
        <Pie
          data={data}
          dataKey="value"
          outerRadius={80}
          innerRadius={40}
          fill="#8884d8"
          paddingAngle={3}
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}

export default ConcentricCircleChart;