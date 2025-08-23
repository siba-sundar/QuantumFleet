import React from 'react';
import TopNav from './topNav';
import { Outlet } from 'react-router-dom';

const AuthTopNavLayout = ({ options = ['Your Truck', 'Sentiment Analysis'] }) => {
  return (
    <div>
      <TopNav options={options} />
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthTopNavLayout;
