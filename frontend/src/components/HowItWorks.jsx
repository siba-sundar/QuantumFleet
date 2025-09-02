import React from 'react';
import Group from '/src/assets/Group 5.svg'; // Ensure you have the correct path

const HowItWorks = () => {
  return (
    <div className="md:px-14 px-6 py-14 max-w-screen-2xl mx-auto">
      <h2 className="text-5xl text-brandPrimary font-bold text-center mb-5">How It Works</h2>
      
      {/* Hero Section with the image */}
      <div className="flex justify-center items-center">
        <img src={Group} className="w-full h-auto max-h-[600px] object-contain px-10 py-10" />
      </div>
    </div>
  );
};

export default HowItWorks;