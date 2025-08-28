import React, { useState, useEffect } from 'react';
import SideBar from "../../Global/sideBar.jsx";

const FleetDashboard = () => {
  // Mock data for fleet statistics
  const [fleetStats, setFleetStats] = useState({
    totalTrucks: 124,
    activeTrucks: 98,
    maintenanceTrucks: 12,
    inactiveTrucks: 14,
    totalDrivers: 87,
    activeDrivers: 76,
    onLeaveDrivers: 11,
    totalCompanies: 23,
    activeCompanies: 21,
    pendingCompanies: 2
  });

  // Mock data for recent activities
  const [recentActivities, setRecentActivities] = useState([
    { id: 1, action: 'Truck Booked', description: 'Truck MH12AB1234 booked by TechSoft Solutions', time: '2 hours ago', type: 'booking' },
    { id: 2, action: 'Maintenance Due', description: 'Truck RJ10C7890 requires maintenance', time: '4 hours ago', type: 'maintenance' },
    { id: 3, action: 'Delivery Completed', description: 'Delivery D45678 completed by Shyam Lal', time: '5 hours ago', type: 'delivery' },
    { id: 4, action: 'New Driver Registered', description: 'Driver Kumar Patel registered', time: '1 day ago', type: 'registration' },
    { id: 5, action: 'Company Approved', description: 'BrightSpark Technologies approved', time: '1 day ago', type: 'approval' }
  ]);

  // Mock data for performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState([
    { name: 'On-Time Deliveries', value: 94, color: 'bg-green-500' },
    { name: 'Driver Satisfaction', value: 87, color: 'bg-blue-500' },
    { name: 'Fleet Utilization', value: 78, color: 'bg-purple-500' },
    { name: 'Maintenance Compliance', value: 91, color: 'bg-yellow-500' }
  ]);

  return (
    <div className="grid grid-cols-[20%_80%] min-h-screen">
      {/* Sidebar */}
      <div className="bg-gray-100">
        <SideBar 
          trucks={[
            { id: 1, driver: "Fleet Overview", number: "Dashboard", status: "Active" },
            { id: 2, driver: "Truck Analytics", number: "Statistics", status: "Active" },
            { id: 3, driver: "Driver Performance", number: "Metrics", status: "Active" }
          ]} 
          selectedId={1} 
          onSelect={() => {}} 
        />
      </div>

      {/* Main Content */}
      <div className="p-6 bg-gray-50">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Fleet Dashboard</h1>
          <p className="text-gray-600">Overview of your fleet operations and performance metrics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Trucks</h3>
            <p className="text-3xl font-bold text-blue-600">{fleetStats.totalTrucks}</p>
            <div className="mt-2 text-sm">
              <span className="text-green-600">↑ 5%</span> from last month
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Trucks</h3>
            <p className="text-3xl font-bold text-green-600">{fleetStats.activeTrucks}</p>
            <div className="mt-2 text-sm">
              <span className="text-green-600">↑ 2%</span> from last month
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Drivers</h3>
            <p className="text-3xl font-bold text-purple-600">{fleetStats.totalDrivers}</p>
            <div className="mt-2 text-sm">
              <span className="text-green-600">↑ 3%</span> from last month
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Companies</h3>
            <p className="text-3xl font-bold text-orange-600">{fleetStats.activeCompanies}</p>
            <div className="mt-2 text-sm">
              <span className="text-red-600">↓ 1%</span> from last month
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              {performanceMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700">{metric.name}</span>
                    <span className="font-medium">{metric.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${metric.color}`} 
                      style={{ width: `${metric.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Fleet Status</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Active Trucks</span>
                  <span className="font-medium">{fleetStats.activeTrucks}/{fleetStats.totalTrucks}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full bg-green-600" 
                    style={{ width: `${(fleetStats.activeTrucks/fleetStats.totalTrucks)*100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Maintenance</span>
                  <span className="font-medium">{fleetStats.maintenanceTrucks}/{fleetStats.totalTrucks}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full bg-yellow-500" 
                    style={{ width: `${(fleetStats.maintenanceTrucks/fleetStats.totalTrucks)*100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Inactive</span>
                  <span className="font-medium">{fleetStats.inactiveTrucks}/{fleetStats.totalTrucks}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full bg-red-500" 
                    style={{ width: `${(fleetStats.inactiveTrucks/fleetStats.totalTrucks)*100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{activity.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activity.type === 'booking' ? 'bg-blue-100 text-blue-800' :
                        activity.type === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        activity.type === 'delivery' ? 'bg-green-100 text-green-800' :
                        activity.type === 'registration' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;