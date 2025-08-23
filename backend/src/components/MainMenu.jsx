import React from 'react';
import { NavLink } from 'react-router-dom';
import { ConnectWallet } from "@thirdweb-dev/react";

function MainMenu() {
  return (
    <div className="p-4 bg-gray-100 shadow-md">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">RTN Supply Chain Management</h1>
      <ConnectWallet />
      <nav className="mt-4">
        <ul className="space-y-2">
          <li><NavLink to="/add-truck" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Add Truck</NavLink></li>
          <li><NavLink to="/add-route" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Add Route</NavLink></li>
          <li><NavLink to="/update-load-unload" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Update Load/Unload</NavLink></li>
          <li><NavLink to="/report-delay" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Report Delay</NavLink></li>
          <li><NavLink to="/report-detour" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Report Detour</NavLink></li>
          <li><NavLink to="/book-third-party-capacity" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Book Third-Party Capacity</NavLink></li>
          <li><NavLink to="/update-schedule" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Update Schedule</NavLink></li>
          <li><NavLink to="/update-gps-status" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Update GPS Status</NavLink></li>
          <li><NavLink to="/get-truck-info" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Get Truck Info</NavLink></li>
          <li><NavLink to="/get-route-info" className={({ isActive }) => isActive ? "text-blue-700 font-bold" : "text-blue-500 hover:underline"}>Get Route Info</NavLink></li>
        </ul>
      </nav>
    </div>
  );
}

export default MainMenu;