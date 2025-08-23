import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function UpdateSchedule() {
  const [truckId, setTruckId] = useState('');
  const [arrivalTimes, setArrivalTimes] = useState('');

  const updateSchedule = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        const arrivalTimesArray = arrivalTimes.split(',').map(Number);
        await contract.methods.updateSchedule(truckId, arrivalTimesArray).send({ from: accounts[0] });
        alert('Schedule updated successfully!');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Update Schedule</h2>
      <input
        type="number"
        placeholder="Truck ID"
        className="border p-2 mb-2"
        value={truckId}
        onChange={(e) => setTruckId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Arrival Times (comma-separated)"
        className="border p-2 mb-2 w-full"
        value={arrivalTimes}
        onChange={(e) => setArrivalTimes(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={updateSchedule}
      >
        Update Schedule
      </button>
    </div>
  );
}

export default UpdateSchedule;