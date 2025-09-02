import React from 'react';
import { useNavigate } from 'react-router-dom';

const Demo = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/signupcard');
  };
  return (
    <div className="md:px-14 px-6 py-28 max-w-screen-2xl mx-auto bg-[#2563EB]">
      <h2 className="text-5xl text-white font-bold text-center mb-5">Start Maximizing Your Fleet's Potential</h2>
      <p className="text-lg text-white text-center mb-8">
        Join the growing number of businesses optimizing their logistics with the <br /> telematics solution
      </p>

      {/* Buttons Section */}
      <div className="flex justify-center items-center space-x-6">
        <button
            className="px-8 py-4 bg-white text-brandPrimary font-bold text-lg rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300"
            onClick={handleGetStarted}
        >
        Sign Up for Free
        </button>
        <button
            className="px-8 py-4 bg-[#2563EB] text-white font-bold text-lg border-2 border-white rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:bg-white hover:text-brandPrimary"
            onClick={handleGetStarted}
        >
        Try Free Demo
        </button>
        <button className="px-8 py-4 bg-white text-brandPrimary font-bold text-lg rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300" onClick={() => navigate('/misreports')}>Go to MIS Reports</button>
      </div>
    </div>
  );
};

export default Demo;