import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import banner from '../assets/banner.svg';

const Home = () => {
  const navigate = useNavigate(); // Create navigate function

  const handleGetStarted = () => {
    navigate('/auth/signup'); // Navigate to /auth/signup route
  };

  return (
    <div className="bg-white">
      <div className="max-w-screen-2xl mx-auto pt-24 min-h-screen">
        <div className="flex flex-col md:flex-row-reverse items-center w-full h-full">
          <hr />
          <div className="md:w-1/2 flex justify-end md:flex-shrink-0 mt-5">
            <img src={banner} className="max-w-full h-auto" />
          </div>
          <div className="md:w-1/2 text-center md:text-left md:pl-12 flex-shrink-0">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-brandPrimary leading-tight md:w-5/5">
              Revolutionize Your Fleet <br />
              <span className="inline-block">Operations & Advanced</span><br />
              Telematics
            </h1>
            <p className="text-neutralGrey text-base md:text-lg mb-8 md:w-4/5">
              Real-time tracking, capacity optimization, and seamless logistics management for smarter, more efficient deliveries.
            </p>
            <button
              className="px-8 py-4 bg-neutralDGrey text-white font-bold text-lg transition-all duration-300 rounded-lg shadow-lg hover:shadow-2xl"
              onClick={handleGetStarted} // Attach click handler
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;