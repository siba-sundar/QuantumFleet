import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../Global/topNav.jsx';

const SuperAdminDashboard = ({ options }) => {
  return (
    <div>
      <TopNav options={options} />
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;