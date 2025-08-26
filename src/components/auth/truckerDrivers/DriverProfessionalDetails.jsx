import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrivers } from '../../../hooks/useFirestore.js';
import { useAuth } from '../../../hooks/useAuth.jsx';

const DriverProfessionalDetails = () => {
  // Form state for professional information
  const [formData, setFormData] = useState({
    employeeId: '',
    experience: '',
    currentAssignment: '',
    truckId: '',
    department: '',
    supervisor: '',
    contactNumber: '',
    emergencyContact: '',
    emergencyPhone: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { update: updateDriverProfile, findByUserId } = useDrivers();
  
  const { phone, isNewUser } = location.state || {};

  // Redirect if no user authenticated
  useEffect(() => {
    if (!user?.uid && !phone) {
      navigate('/auth/driver/signin');
    }
  }, [user, phone, navigate]);

  // Load existing profile data if updating
  useEffect(() => {
    const loadExistingData = async () => {
      if (user?.uid && !isNewUser) {
        try {
          const result = await findByUserId(user.uid);
          if (result.success && result.data?.professionalInfo) {
            const { professionalInfo } = result.data;
            setFormData({
              employeeId: professionalInfo.employeeId || '',
              experience: professionalInfo.experience || '',
              currentAssignment: professionalInfo.currentAssignment || '',
              truckId: professionalInfo.truckId || '',
              department: professionalInfo.department || '',
              supervisor: professionalInfo.supervisor || '',
              contactNumber: professionalInfo.contactNumber || '',
              emergencyContact: professionalInfo.emergencyContact || '',
              emergencyPhone: professionalInfo.emergencyPhone || ''
            });
          }
        } catch (error) {
          console.error('Error loading existing data:', error);
        }
      }
    };

    loadExistingData();
  }, [user, isNewUser, findByUserId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = ['employeeId', 'experience', 'currentAssignment', 'truckId'];
      const missingFields = requiredFields.filter(field => !formData[field].trim());
      
      if (missingFields.length > 0) {
        setError('Please fill in all required fields: Employee ID, Experience, Current Assignment, and Truck ID');
        return;
      }

      if (isNaN(formData.experience) || parseInt(formData.experience) < 0) {
        setError('Please enter a valid number for years of experience');
        return;
      }

      // Prepare professional data
      const professionalData = {
        professionalInfo: {
          employeeId: formData.employeeId.trim(),
          experience: parseInt(formData.experience),
          currentAssignment: formData.currentAssignment.trim(),
          truckId: formData.truckId.trim(),
          department: formData.department.trim(),
          supervisor: formData.supervisor.trim(),
          contactNumber: formData.contactNumber.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          emergencyPhone: formData.emergencyPhone.trim()
        },
        lastUpdated: new Date().toISOString()
      };

      // Update driver profile with professional information
      const result = await updateDriverProfile(user.uid, professionalData);
      
      if (result.success) {
        // For new users, navigate to dashboard with completion status
        // For existing users updating their profile, just navigate normally
        navigate('/driver/your-truck', {
          state: {
            phone: phone || user?.phoneNumber,
            profileCompleted: true,
            isNewUser: isNewUser || false,
            autoSignedIn: isNewUser || false
          }
        });
      } else {
        setError(result.error || 'Failed to save professional details. Please try again.');
      }
    } catch (error) {
      console.error('Error saving professional details:', error);
      setError('An error occurred while saving your details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Allow users to skip for now and complete later
    navigate('/driver/your-truck', {
      state: {
        phone: phone || user?.phoneNumber,
        skippedProfessionalDetails: true
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10">
      <h1 className="text-3xl font-bold text-center mb-4">Professional Details</h1>

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-8">Complete Your Professional Profile</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <hr className="bg-black border-2 border-black mb-8" />
        
        <form onSubmit={handleSubmit}>
          {/* Employee Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Employee Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID *
                </label>
                <input 
                  type="text" 
                  name="employeeId"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter Employee ID (e.g., EMP001)" 
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <input 
                  type="number" 
                  name="experience"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Years (e.g., 10)" 
                  value={formData.experience}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  min="0"
                  max="50"
                  required 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input 
                  type="text" 
                  name="department"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Department/Division" 
                  value={formData.department}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisor
                </label>
                <input 
                  type="text" 
                  name="supervisor"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Supervisor Name" 
                  value={formData.supervisor}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Assignment Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Current Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Assignment *
                </label>
                <input 
                  type="text" 
                  name="currentAssignment"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g., Dallas to Houston" 
                  value={formData.currentAssignment}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Truck ID *
                </label>
                <input 
                  type="text" 
                  name="truckId"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g., TRK789" 
                  value={formData.truckId}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required 
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Contact Number
                </label>
                <input 
                  type="tel" 
                  name="contactNumber"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Work phone number" 
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input 
                  type="text" 
                  name="emergencyContact"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Emergency contact name" 
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone
                </label>
                <input 
                  type="tel" 
                  name="emergencyPhone"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Emergency phone number" 
                  value={formData.emergencyPhone}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-44 px-4 py-2 text-lg font-semibold rounded-full transition-all duration-200 ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-black text-white hover:shadow-lg hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Save Details'}
            </button>
            
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="w-full sm:w-44 px-4 py-2 text-lg font-semibold rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              Skip for Now
            </button>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              * Required fields. You can update this information later from your dashboard.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverProfessionalDetails;