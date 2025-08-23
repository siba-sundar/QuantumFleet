import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function AddRoute() {
  const [touchpoints, setTouchpoints] = useState('');
  const [loadUnloadPoints, setLoadUnloadPoints] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');

  const addRoute = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        const touchpointsArray = touchpoints.split(',');
        const loadUnloadPointsArray = loadUnloadPoints.split(',').map(Number);

        await contract.methods.addRoute(touchpointsArray, loadUnloadPointsArray, maxCapacity).send({ from: accounts[0] });
        alert('Route added successfully!');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Add Route</h2>
      <input
        type="text"
        placeholder="Touchpoints (comma-separated)"
        className="border p-2 mb-2 w-full"
        value={touchpoints}
        onChange={(e) => setTouchpoints(e.target.value)}
      />
      <input
        type="text"
        placeholder="Load/Unload Points (comma-separated)"
        className="border p-2 mb-2 w-full"
        value={loadUnloadPoints}
        onChange={(e) => setLoadUnloadPoints(e.target.value)}
      />
      <input
        type="number"
        placeholder="Max Capacity"
        className="border p-2 mb-2"
        value={maxCapacity}
        onChange={(e) => setMaxCapacity(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={addRoute}
      >
        Add Route
      </button>
    </div>
  );
}

export default AddRoute;