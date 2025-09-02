// Stats.js
import React from 'react';
import CanvasJSReact from '@canvasjs/react-charts';
import './Stats.css'; // Custom CSS for chart-specific styling

const CanvasJS = CanvasJSReact.CanvasJS;
const CanvasJSChart = CanvasJSReact.CanvasJSChart;

const Stats = () => {
  const options = {
    theme: "light2",
    animationEnabled: true,
    backgroundColor: "#020073", // Set chart background color to dark blue
    axisY: {

      labelFontColor: "white", // Set axis Y labels to white
      lineColor: "white", // White axis line
      titleFontColor: "white",
    },
    axisX: {
      labelFontColor: "white", // Set axis X labels to white
      lineColor: "white", // White axis line
      titleFontColor: "white",
    },
    data: [
      {
        type: "area", // Chart type
        xValueFormatString: "YYYY",
        yValueFormatString: "#,##0.## Million",
        color: "white", // Set data series color to white
        dataPoints: [
          { x: new Date(2017, 0), y: 7.6 },
          { x: new Date(2016, 0), y: 7.3 },
          { x: new Date(2015, 0), y: 6.4 },
          { x: new Date(2014, 0), y: 5.3 },
          { x: new Date(2013, 0), y: 4.5 },
          { x: new Date(2012, 0), y: 3.8 },
          { x: new Date(2011, 0), y: 3.2 }
        ]
      }
    ]
  };

  return (
    <div className="bg-darkblue p-6 rounded-lg ">
      <div className="chart-container">
        <CanvasJSChart options={options} />
      </div>
    </div>
  );
};

export default Stats;
