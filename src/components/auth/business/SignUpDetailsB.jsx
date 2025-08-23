import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUpDetailsB = () => {
  const [addressYears, setAddressYears] = useState(false);
  const [otherName, setOtherName] = useState(false);
  const navigate = useNavigate();

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    alert('Details submitted successfully');
    navigate('/'); // Redirect after successful submission
  };

  const handleSignIn = () => {
    navigate('/signinb'); // Navigate to the Sign In page when the button is clicked
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      <h1 className="text-3xl font-bold text-center mb-4">Enter Details</h1> {/* Heading placed above */}
      
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-8">General Information</h2>
        <hr className="bg-black border-2 border-black mb-8" />
        <form onSubmit={handleDetailsSubmit}>
          {/* Full Name */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Full Name *</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="First Name" required />
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Middle Name" />
              <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Last Name" required />
            </div>
          </div>

          {/* Address */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Address *</h3>
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

          {/* Were you at this address for 3 years or more? */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Were you at this address for 3 years or more? *</h3>
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

          {/* Previous Address (Conditional) */}
          {!addressYears && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg">Previous Address (Last 3 Years) *</h3>
              <div className="mb-4">
                <textarea
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Enter previous addresses"
                  required
                ></textarea>
              </div>
            </div>
          )}

          {/* Date of Birth */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Date of Birth *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="date" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>

          {/* Have you ever been known by any other name? */}
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

          {/* Business Details Section */}
          <h2 className="text-2xl font-bold text-center mb-8">Business Details</h2>
          <hr className="bg-black border-2 border-black mb-8" />

          {/* Firm Name */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Firm Name *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>

          {/* Firm Phone Number */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Firm Phone Number *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>

          {/* Firm Address */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Firm Address *</h3>
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

          {/* Type of Business */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Type of Business *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>

          {/* PAN for Business */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">PAN for Business *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>

          {/* Enter Your Postal Office Branch Name */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg">Enter Your Postal Office Branch Name *</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <input type="text" className="px-4 py-2 border rounded-lg" required />
            </div>
          </div>

          {/* Buttons */}
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

export default SignUpDetailsB;