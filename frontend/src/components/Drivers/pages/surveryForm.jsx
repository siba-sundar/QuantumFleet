import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from "../../../assets/logo1.svg";
import { submitSentimentSurvey, fetchDriverSentimentHistory } from '../../../utils/api.js';
import { useAuth } from '../../../hooks/useAuth.jsx';

const DriverSurveyForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    driverID: '',
    jobSatisfaction: '',
    relationshipWithManagement: '',
    workHours: '',
    mentalHealth: '',
    physicalHealth: '',
    salarySatisfaction: '',
    workConditions: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [error, setError] = useState('');
  const [limitInfo, setLimitInfo] = useState({ loading: true, allowed: true, remaining: 2, resetsAt: null });

  // Pre-check monthly submission limit for the logged-in driver
  useEffect(() => {
    let cancelled = false;
    async function checkLimit() {
      if (!user?.uid) {
        setLimitInfo(prev => ({ ...prev, loading: false }));
        return;
      }
      try {
        const history = await fetchDriverSentimentHistory(user.uid, 50);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const submissionsThisMonth = (history.history || []).filter(h => {
          // createdAt is normalized to ISO in backend; fallback to submittedAt
          const tsStr = h.createdAt || h.submittedAt;
          const ts = tsStr ? new Date(tsStr) : null;
          return ts >= startOfMonth && ts <= now;
        }).length;
        const limit = 2;
        const allowed = submissionsThisMonth < limit;
        const remaining = Math.max(0, limit - submissionsThisMonth);
        const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
        if (!cancelled) setLimitInfo({ loading: false, allowed, remaining, resetsAt });
      } catch (e) {
        if (!cancelled) setLimitInfo({ loading: false, allowed: true, remaining: 2, resetsAt: null });
      }
    }
    checkLimit();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitResult(null);
    
    // Validation
    const requiredFields = ['jobSatisfaction', 'relationshipWithManagement', 'workHours', 
                           'mentalHealth', 'physicalHealth', 'salarySatisfaction', 'workConditions'];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (!user?.uid && !formData.driverID) {
      setError('Driver ID is required. Please enter your Driver ID.');
      return;
    }
    
    if (user?.uid && !limitInfo.allowed) {
      setError(`You've reached this month's submission limit. You can submit again on ${limitInfo.resetsAt ? new Date(limitInfo.resetsAt).toLocaleDateString() : 'the 1st of next month'}.`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Use authenticated user ID or manual driver ID
      const driverId = user?.uid || formData.driverID;
      
      const surveyPayload = {
        driverId,
        surveyData: {
          driverID: formData.driverID || driverId,
          jobSatisfaction: formData.jobSatisfaction,
          relationshipWithManagement: formData.relationshipWithManagement,
          workHours: formData.workHours,
          mentalHealth: formData.mentalHealth,
          physicalHealth: formData.physicalHealth,
          salarySatisfaction: formData.salarySatisfaction,
          workConditions: formData.workConditions
        }
      };
      
      console.log('Submitting survey:', surveyPayload);
      
  const result = await submitSentimentSurvey(surveyPayload);
      
  setSubmitResult(result);
      
  // Reset form after successful submission
      setFormData({
        driverID: '',
        jobSatisfaction: '',
        relationshipWithManagement: '',
        workHours: '',
        mentalHealth: '',
        physicalHealth: '',
        salarySatisfaction: '',
        workConditions: ''
      });
      
  // Show success message briefly then redirect to driver details
      setTimeout(() => {
        navigate('/driver/driver-details', { 
          state: { 
            sentimentData: result.analysis,
            message: 'Sentiment analysis completed successfully!' 
          }
        });
      }, 3000); // Wait 3 seconds to show the analysis result
  // Update limit based on server response to avoid double-decrement
  setLimitInfo(info => ({ ...info, remaining: result.remainingThisMonth ?? info.remaining, allowed: (result.remainingThisMonth ?? info.remaining) > 0 }));
      
    } catch (error) {
      console.error('Error submitting survey:', error);
      setError(error.message || 'Failed to submit survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl relative">
      {/* Logo */}
      <img
        src={Logo}
        alt="IndiFleet Logo"
        className="w-32 mb-8 mx-auto"
      />

      {/* Success Message */}
      {submitResult && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-lg font-bold text-green-800 mb-2">Survey Submitted Successfully!</h2>
          <p className="text-sm text-green-700 mb-3">Redirecting to your dashboard in 3 seconds...</p>
          {submitResult.analysis && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-700">Your Sentiment Score:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  submitResult.analysis.sentimentScore >= 80 ? 'bg-green-500 text-white' :
                  submitResult.analysis.sentimentScore >= 60 ? 'bg-blue-500 text-white' :
                  submitResult.analysis.sentimentScore >= 40 ? 'bg-yellow-500 text-white' :
                  submitResult.analysis.sentimentScore >= 20 ? 'bg-orange-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {submitResult.analysis.sentimentScore}/100 - {submitResult.analysis.sentimentLabel}
                </span>
              </div>
              <p className="text-sm text-green-700">
                <strong>Analysis:</strong> {submitResult.analysis.analysis}
              </p>
              {submitResult.analysis.recommendations && submitResult.analysis.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm text-green-600 space-y-1">
                    {submitResult.analysis.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={() => navigate('/driver/driver-details', { 
                    state: { 
                      sentimentData: submitResult.analysis,
                      message: 'Sentiment analysis completed successfully!' 
                    }
                  })}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Go to Dashboard Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}
      
      {/* Form Header */}
      <h1 className="text-2xl font-bold text-center mb-2">Driver Sentiment Survey</h1>
      {user?.uid && (
        <p className="text-center text-sm mb-6 text-gray-600">
          You can submit this survey up to <span className="font-semibold">2 times per month</span>. {limitInfo.loading ? 'Checking your quota...' : `Remaining this month: ${limitInfo.remaining}.`}
        </p>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Driver ID */}
        <div className="space-y-2">
          <label htmlFor="driverID" className="block text-lg font-bold">
            What is your Driver ID? {!user?.uid && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            id="driverID"
            name="driverID"
            value={formData.driverID}
            onChange={handleChange}
            placeholder={user?.uid ? `Logged in as: ${user.uid}` : "Enter your Driver ID"}
            className="w-full p-3 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
            disabled={Boolean(user?.uid)}
          />
          {user?.uid && (
            <p className="text-sm text-gray-600">Using authenticated driver ID: {user.uid}</p>
          )}
        </div>

        {/* Job Satisfaction */}
        <div className="space-y-2">
          <label className="block text-lg font-bold">How would you rate your overall job satisfaction?</label>
          <div className="flex flex-col space-y-2 ml-4">
            <label><input type="radio" name="jobSatisfaction" value="Very Low" onChange={handleChange} /> Very Low</label>
            <label><input type="radio" name="jobSatisfaction" value="Low" onChange={handleChange} /> Low</label>
            <label><input type="radio" name="jobSatisfaction" value="Moderate" onChange={handleChange} /> Moderate</label>
            <label><input type="radio" name="jobSatisfaction" value="High" onChange={handleChange} /> High</label>
            <label><input type="radio" name="jobSatisfaction" value="Very High" onChange={handleChange} /> Very High</label>
          </div>
        </div>

        {/* Relationship with Management */}
        <div className="space-y-2">
          <label className="block text-lg font-bold">How would you describe your relationship with management?</label>
          <div className="flex flex-col space-y-2 ml-4">
            <label><input type="radio" name="relationshipWithManagement" value="Poor" onChange={handleChange} /> Poor</label>
            <label><input type="radio" name="relationshipWithManagement" value="Fair" onChange={handleChange} /> Fair</label>
            <label><input type="radio" name="relationshipWithManagement" value="Good" onChange={handleChange} /> Good</label>
            <label><input type="radio" name="relationshipWithManagement" value="Excellent" onChange={handleChange} /> Excellent</label>
          </div>
        </div>

        {/* Work Hours */}
        <div className="space-y-2">
          <label htmlFor="workHours" className="block text-lg font-bold">On average, how many hours do you work per week?</label>
          <input
            type="number"
            id="workHours"
            name="workHours"
            value={formData.workHours}
            onChange={handleChange}
            placeholder="Enter work hours"
            className="w-full p-3 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Mental Health */}
        <div className="space-y-2">
          <label className="block text-lg font-bold">How would you rate your current mental health?</label>
          <div className="flex flex-col space-y-2 ml-4">
            <label><input type="radio" name="mentalHealth" value="Poor" onChange={handleChange} /> Poor</label>
            <label><input type="radio" name="mentalHealth" value="Fair" onChange={handleChange} /> Fair</label>
            <label><input type="radio" name="mentalHealth" value="Good" onChange={handleChange} /> Good</label>
            <label><input type="radio" name="mentalHealth" value="Excellent" onChange={handleChange} /> Excellent</label>
          </div>
        </div>

        {/* Physical Health */}
        <div className="space-y-2">
          <label className="block text-lg font-bold">How would you rate your current physical health?</label>
          <div className="flex flex-col space-y-2 ml-4">
            <label><input type="radio" name="physicalHealth" value="Poor" onChange={handleChange} /> Poor</label>
            <label><input type="radio" name="physicalHealth" value="Fair" onChange={handleChange} /> Fair</label>
            <label><input type="radio" name="physicalHealth" value="Good" onChange={handleChange} /> Good</label>
            <label><input type="radio" name="physicalHealth" value="Excellent" onChange={handleChange} /> Excellent</label>
          </div>
        </div>

        {/* Salary Satisfaction */}
        <div className="space-y-2">
          <label className="block text-lg font-bold">How satisfied are you with your salary?</label>
          <div className="flex flex-col space-y-2 ml-4">
            <label><input type="radio" name="salarySatisfaction" value="Very Dissatisfied" onChange={handleChange} /> Very Dissatisfied</label>
            <label><input type="radio" name="salarySatisfaction" value="Dissatisfied" onChange={handleChange} /> Dissatisfied</label>
            <label><input type="radio" name="salarySatisfaction" value="Neutral" onChange={handleChange} /> Neutral</label>
            <label><input type="radio" name="salarySatisfaction" value="Satisfied" onChange={handleChange} /> Satisfied</label>
            <label><input type="radio" name="salarySatisfaction" value="Very Satisfied" onChange={handleChange} /> Very Satisfied</label>
          </div>
        </div>

        {/* Work Conditions */}
        <div className="space-y-2">
          <label className="block text-lg font-bold">How would you describe your overall work conditions?</label>
          <div className="flex flex-col space-y-2 ml-4">
            <label><input type="radio" name="workConditions" value="Terrible" onChange={handleChange} /> Terrible</label>
            <label><input type="radio" name="workConditions" value="Poor" onChange={handleChange} /> Poor</label>
            <label><input type="radio" name="workConditions" value="Fair" onChange={handleChange} /> Fair</label>
            <label><input type="radio" name="workConditions" value="Good" onChange={handleChange} /> Good</label>
            <label><input type="radio" name="workConditions" value="Excellent" onChange={handleChange} /> Excellent</label>
          </div>
        </div>

        {/* Submit Button */}
        <div className='flex items-center justify-center'>
          <button
            type="submit"
            disabled={isSubmitting || (user?.uid && !limitInfo.allowed)}
            className={`w-2/4 py-3 font-bold rounded-full transition duration-300 ${
              isSubmitting || (user?.uid && !limitInfo.allowed)
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-black text-white hover:bg-green-600'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </div>
            ) : (
              (user?.uid && !limitInfo.allowed) ? 'Limit Reached' : 'Submit Survey'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverSurveyForm;
