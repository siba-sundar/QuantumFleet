import React, { useState } from 'react';
import { PlusCircle, Trash2, Truck, MapPin, Package, CreditCard } from 'lucide-react';

const ReservationSystem = () => {
  const [step, setStep] = useState(1);
  const [trucks, setTrucks] = useState([
    {
      pickupLocation: '',
      dropLocation: '',
      pickupDate: '',
      dropDate: '',
      checkpoints: [{ location: '', date: '', weight: '', goodsType: '', handlingInstructions: '' }]
    }
  ]);

  const addTruck = () => {
    setTrucks([...trucks, {
      pickupLocation: '',
      dropLocation: '',
      pickupDate: '',
      dropDate: '',
      checkpoints: [{ location: '', date: '', weight: '', goodsType: '', handlingInstructions: '' }]
    }]);
  };

  const removeTruck = (index) => {
    setTrucks(trucks.filter((_, i) => i !== index));
  };

  const addCheckpoint = (truckIndex) => {
    const newTrucks = [...trucks];
    newTrucks[truckIndex].checkpoints.push({ location: '', date: '', weight: '', goodsType: '', handlingInstructions: '' });
    setTrucks(newTrucks);
  };

  const removeCheckpoint = (truckIndex, checkpointIndex) => {
    const newTrucks = [...trucks];
    newTrucks[truckIndex].checkpoints.splice(checkpointIndex, 1);
    setTrucks(newTrucks);
  };

  const updateTruck = (index, field, value) => {
    const newTrucks = [...trucks];
    newTrucks[index][field] = value;
    setTrucks(newTrucks);
  };

  const updateCheckpoint = (truckIndex, checkpointIndex, field, value) => {
    const newTrucks = [...trucks];
    newTrucks[truckIndex].checkpoints[checkpointIndex][field] = value;
    setTrucks(newTrucks);
  };

  const calculateTotalCost = () => {
    const baseCost = 1000;
    const costPerKm = 2;
    const costPerKg = 0.5;
    const costPerCheckpoint = 100;

    return trucks.reduce((total, truck) => {
      const truckCost = baseCost +
        (Math.random() * 1000) * costPerKm +
        truck.checkpoints.reduce((sum, cp) => sum + parseInt(cp.weight || 0) * costPerKg, 0) +
        truck.checkpoints.length * costPerCheckpoint;
      return total + truckCost;
    }, 0).toFixed(2);
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">3PL Reservation System</h1>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {['Truck Selection', 'Route Details', 'Checkpoints', 'Final Confirmation'].map((label, index) => (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > index ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm ${step > index ? 'font-semibold text-black' : 'text-gray-600'}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-black rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Truck className="w-6 h-6 mr-2 text-black" />
              Truck Selection
            </h2>
            {trucks.map((truck, index) => (
              <div key={index} className="p-6 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-700">Truck {index + 1}</h3>
                  {index > 0 && (
                    <button onClick={() => removeTruck(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`pickup-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Location
                    </label>
                    <input
                      type="text"
                      id={`pickup-${index}`}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={truck.pickupLocation}
                      onChange={(e) => updateTruck(index, 'pickupLocation', e.target.value)}
                      placeholder="Enter pickup location"
                    />
                  </div>
                  <div>
                    <label htmlFor={`drop-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Drop Location
                    </label>
                    <input
                      type="text"
                      id={`drop-${index}`}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={truck.dropLocation}
                      onChange={(e) => updateTruck(index, 'dropLocation', e.target.value)}
                      placeholder="Enter drop location"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addTruck}
              className="w-full p-3 border border-dashed border-black rounded-lg text-black hover:bg-blue-50 transition duration-150 flex items-center justify-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add Another Truck
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-black-300" />
              Route Details
            </h2>
            {trucks.map((truck, truckIndex) => (
              <div key={truckIndex} className="p-6 border border-gray-200 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Truck {truckIndex + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`pickup-date-${truckIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      id={`pickup-date-${truckIndex}`}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                      value={truck.pickupDate}
                      onChange={(e) => updateTruck(truckIndex, 'pickupDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor={`drop-date-${truckIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Drop Date
                    </label>
                    <input
                      type="date"
                      id={`drop-date-${truckIndex}`}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                      value={truck.dropDate}
                      onChange={(e) => updateTruck(truckIndex, 'dropDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-6 h-6 mr-2 text-black" />
              Checkpoints
            </h2>
            {trucks.map((truck, truckIndex) => (
              <div key={truckIndex} className="p-6 border border-gray-200 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Truck {truckIndex + 1} Checkpoints</h3>
                {truck.checkpoints.map((checkpoint, checkpointIndex) => (
                  <div key={checkpointIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-700">Checkpoint {checkpointIndex + 1}</h4>
                      {checkpointIndex > 0 && (
                        <button onClick={() => removeCheckpoint(truckIndex, checkpointIndex)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`location-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          id={`location-${truckIndex}-${checkpointIndex}`}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                          value={checkpoint.location}
                          onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'location', e.target.value)}
                          placeholder="Enter checkpoint location"
                        />
                      </div>
                      <div>
                        <label htmlFor={`date-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          id={`date-${truckIndex}-${checkpointIndex}`}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          value={checkpoint.date}
                          onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'date', e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor={`weight-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Goods Weight (kgs)
                        </label>
                        <input
                          type="number"
                          id={`weight-${truckIndex}-${checkpointIndex}`}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                          value={checkpoint.weight}
                          onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'weight', e.target.value)}
                          placeholder="Enter goods weight"
                        />
                      </div>
                      <div>
                        <label htmlFor={`type-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Goods Type
                        </label>
                        <input
                          type="text"
                          id={`type-${truckIndex}-${checkpointIndex}`}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                          value={checkpoint.goodsType}
                          onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'goodsType', e.target.value)}
                          placeholder="e.g., Fragile, Perishable, Hazardous"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor={`instructions-${truckIndex}-${checkpointIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Handling Instructions
                      </label>
                      <textarea
                        id={`instructions-${truckIndex}-${checkpointIndex}`}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={checkpoint.handlingInstructions}
                        onChange={(e) => updateCheckpoint(truckIndex, checkpointIndex, 'handlingInstructions', e.target.value)}
                        placeholder="Enter any special handling instructions"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addCheckpoint(truckIndex)}
                  className="w-full p-3 border border-dashed border-black rounded-lg text-black hover:bg-blue-50 transition duration-150 flex items-center justify-center"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Add Checkpoint
                </button>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <CreditCard className="w-6 h-6 mr-2 text-blue-500" />
              Final Confirmation
            </h2>
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Trucks:</span>
                  <span className="font-semibold text-gray-800">{trucks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Checkpoints:</span>
                  <span className="font-semibold text-gray-800">
                    {trucks.reduce((sum, truck) => sum + truck.checkpoints.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Weight:</span>
                  <span className="font-semibold text-gray-800">
                    {trucks.reduce((sum, truck) => sum + truck.checkpoints.reduce((cpSum, cp) => cpSum + parseInt(cp.weight || '0'), 0), 0)} kgs
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Estimated Cost:</span>
                  <span className="text-2xl font-bold text-black">${calculateTotalCost()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition duration-150"
            >
              Previous
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-black text-white rounded-md hover:px-8 transition duration-300 ml-auto"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => alert('Reservation Confirmed!')}
              className="px-6 py-2 bg-black text-white rounded-md hover:px-8 transition duration-150 ml-auto flex items-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Confirm Reservation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationSystem;