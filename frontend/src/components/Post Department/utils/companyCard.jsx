import React from 'react';

import companyImg from "../../../assets/company-logo.svg"; // Replace with the actual path to your company logo

// CompanyDetails Component
const CompanyDetails = ({ companyDetails }) => {
  return (
    <div className="w-full flex gap-6 mt-4 h-[40vh] ml-4 bg-[#020073] p-5 rounded-lg shadow-lg transition duration-300">
      {/* Company personal information */}
      <div className="flex flex-col">
        <p className='text-white text-xl font-semibold'>Company Information</p>

        <div className='flex gap-2 items-center mt-3'> 
          <img
            src={ companyImg} // Use the image provided in companyDetails or fallback to default
            alt="Company Logo"
            className="w-16 h-16 rounded-full"
          />
          <div className="ml-2">
            <p className="font-bold text-white">Company Name: {companyDetails.companyName}</p>
            <p className="text-gray-300 text-sm">Email: {companyDetails.companyEmail}</p>
            <p className="text-gray-300 text-sm">Contact Number: {companyDetails.companyNumber}</p>
            <p className="text-gray-300 text-sm">Address: {companyDetails.companyAddress}</p>
          </div>
        </div>
      </div>

      {/* Additional company details */}
      <div className="flex flex-col gap-3 ">
        <div>
          <p className="font-semibold text-white text-sm">Company Status</p>
          <p className="text-white text-4xl font-bold">{companyDetails.companyStatus}</p>
        </div>

        <div>
          <p className="font-semibold text-white text-sm">Years in Operation</p>
          <p className="text-white text-4xl font-bold">{companyDetails.yearsInOperation} Years</p>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;
