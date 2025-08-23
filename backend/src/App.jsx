import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import AddTruck from './components/AddTruck';
import AddRoute from './components/AddRoute';
import UpdateLoadUnload from './components/UpdateLoadUnload';
import ReportDelay from './components/ReportDelay';
import ReportDetour from './components/ReportDetour';
import BookThirdPartyCapacity from './components/BookThirdPartyCapacity';
import UpdateSchedule from './components/UpdateSchedule';
import UpdateGPSStatus from './components/UpdateGPSStatus';
import GetTruckInfo from './components/GetTruckInfo';
import GetRouteInfo from './components/GetRouteInfo';

function App() {
  return (
    <Router>
      <div className="container mx-auto">
        <MainMenu />
        <div className="mt-8">
          <Routes>
            <Route path="/" element={<h2 className="text-2xl font-bold">Welcome to RTN Supply Chain Management</h2>} />
            <Route path="/add-truck" element={<AddTruck />} />
            <Route path="/add-route" element={<AddRoute />} />
            <Route path="/update-load-unload" element={<UpdateLoadUnload />} />
            <Route path="/report-delay" element={<ReportDelay />} />
            <Route path="/report-detour" element={<ReportDetour />} />
            <Route path="/book-third-party-capacity" element={<BookThirdPartyCapacity />} />
            <Route path="/update-schedule" element={<UpdateSchedule />} />
            <Route path="/update-gps-status" element={<UpdateGPSStatus />} />
            <Route path="/get-truck-info" element={<GetTruckInfo />} />
            <Route path="/get-route-info" element={<GetRouteInfo />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;