import React from 'react';
import { useNavigate } from 'react-router-dom'; // Use useNavigate for navigation
import ConcentricCircleChart from './concentricChart';
import FuelStatusPieChart from './pieChart';
import TruckStatusChart from './lineChart1';
import EngineTemperatureChart from './lineChart2';
import TirePressureChart from './lineChart3';
import Speedometer from './speedoMeter';
import MapComponent from './mapComponent';
import logo from '../../assets/logo1.png';

function MISReport() {
  const navigate = useNavigate(); // Initialize useNavigate hook

  const navigateToLanding = () => {
    navigate('/'); // Navigate to the landing page
  };

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen">
      {/* Header: Logo and Heading */}
      <header className="bg-white shadow-md p-4 md:p-8 flex flex-col md:flex-row items-center justify-center relative">
        <div className="absolute top-4 left-4 md:left-8">
          <img
            src={logo} // Use the imported logo here
            alt="Company Logo"
            className="h-16 md:h-24 cursor-pointer" // Adjust height for different screen sizes
            onClick={navigateToLanding} // Navigate on click
          />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-center flex-1 mt-4 md:mt-0">MIS Report</h1> {/* Adjust font size and margin */}
      </header>

      {/* Main Content */}
      <div className="flex flex-col p-4 flex-grow">
        {/* First Row: Load Weight, Fuel Status, Current Speed */}
        <div className="flex flex-col md:flex-row mb-4 gap-4">
          <div className="flex-1 bg-white p-4 shadow-lg rounded-lg flex flex-col items-center justify-center">
            <ConcentricCircleChart />
          </div>
          <div className="flex-1 bg-white p-4 shadow-lg rounded-lg flex flex-col items-center justify-center">
            <FuelStatusPieChart />
          </div>
          <div className="flex-1 bg-white p-4 shadow-lg rounded-lg flex flex-col items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              <Speedometer />
            </div>
          </div>
        </div>

        {/* Second Row: Map, Distance Metrics */}
        <div className="flex flex-col md:flex-row mb-4 gap-4 flex-grow">
          <div className="flex-grow bg-white p-4 shadow-lg rounded-lg flex flex-col items-center justify-center">
            <MapComponent />
          </div>
          <div className="flex-none w-full md:w-1/4 bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b border-gray-300">
              <h3 className="text-lg font-semibold text-center">Distance Metrics</h3>
            </div>
            <hr className="bg-black border-2 border-black mb-8" />
            <div className="flex flex-col p-4">
              <div className="flex flex-col bg-gray-200 p-2 shadow-md rounded-lg mb-2 text-center">
                <h4 className="text-sm font-semibold">Total Distance</h4>
                <p className="text-xl font-bold">780 KM</p>
              </div>
              <div className="flex flex-col bg-gray-200 p-2 shadow-md rounded-lg mb-2 text-center">
                <h4 className="text-sm font-semibold">Covered Distance</h4>
                <p className="text-xl font-bold">340 KM</p>
              </div>
              <div className="flex flex-col bg-gray-200 p-2 shadow-md rounded-lg text-center">
                <h4 className="text-sm font-semibold">Remaining Distance</h4>
                <p className="text-xl font-bold">440 KM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Truck Status Over Time, Truck Engine Temp, Tire Pressure */}
        <div className="flex flex-col md:flex-row flex-wrap gap-4 flex-grow">
          <div className="flex-1 bg-white p-4 shadow-lg rounded-lg flex flex-col items-center justify-center">
            <TruckStatusChart />
          </div>
          <div className="flex-1 bg-white p-4 shadow-lg rounded-lg flex flex-col items-center justify-center">
            <EngineTemperatureChart />
          </div>
          <div className="flex-1 bg-white p-4 shadow-lg rounded-lg flex flex-col items-center justify-center">
            <TirePressureChart />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MISReport;