import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthTopNavLayout from '../Global/AuthTopNavLayout';

// Postal Department Components
import CompanyDetails from '../Post Department/pages/companyDetails';
import TruckDetails from '../Post Department/pages/truckDetails';
import DriverList from '../Post Department/pages/driverList';
import InboxPage from '../Post Department/pages/inboxPage';
import WareHouse from '../Post Department/pages/wareHouse';
import FleetDashboard from '../tracking/FleetDashboard';
import MISReport from '../misReport/misReports';

const PostalLayout = () => {
  return (
    <AuthTopNavLayout options={["Company Details", "Truck Details", "Driver List", "Inbox", "Warehouse", "Fleet Dashboard", "MIS Reports"]}>
      <Routes>
        <Route index element={<Navigate to="company-details" replace />} />
        <Route path="company-details" element={<CompanyDetails />} />
        <Route path="truck-details" element={<TruckDetails />} />
        <Route path="driver-list" element={<DriverList />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="warehouse" element={<WareHouse />} />
        <Route path="fleet-dashboard" element={<FleetDashboard />} />
        <Route path="mis-reports" element={<MISReport />} />
      </Routes>
    </AuthTopNavLayout>
  );
};

export default PostalLayout;