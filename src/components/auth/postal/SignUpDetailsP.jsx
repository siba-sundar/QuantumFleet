import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUpDetailsP = () => {
  const [addressYears, setAddressYears] = useState(false);
  const [otherName, setOtherName] = useState(false);
  const navigate = useNavigate();

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    alert('Details submitted successfully');
    navigate('/'); // Navigate to landing page on Sign Up
  };

  const handleSignIn = () => {
    navigate('/signinp'); // Navigate to landing page on Sign In
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      <h1 className="text-3xl font-bold text-center mb-4">Enter Details</h1>

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-8">General Information</h2>
        <hr className="bg-black border-2 border-black mb-8" />
        <form onSubmit={handleDetailsSubmit}>
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

          {/* Conditional Field for previous addresses */}
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

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Date of Birth</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="date" className="px-4 py-2 border rounded-lg" placeholder="Date of Birth" required />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Have you ever been known by any other name? *</h3>
            <div className="mb-4">
              <div className="flex space-x-4">
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="otherName"
                    checked={otherName}
                    onChange={() => setOtherName(true)} // Set to 'true' for "Yes"
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    className="mr-2"
                    name="otherName"
                    checked={!otherName}
                    onChange={() => setOtherName(false)} // Set to 'false' for "No"
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          {/* Show field for entering other names only if 'Yes' is selected */}
          {otherName && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg">Enter the Other Names</h3>
              <div className="mb-4">
                <input
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Other Names"
                  required
                />
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-center mb-8">Postal Details</h2>
          <hr className="bg-black border-2 border-black mb-8" />

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Your Designation *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Designation" required />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Your Employee ID *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Employee ID" required />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Post Office Pin Code *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Postal Office Pin Code" required />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Your Postal Office Branch Name *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input
                type="text"
                className="px-4 py-2 border rounded-lg w-full" // Full-width for Postal Branch Name
                placeholder="Postal Office Branch Name"
                required
              />
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
            <button className="font-semibold" onClick={handleSignIn}>
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpDetailsP;