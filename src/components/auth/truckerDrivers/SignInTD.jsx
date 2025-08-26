import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';
import { useDrivers } from '../../../hooks/useFirestore.js';

const SignInTD = () => {
  const navigate = useNavigate();
  const { sendOTP, signInWithEmail, loading, error, clearError } = useAuth();
  const { findByUserId } = useDrivers();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  
  // Clear errors when inputs change
  useEffect(() => {
    if (error || phoneError) {
      clearError();
      setPhoneError('');
    }
  }, [phone, email, password]);

  const validatePhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Indian mobile number
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return true;
    } else if (cleaned.length === 12 && cleaned.startsWith('91') && /^91[6-9]/.test(cleaned)) {
      return true;
    }
    return false;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    setIsLoading(true);
    
    try {
      if (authMethod === 'phone') {
        // Validate phone number
        if (!validatePhoneNumber(phone)) {
          setPhoneError('Please enter a valid 10-digit Indian mobile number');
          setIsLoading(false);
          return;
        }

        const result = await sendOTP(phone);
        
        if (result.success) {
          // Navigate to OTP page with confirmation result and phone number
          navigate('/otppagetd', { 
            state: { 
              phone: result.phoneNumber || phone,
              confirmationResult: result.confirmationResult,
              next: '/driver/your-truck'
            } 
          });
        } else {
          setPhoneError(result.message || 'Failed to send OTP. Try email method below.');
        }
      } else {
        // Email authentication
        if (!email || !password) {
          setPhoneError('Please enter both email and password');
          setIsLoading(false);
          return;
        }

        const result = await signInWithEmail(email, password);
        
        if (result.success) {
          // Check if user is a driver
          if (result.user.userType === 'driver') {
            // Check if professional details are complete
            const profileResult = await findByUserId(result.user.uid);
            if (profileResult.success && profileResult.data?.professionalInfo?.employeeId) {
              // Professional details exist, go to dashboard
              navigate('/driver/your-truck');
            } else {
              // Professional details missing, redirect to professional details form
              navigate('/auth/driver/professional-details', {
                state: {
                  phone: result.user.phoneNumber,
                  isNewUser: false
                }
              });
            }
          } else {
            setPhoneError('This account is not registered as a driver account.');
          }
        } else {
          setPhoneError(result.message || 'Email sign-in failed');
        }
      }
    } catch (error) {
      setPhoneError(authMethod === 'phone' ? 
        'SMS billing not enabled. Please use email method or enable Firebase billing.' : 
        'An error occurred during sign-in'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Driver Sign In</h2>
        
        {/* Authentication method toggle */}
        <div className="mb-6">
          <div className="flex justify-center space-x-4 mb-4">
            <button
              type="button"
              onClick={() => setAuthMethod('phone')}
              className={`px-4 py-2 rounded-lg font-medium ${
                authMethod === 'phone'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Phone OTP
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`px-4 py-2 rounded-lg font-medium ${
                authMethod === 'email'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Email Login
            </button>
          </div>
          {authMethod === 'phone' && (
            <p className="text-center text-sm text-orange-600 bg-orange-50 p-2 rounded">
              ⚠️ SMS requires Firebase billing. Use email method if you encounter billing errors.
            </p>
          )}
        </div>
        
        {/* reCAPTCHA container - hidden but required for Firebase phone auth */}
        <div id="recaptcha-container" style={{ display: 'none' }}></div>
        <form onSubmit={handleSubmit}>
          {authMethod === 'phone' ? (
            // Phone number authentication
            <div className="mb-4">
              <label className="block text-black mb-2 font-semibold">Phone Number</label>
              <input
                type="tel"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                  phoneError || error ? 'border-red-500' : ''
                }`}
                placeholder="Enter your 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading || loading}
                required
              />
              {(phoneError || error) && (
                <p className="text-red-500 text-sm mt-1">{phoneError || error}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">We'll send you an OTP to verify your number</p>
            </div>
          ) : (
            // Email authentication
            <>
              <div className="mb-4">
                <label className="block text-black mb-2 font-semibold">Email</label>
                <input
                  type="email"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                    phoneError || error ? 'border-red-500' : ''
                  }`}
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || loading}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-black mb-2 font-semibold">Password</label>
                <input
                  type="password"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                    phoneError || error ? 'border-red-500' : ''
                  }`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || loading}
                  required
                />
              </div>
              {(phoneError || error) && (
                <p className="text-red-500 text-sm mt-1 mb-4">{phoneError || error}</p>
              )}
            </>
          )}

          <div className="flex text-center justify-center mb-2">
            <button
              type="submit"
              disabled={isLoading || loading || (authMethod === 'phone' && !phone.trim()) || (authMethod === 'email' && (!email.trim() || !password.trim()))}
              className={`w-44 px-4 py-2 text-lg font-semibold rounded-full transition-all duration-200 ${
                isLoading || loading || (authMethod === 'phone' && !phone.trim()) || (authMethod === 'email' && (!email.trim() || !password.trim()))
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white hover:shadow-lg hover:bg-gray-800'
              }`}
            >
              {isLoading || loading ? 
                (authMethod === 'phone' ? 'Sending OTP...' : 'Signing In...') :
                (authMethod === 'phone' ? 'Send OTP' : 'Sign In')
              }
            </button>
          </div>
          <div className="flex gap-2 text-center justify-center">
            <h4>New Driver?</h4>
            <button
              type="button"
              className="font-semibold text-blue-600 hover:text-blue-800"
              onClick={() => navigate('/signuptd')}
              disabled={isLoading || loading}
            >
              Register Here
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInTD;