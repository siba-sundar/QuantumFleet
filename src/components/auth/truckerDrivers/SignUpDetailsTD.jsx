import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SignUpDetailsTD = () => {
  const [addressYears, setAddressYears] = useState(false);
  const [otherName, setOtherName] = useState(false);
  const [validLicense, setValidLicense] = useState(false);
  const [military, setMilitary] = useState(false);
  const [truckSchool, setTruckSchool] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDetailsSubmitTD = (e) => {
    e.preventDefault();
    alert('Details submitted successfully');
  navigate('/your-truck');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      <h1 className="text-3xl font-bold text-center mb-4">Enter Details</h1>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-8">General Information</h2>
        <hr className="bg-black border-2 border-black mb-8" />
        <form onSubmit={handleDetailsSubmitTD}>
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Full Name</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="First Name" required />
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Middle Name" />
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Last Name" required />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Address</h3>
            <div className="mb-4">
              <input type="text" className="w-full px-4 py-2 border rounded-lg mb-2" placeholder="Street Address" required />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <input type="text" className="px-4 py-2 border rounded-lg" placeholder="City" required />
                <input type="text" className="px-4 py-2 border rounded-lg" placeholder="State" required />
                <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Zip Code" required />
              </div>
              <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="Country" required />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Were you at this address for 3 years or more?</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="addressYears"
                    checked={addressYears}
                    onChange={() => setAddressYears(true)}
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="addressYears"
                    checked={!addressYears}
                    onChange={() => setAddressYears(false)}
                  />
                  No
                </label>
              </div>
            </div>
          </div>
          {!addressYears && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg">Please list prior 3 years addresses here</h3>
              <div className="mb-4">
                <textarea
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Previous Addresses"
                  required
                ></textarea>
              </div>
            </div>
          )}

          <div className="mb-14">
            <h3 className="font-semibold text-lg">Date of Birth</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="date" className="px-4 py-2 border rounded-lg" placeholder="Date of Birth" required />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-8">License Details</h2>
          <hr className="bg-black border-2 border-black mb-8" />
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Have you held a VALID INDIAN license for the past 36 months? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="valid"
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="valid"
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">License Number *</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg">State of Issue *</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg">License expiration date *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="date" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Were you ever in the military? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="military"
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="military"
                  />
                  No
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Have you been to truck driving school?</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="driving"
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="driving"
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          <div className="flex text-center justify-center">
            <button
              type="submit"
              className="w-44 bg-black text-white px-4 py-2 text-lg font-semibold rounded-full hover:shadow-lg mb-2"
            >
              Sign Up
            </button>
          </div>

          <div className="flex gap-2 text-center justify-center ">
            <h4>Already have an Account?</h4>
            <button className="font-semibold">Sign In</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpDetailsTD;