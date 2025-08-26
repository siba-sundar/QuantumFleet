import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthTopNavLayout from '../Global/AuthTopNavLayout';

// Business Components
import TrackTruck from '../Companies/pages/trackTruck';
import TruckReservation from '../Companies/pages/truckReservation';
import FleetDashboard from '../tracking/FleetDashboard';
import TrackingManagement from '../tracking/TrackingManagement';
import MISReport from '../misReport/misReports';

const BusinessLayout = () => {
  return (
    <AuthTopNavLayout options={["Track Your Truck", "Truck Reservation", "Fleet Dashboard", "GPS Management", "MIS Reports"]}>
      <Routes>
        <Route index element={<Navigate to="track-truck" replace />} />
        <Route path="track-truck" element={<TrackTruck />} />
        <Route path="truck-reservation" element={<TruckReservation />} />
        <Route path="fleet-dashboard" element={<FleetDashboard />} />
        <Route path="gps-management" element={<TrackingManagement />} />
        <Route path="mis-reports" element={<MISReport />} />
      </Routes>
    </AuthTopNavLayout>
  );
};

export default BusinessLayout;