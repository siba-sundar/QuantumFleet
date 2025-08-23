import React from 'react';
import Dashboard from '../assets/Dashboard Demo.svg';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const RealTime = () => {
  const navigate = useNavigate(); // Create navigate function

  const TryYourself = () => {
    navigate('/signupcard'); // Navigate to /signupcard route
  };
  return (
    <div className="md:px-14 px-6 py-14 max-w-screen-2xl mx-auto">
      <h2 className="text-5xl text-brandPrimary font-bold text-center mb-5">
        See How It Works in Real Time
      </h2>
      <p className="text-lg text-brandPrimary text-center mb-8">
        Experience the intuitive dashboard that gives you complete control of your fleet.
      </p>
      <div className="relative flex justify-center items-center">
        <img
          src={Dashboard}
          className="w-full h-auto object-cover px-8 py-8 border-2 rounded-lg border-brandPrimary"
        />

        {/* Button on the image */}
        <button
          className="absolute bottom-4 right-4 px-8 py-4 bg-brandPrimary text-white font-bold text-lg transition-all duration-300 rounded-lg shadow-lg hover:shadow-2xl flex items-center"
          onClick={TryYourself}
        >
          Try Yourself
          <span className="ml-2 inline-block animate-pointing">
            →
          </span>
        </button>
      </div>
    </div>
  );
};

export default RealTime;