import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function BookThirdPartyCapacity() {
  const [truckId, setTruckId] = useState('');
  const [capacity, setCapacity] = useState('');

  const bookCapacity = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        await contract.methods.bookThirdPartyCapacity(truckId, capacity).send({ from: accounts[0] });
        alert('Third-party capacity booked successfully!');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Book Third-Party Capacity</h2>
      <input
        type="number"
        placeholder="Truck ID"
        className="border p-2 mb-2"
        value={truckId}
        onChange={(e) => setTruckId(e.target.value)}
      />
      <input
        type="number"
        placeholder="Capacity"
        className="border p-2 mb-2"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={bookCapacity}
      >
        Book Capacity
      </button>
    </div>
  );
}

export default BookThirdPartyCapacity;