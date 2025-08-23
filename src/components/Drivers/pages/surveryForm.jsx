import React, { useState } from 'react';
import Logo from "../../../assets/logo1.svg"

const DriverSurveyForm = () => {
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl relative">
      {/* Logo */}
      <img
        src={Logo}
        alt="IndiFleet Logo"
        className="w-32 mb-8 mx-auto"
      />

      {/* Form Header */}
      <h1 className="text-2xl font-bold text-center mb-8">Driver Sentiment Survey</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Driver ID */}
        <div className="space-y-2">
          <label htmlFor="driverID" className="block text-lg font-bold">What is your Driver ID?</label>
          <input
            type="text"

            id="driverID"
            name="driverID"
            value={formData.driverID}
            onChange={handleChange}
            placeholder="Enter your Driver ID"
            className="w-full p-3 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
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
            className="w-2/4 py-3 bg-black text-white  font-bold rounded-full hover:bg-green-600 transition duration-300"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverSurveyForm;
