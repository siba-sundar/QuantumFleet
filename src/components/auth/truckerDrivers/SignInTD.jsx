import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignInTD = () => {
  const navigate = useNavigate(); // Hook to programmatically navigate
  const [phone, setPhone] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent default form submission
    // For truck drivers we use OTP flow: navigate to OTP page and pass phone + next route
    navigate('/otppagetd', { state: { phone, next: '/your-truck' } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-8">Sign In</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">Phone Number</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required // Adds the required attribute
            />
          </div>
          <div className="mb-2">
            <label className="block text-black mb-2 font-semibold">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your password"
              required // Adds the required attribute
            />
          </div>
          <div className="flex text-center justify-between mb-6">
            <div className="flex items-center">
              <input type="checkbox" className="mr-2 rounded-md" />
              <h3 className="font-semibold">Remember me</h3>
            </div>
            {/* Navigate to landing page when Forgot Password is clicked */}
            <button
              type="button"
              className="font-semibold"
              onClick={() => navigate('/')}
            >
              Forgot Password?
            </button>
          </div>

          <div className="flex text-center justify-center mb-2">
            {/* Navigate to landing page on Sign In */}
            <button
              type="submit"
              className="w-44 bg-black text-white px-4 py-2 text-lg font-semibold rounded-full hover:shadow-lg"
            >
              Sign In
            </button>
          </div>
          <div className="flex gap-2 text-center justify-center ">
            <h4>Not Registered Yet?</h4>
            {/* Navigate to trucker signup on Sign Up */}
            <button
              type="button"
              className="font-semibold"
              onClick={() => navigate('/signuptd')}
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInTD;