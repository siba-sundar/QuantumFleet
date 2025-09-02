import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';

const OtpPageTD = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, sendOTP } = useAuth();

  const { phone, confirmationResult, next, isRegistration, profileData } = location.state || {};

  // Redirect if no confirmation result
  useEffect(() => {
    if (!confirmationResult || !phone) {
      navigate('/auth/driver/signin');
    }
  }, [confirmationResult, phone, navigate]);

  // Countdown for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (value, index) => {
    if (value.length <= 1 && /^[0-9]*$/.test(value)) { 
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Automatically focus next input field
      if (value !== '' && index < otp.length - 1) {
        document.getElementById(`otp-${index + 1}`).focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '') {
        if (index > 0) {
          document.getElementById(`otp-${index - 1}`).focus();
          const newOtp = [...otp];
          newOtp[index - 1] = '';
          setOtp(newOtp);
        }
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyOTP(confirmationResult, otpValue, isRegistration ? profileData : undefined);
      
      if (result.success) {
        if (isRegistration) {
          // For new registrations, start the 3-step signup wizard with personal details
          navigate('/auth/driver/details', {
            state: {
              phone: phone,
              isNewUser: true,
              step: 'personal',
              registrationMethod: 'phone',
              profileData: profileData
            }
          });
        } else {
          // For existing users (sign in), navigate to dashboard
          const targetRoute = next || '/driver/your-truck';
          navigate(targetRoute);
        }
      } else {
        setError(result.message || 'Invalid OTP. Please try again.');
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      }
    } catch (error) {
      setError('An error occurred during verification. Please try again.');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    
    try {
      const result = await sendOTP(phone);
      
      if (result.success) {
        // Update confirmation result for new OTP
        location.state.confirmationResult = result.confirmationResult;
        setResendCooldown(30); // 30 seconds cooldown
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      } else {
        setError(result.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">
          {isRegistration ? 'Complete Registration' : 'Verify Your Phone'}
        </h2>
        <p className="text-gray-600 text-center mb-6">
          We've sent a 6-digit OTP to <span className="font-semibold">{phone}</span>
          {isRegistration && (
            <span className="block text-sm mt-1 text-gray-500">
              Enter the code to complete your driver account registration
            </span>
          )}
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleOTPSubmit}>
          <div className="mb-6">
            <div className="flex justify-center space-x-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  className={`w-12 h-12 text-center text-xl border rounded-md focus:border-black focus:outline-none ${
                    error ? 'border-red-500' : 'border-gray-300'
                  } ${
                    isVerifying ? 'bg-gray-100' : ''
                  }`}
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  disabled={isVerifying}
                  required
                />
              ))}
            </div>
          </div>
          <div className="flex text-center justify-center mb-4">
            <button
              type="submit"
              disabled={isVerifying || otp.join('').length !== 6}
              className={`w-44 px-4 py-2 text-lg font-semibold rounded-full transition-all duration-200 ${
                isVerifying || otp.join('').length !== 6
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white hover:shadow-lg hover:bg-gray-800'
              }`}
            >
              {isVerifying ? 
                (isRegistration ? 'Creating Account...' : 'Verifying...') : 
                (isRegistration ? 'Create Account' : 'Verify OTP')
              }
            </button>
          </div>
          
          <div className="flex text-center justify-center mb-4">
            <button 
              type="button"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0}
              className={`font-semibold ${
                resendCooldown > 0 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/auth/driver/signup')}
              className="text-sm text-gray-600 hover:text-gray-800"
              disabled={isVerifying}
            >
              ← {isRegistration ? 'Back to Registration' : 'Change Phone Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpPageTD;