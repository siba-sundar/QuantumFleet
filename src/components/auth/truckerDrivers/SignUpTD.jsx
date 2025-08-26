import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';

const SignUpTD = () => {
  const navigate = useNavigate();
  const { sendOTP, registerWithEmail, loading, error, clearError } = useAuth();
  
  // Form state
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // UI state
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Clear errors when inputs change
  useEffect(() => {
    if (error || formError) {
      clearError();
      setFormError('');
    }
  }, [phone, email, password, confirmPassword, firstName, lastName]);

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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUpTD = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (password !== confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setFormError('Password should be at least 6 characters');
      return;
    }

    if (!firstName.trim()) {
      setFormError('First name is required');
      return;
    }

    setIsLoading(true);
    
    try {
      if (authMethod === 'phone') {
        // Validate phone number
        if (!validatePhoneNumber(phone)) {
          setFormError('Please enter a valid 10-digit Indian mobile number');
          setIsLoading(false);
          return;
        }

        const result = await sendOTP(phone);
        
        if (result.success) {
          // Navigate to OTP page with profile data for registration after verification
          navigate('/otppagetd', { 
            state: { 
              phone: result.phoneNumber || phone,
              confirmationResult: result.confirmationResult,
              next: '/signupdetailstd',
              isRegistration: true,
              profileData: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                password // Note: For phone auth, password might be stored for profile
              }
            } 
          });
        } else {
          setFormError(result.message || 'Failed to send OTP. Try email method below.');
        }
      } else {
        // Email registration
        if (!validateEmail(email)) {
          setFormError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        const profileData = {
          firstName: firstName.trim(),
          lastName: lastName.trim()
        };

        const result = await registerWithEmail(email, password, 'driver', profileData);
        
        if (result.success) {
          // Navigate to sign-up details page or success page
          navigate('/signupdetailstd', {
            state: {
              registrationMethod: 'email',
              userId: result.user.uid
            }
          });
        } else {
          setFormError(result.message || 'Email registration failed');
        }
      }
    } catch (error) {
      setFormError(authMethod === 'phone' ? 
        'SMS billing not enabled. Please use email method or enable Firebase billing.' : 
        'An error occurred during registration'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Create Driver Account</h2>
        
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
              Phone Registration
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
              Email Registration
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
        
        {/* Error display */}
        {(error || formError) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error || formError}
          </div>
        )}
        
        <form onSubmit={handleSignUpTD}>
          {/* Name fields - always shown */}
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">First Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">Last Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          
          {/* Conditional fields based on auth method */}
          {authMethod === 'phone' ? (
            <div className="mb-4">
              <label className="block text-black mb-2 font-semibold">Phone Number</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-black mb-2 font-semibold">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
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
              disabled={isLoading || loading}
              className={`w-44 px-4 py-2 text-lg font-semibold rounded-full hover:shadow-lg ${
                isLoading || loading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white'
              }`}
            >
              {isLoading || loading ? 'Creating...' : 
               authMethod === 'phone' ? 'Send OTP' : 'Create Account'
              }
            </button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signintd')}
                className="text-black font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpTD;
