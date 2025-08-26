import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';

const SignUpP = () => {
  const navigate = useNavigate();
  const { registerWithEmail, loading, error, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Clear errors when inputs change
  useEffect(() => {
    if (error || formError) {
      clearError();
      setFormError('');
    }
  }, [email, password, confirmPassword]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async (e) => {
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

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      // Create Firebase account for postal user
      const result = await registerWithEmail(email, password, 'postal', {
        email: email
      });
      
      if (result.success) {
        // Navigate to postal details page with user ID
        navigate('/signupdetailsp', {
          state: {
            email: email,
            userId: result.user.uid,
            registrationMethod: 'email'
          }
        });
      } else {
        setFormError(result.message || 'Registration failed');
      }
    } catch (error) {
      setFormError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Create Postal Account</h2>
        
        {/* Error display */}
        {(error || formError) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error || formError}
          </div>
        )}
        
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">Email Id</label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your Email Id"
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
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || loading}
              minLength="6"
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
              disabled={isLoading || loading}
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
              {isLoading || loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signinp')}
                className="text-black font-semibold hover:underline"
                disabled={isLoading || loading}
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

export default SignUpP;