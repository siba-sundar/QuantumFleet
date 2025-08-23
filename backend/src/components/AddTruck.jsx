import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function AddTruck() {
  const [maxCapacity, setMaxCapacity] = useState('');
  const [routeId, setRouteId] = useState('');

  const addTruck = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        await contract.methods.addTruck(maxCapacity, routeId).send({ from: accounts[0] });
        alert('Truck added successfully!');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Add Truck</h2>
      <input
        type="number"
        placeholder="Max Capacity"
        className="border p-2 mb-2"
        value={maxCapacity}
        onChange={(e) => setMaxCapacity(e.target.value)}
      />
      <input
        type="number"
        placeholder="Route ID"
        className="border p-2 mb-2"
        value={routeId}
        onChange={(e) => setRouteId(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={addTruck}
      >
        Add Truck
      </button>
    </div>
  );
}

export default AddTruck;