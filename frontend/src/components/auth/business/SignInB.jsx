import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';

const SignInB = () => {
  const navigate = useNavigate();
  const { signInWithEmail, loading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!formData.email.trim() || !formData.password) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await signInWithEmail(formData.email.trim(), formData.password);
      
      if (result.success) {
        // Check if user type is business
        if (result.user.userType === 'business') {
          navigate('/business/track-truck');
        } else {
          clearError();
          alert('This account is not registered as a business account.');
        }
      }
      // Error handling is managed by the useAuth hook
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      alert('Please enter your email address first');
      return;
    }
    
    // This could be implemented to send password reset email
    navigate('/', { state: { email: formData.email } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-8">Business Sign In</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-black mb-2 font-semibold">Email Address</label>
            <input
              type="email"
              name="email"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                error ? 'border-red-500' : ''
              }`}
              placeholder="Enter your business email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isSubmitting || loading}
              required
            />
          </div>
          <div className="mb-2">
            <label className="block text-black mb-2 font-semibold">Password</label>
            <input
              type="password"
              name="password"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                error ? 'border-red-500' : ''
              }`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              disabled={isSubmitting || loading}
              required
            />
          </div>
          <div className="flex text-center justify-between mb-6">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                className="mr-2 rounded-md" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting || loading}
              />
              <h3 className="font-semibold">Remember me</h3>
            </div>
            <button
              type="button"
              className="font-semibold text-blue-600 hover:text-blue-800"
              onClick={handleForgotPassword}
              disabled={isSubmitting || loading}
            >
              Forgot Password?
            </button>
          </div>
          <div className="flex text-center justify-center mb-2">
            <button
              type="submit"
              disabled={isSubmitting || loading || !formData.email.trim() || !formData.password}
              className={`w-44 px-4 py-2 text-lg font-semibold rounded-full transition-all duration-200 ${
                isSubmitting || loading || !formData.email.trim() || !formData.password
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white hover:shadow-lg hover:bg-gray-800'
              }`}
            >
              {isSubmitting || loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
          <div className="flex gap-2 text-center justify-center">
            <h4>New Business?</h4>
            <button
              type="button"
              className="font-semibold text-blue-600 hover:text-blue-800"
              onClick={() => navigate('/auth/business/signup')}
              disabled={isSubmitting || loading}
            >
              Register Here
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={() => navigate('/')}
              disabled={isSubmitting || loading}
            >
              ← Back to Home
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInB;