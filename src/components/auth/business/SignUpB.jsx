import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUpB = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSignUp = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    navigate('/signupdetailsb');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-8">Create Account</h2>
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">Email Id</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your Email Id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-black mb-2 font-semibold">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex text-center justify-center mb-2">
            <button
              type="submit"
              className="w-44 bg-black text-white px-4 py-2 text-lg font-semibold rounded-full hover:shadow-lg"
              
            >
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpB;