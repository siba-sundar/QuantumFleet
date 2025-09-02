import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import MyFooter from './components/MyFooter';
import Navbar from './components/Navbar';
import Services from './components/Services';
import RealTime from './components/RealTime';
import Testimonial from './components/Testimonial';
import Demo from './components/Demo';
import HowItWorks from './components/HowItWorks';
import SignInTD from './components/auth/truckerDrivers/SignInTD';
import SignUpTD from './components/auth/truckerDrivers/SignUpTD';
import OtpPageTD from './components/auth/truckerDrivers/OtpPageTD';
import SignUpDetailsTD from './components/auth/truckerDrivers/SignUpDetailsTD';
import EditPersonalDetails from './components/auth/truckerDrivers/EditPersonalDetails';
import DriverProfessionalDetails from './components/auth/truckerDrivers/DriverProfessionalDetails';
import DriverTruckDetails from './components/auth/truckerDrivers/DriverTruckDetails';
import SignUpDetailsP from './components/auth/postal/SignUpDetailsP';
import SignUpP from './components/auth/postal/SignUpP';
import SignInP from './components/auth/postal/SignInP';
import SignUpDetailsB from './components/auth/business/SignUpDetailsB';
import SignUpB from './components/auth/business/SignUpB';
import SignInB from './components/auth/business/SignInB';
import SignInCard from './components/auth/SignCard/SignInCard';
import SignUpCard from './components/auth/SignCard/SignUpCard';
import AuthTopNavLayout from './components/Global/AuthTopNavLayout';

// Route Guards
import BusinessRouteGuard from './components/Business/BusinessRouteGuard';
import PostalRouteGuard from './components/Postal/PostalRouteGuard';
import DriverRouteGuard from './components/Drivers/DriverRouteGuard';

// Business Components
import TrackTruck from './components/Companies/pages/trackTruck';
import TruckReservation from './components/Companies/pages/truckReservation';
import FleetDashboard from './components/tracking/FleetDashboard';
import TrackingManagement from './components/tracking/TrackingManagement';
import MISReport from './components/misReport/misReports';

// Driver Components
import YourTruck from './components/Drivers/pages/yourTruck';
import DriverSurveyForm from './components/Drivers/pages/surveryForm';
import DriverDetailsUpdated from './components/Drivers/DriverDetailsUpdated';

// Post Department Components
import CompanyDetails from './components/Post Department/pages/companyDetails';
import TruckDetails from './components/Post Department/pages/truckDetails';
import DriverList from './components/Post Department/pages/driverList';
import InboxPage from './components/Post Department/pages/inboxPage';
import SuperAdminFleetDashboard from './components/Post Department/pages/fleetDashboard';
import SuperAdminDashboard from './components/Post Department/SuperAdminDashboard';
import WareHouse from './components/Post Department/pages/wareHouse';

// GPS Tracking Components
import DriverTrackingPage from './components/tracking/DriverTrackingPage';

// Dashboard Entry
import DashboardEntry from './components/DashboardEntry';

// Quantum Analysis
import QuantumComponent from "./components/Global/Quantum_routes"

import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route 
          path="/" 
          element={
            <>
              <Navbar />
              <Home />
              <Services />
              <HowItWorks />
              <RealTime />
              <Testimonial />
              <Demo />
              <MyFooter />
            </>
          } 
        />
        
        {/* Authentication Routes */}
        <Route path="/auth/signin" element={<SignInCard />} />
        <Route path="/auth/signup" element={<SignUpCard />} />
        <Route path="/auth/driver/signin" element={<SignInTD />} />
        <Route path="/auth/driver/signup" element={<SignUpTD />} />
        <Route path="/auth/driver/otp" element={<OtpPageTD />} />
        <Route path="/auth/driver/details" element={<SignUpDetailsTD />} />
        <Route path="/auth/driver/personal-details" element={<EditPersonalDetails />} />
        <Route path="/auth/driver/professional-details" element={<DriverProfessionalDetails />} />
        <Route path="/auth/driver/truck-details" element={<DriverTruckDetails />} />
        <Route path="/auth/business/signin" element={<SignInB />} />
        <Route path="/auth/business/signup" element={<SignUpB />} />
        <Route path="/auth/business/details" element={<SignUpDetailsB />} />
        <Route path="/auth/postal/signin" element={<SignInP />} />
        <Route path="/auth/postal/signup" element={<SignUpP />} />
        <Route path="/auth/postal/details" element={<SignUpDetailsP />} />
        
        {/* Dashboard Entry */}
        <Route path="/dashboard" element={<DashboardEntry />} />
        
        {/* Business Dashboard Routes */}
        <Route path="/business" element={<BusinessRouteGuard><AuthTopNavLayout options={["Track Your Truck", "Truck Reservation", "Fleet Dashboard", "GPS Management"]} /></BusinessRouteGuard>}>
          <Route index element={<TrackTruck />} />
          <Route path="track-truck" element={<TrackTruck />} />
          <Route path="truck-reservation" element={<TruckReservation />} />
          <Route path="fleet-dashboard" element={<FleetDashboard />} />
          <Route path="gps-management" element={<TrackingManagement />} />
        </Route>
        
        {/* Super Admin Dashboard Routes */}
        <Route path="/postal" element={<PostalRouteGuard><SuperAdminDashboard options={["Company Details", "Truck Details", "Driver List", "Inbox", "Fleet Dashboard", "Quantum Route"]} /></PostalRouteGuard>}>
          <Route index element={<CompanyDetails />} />
          <Route path="company-details" element={<CompanyDetails />} />
          <Route path="truck-details" element={<TruckDetails />} />
          <Route path="driver-list" element={<DriverList />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="fleet-dashboard" element={<SuperAdminFleetDashboard />} />
          <Route path="quantum-route" element={<QuantumComponent/>}/>
        </Route>
        
        {/* Driver Dashboard Routes */}
        <Route path="/driver" element={<DriverRouteGuard><AuthTopNavLayout options={["Your Truck", "Sentiment Analysis", "Driver Details"]} /></DriverRouteGuard>}>
          <Route index element={<YourTruck />} />
          <Route path="your-truck" element={<YourTruck />} />
          <Route path="sentiment-analysis" element={<DriverSurveyForm />} />
          <Route path="driver-details" element={<DriverDetailsUpdated />} />
        </Route>
        
        {/* Public GPS Tracking */}
        <Route path="/track/:sessionId" element={<DriverTrackingPage />} />
        
        {/* Legacy route redirects for backward compatibility */}
        <Route path="/signincard" element={<SignInCard />} />
        <Route path="/signupcard" element={<SignUpCard />} />
        <Route path="/signintd" element={<SignInTD />} />
        <Route path="/signuptd" element={<SignUpTD />} />
        <Route path="/otppagetd" element={<OtpPageTD />} />
        <Route path="/signupdetailstd" element={<SignUpDetailsTD />} />
        <Route path="/signinb" element={<SignInB />} />
        <Route path="/signupb" element={<SignUpB />} />
        <Route path="/signupdetailsb" element={<SignUpDetailsB />} />
        <Route path="/signinp" element={<SignInP />} />
        <Route path="/signupp" element={<SignUpP />} />
        <Route path="/signupdetailsp" element={<SignUpDetailsP />} />
        <Route path="/your-truck" element={<YourTruck />} />
        <Route path="/analysis" element={<DriverSurveyForm />} />
        <Route path="/driver/driver-details" element={<DriverDetailsUpdated />} />
      </Routes>
    </Router>
  );
}

export default App;