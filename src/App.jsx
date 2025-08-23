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
import SignUpDetailsP from './components/auth/postal/SignUpDetailsP';
import SignUpP from './components/auth/postal/SignUpP';
import SignInP from './components/auth/postal/SignInP';
import SignUpDetailsB from './components/auth/business/SignUpDetailsB';
import SignUpB from './components/auth/business/SignUpB';
import SignInB from './components/auth/business/SignInB';
import TrackTruck from './components/Companies/pages/trackTruck';
import TruckReservation from './components/Companies/pages/truckReservation';
import YourTruck from './components/Drivers/pages/yourTruck';
import DriverSurveyForm from './components/Drivers/pages/surveryForm';
import AuthTopNavLayout from './components/Global/AuthTopNavLayout';
import CompanyDetails from './components/Post Department/pages/companyDetails';
import TruckDetails from './components/Post Department/pages/truckDetails';
import DriverList from './components/Post Department/pages/driverList';
import InboxPage from './components/Post Department/pages/inboxPage';
import WareHouse from './components/Post Department/pages/wareHouse';
import SignInCard from './components/auth/SignCard/SignInCard';
import SignUpCard from './components/auth/SignCard/SignUpCard';
import MISReport from './components/misReport/misReports';
import 'leaflet/dist/leaflet.css';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
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
        <Route path="/signincard" element={<SignInCard />} />
        <Route path="/signupcard" element={<SignUpCard />} />
        <Route path="/signintd" element={<SignInTD />} />
        <Route path="/signuptd" element={<SignUpTD />} />
        <Route path="/otppagetd" element={<OtpPageTD />} />
        <Route path="/signupdetailstd" element={<SignUpDetailsTD />} />
        <Route path="/signupp" element={<SignUpP/>} />
        <Route path="/signinp" element={<SignInP />} />
        <Route path="/signupdetailsp" element={<SignUpDetailsP />} />
        <Route path="/signupb" element={<SignUpB />} />
        <Route path="/signinb" element={<SignInB />} />
        {/* Business/company authenticated area - shows TopNav above pages */}
        <Route element={<AuthTopNavLayout options={["Track Your Truck","Truck Reservation"]} />}>
          <Route path="/track-truck" element={<TrackTruck />} />
          <Route path="/truck-reservation" element={<TruckReservation />} />
        </Route>

        {/* Postal department authenticated area */}
        <Route element={<AuthTopNavLayout options={["Company Details","Truck Details","Driver List","Inbox","Warehouse"]} />}>
          <Route path="/company-details" element={<CompanyDetails />} />
          <Route path="/truck-details" element={<TruckDetails />} />
          <Route path="/driver-list" element={<DriverList />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/warehouse" element={<WareHouse />} />
        </Route>

        {/* Driver authenticated area - shows TopNav above pages */}
        <Route element={<AuthTopNavLayout options={["Your Truck","Sentiment Analysis"]} />}>
          <Route path="/your-truck" element={<YourTruck />} />
          <Route path="/analysis" element={<DriverSurveyForm />} />
        </Route>
        <Route path="/signupdetailsb" element={<SignUpDetailsB />} />
        <Route path="/misreports" element={<MISReport />} />
      </Routes>
    </Router>
  );
}

export default App;