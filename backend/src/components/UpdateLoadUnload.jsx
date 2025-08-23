import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function UpdateLoadUnload() {
  const [truckId, setTruckId] = useState('');
  const [touchpointIndex, setTouchpointIndex] = useState('');
  const [unloadAmount, setUnloadAmount] = useState('');
  const [loadAmount, setLoadAmount] = useState('');

  const updateLoadUnload = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        await contract.methods.updateLoadUnload(truckId, touchpointIndex, unloadAmount, loadAmount).send({ from: accounts[0] });
        alert('Load/Unload updated successfully!');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Update Load/Unload</h2>
      <input
        type="number"
        placeholder="Truck ID"
        className="border p-2 mb-2"
        value={truckId}
        onChange={(e) => setTruckId(e.target.value)}
      />
      <input
        type="number"
        placeholder="Touchpoint Index"
        className="border p-2 mb-2"
        value={touchpointIndex}
        onChange={(e) => setTouchpointIndex(e.target.value)}
      />
      <input
        type="number"
        placeholder="Unload Amount"
        className="border p-2 mb-2"
        value={unloadAmount}
        onChange={(e) => setUnloadAmount(e.target.value)}
      />
      <input
        type="number"
        placeholder="Load Amount"
        className="border p-2 mb-2"
        value={loadAmount}
        onChange={(e) => setLoadAmount(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={updateLoadUnload}
      >
        Update Load/Unload
      </button>
    </div>
  );
}

export default UpdateLoadUnload;