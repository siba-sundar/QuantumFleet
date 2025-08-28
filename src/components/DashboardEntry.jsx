import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Building2, Mail, Truck } from 'lucide-react';

const DashboardEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect user based on their type
  React.useEffect(() => {
    if (user) {
      switch (user.userType) {
        case 'business':
          navigate('/business/track-truck');
          break;
        case 'postal':
          navigate('/postal/company-details');
          break;
        case 'driver':
          navigate('/driver/your-truck');
          break;
        default:
          // If user type is not recognized, stay on dashboard entry
          break;
      }
    }
  }, [user, navigate]);

  // If user is already authenticated, don't show the dashboard entry
  if (user) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">IndiFleet Dashboard</h1>
          <p className="text-xl text-gray-600">Choose your dashboard type to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Business Dashboard */}
          <div 
            onClick={() => navigate('/auth/business/signin')}
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Business Dashboard</h2>
              <p className="text-gray-600 mb-4">
                Access business features including truck tracking, reservations, fleet management, and GPS tracking.
              </p>
              <div className="text-sm text-gray-500">
                <p>• Track Your Trucks</p>
                <p>• Truck Reservation</p>
                <p>• Fleet Dashboard</p>
                <p>• GPS Management</p>
                <p>• MIS Reports</p>
              </div>
            </div>
          </div>

          {/* Postal Dashboard */}
          <div 
            onClick={() => navigate('/auth/postal/signin')}
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500"
          >
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Postal Dashboard</h2>
              <p className="text-gray-600 mb-4">
                Access postal department features including company management, driver oversight, and warehouse operations.
              </p>
              <div className="text-sm text-gray-500">
                <p>• Company Details</p>
                <p>• Truck Details</p>
                <p>• Driver List</p>
                <p>• Inbox & Warehouse</p>
                <p>• Fleet Dashboard</p>
              </div>
            </div>
          </div>

          {/* Driver Dashboard */}
          <div 
            onClick={() => navigate('/auth/driver/signin')}
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-orange-500"
          >
            <div className="text-center">
              <Truck className="w-16 h-16 mx-auto mb-4 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Dashboard</h2>
              <p className="text-gray-600 mb-4">
                Access driver-specific features including truck details, sentiment analysis, and driver profiles.
              </p>
              <div className="text-sm text-gray-500">
                <p>• Your Truck</p>
                <p>• Sentiment Analysis</p>
                <p>• Driver Details</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardEntry;