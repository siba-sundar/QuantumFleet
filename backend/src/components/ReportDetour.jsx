import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function ReportDetour() {
  const [truckId, setTruckId] = useState('');
  const [detourPoint, setDetourPoint] = useState('');

  const reportDetour = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        await contract.methods.reportDetour(truckId, detourPoint).send({ from: accounts[0] });
        alert('Detour reported successfully!');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Report Detour</h2>
      <input
        type="number"
        placeholder="Truck ID"
        className="border p-2 mb-2"
        value={truckId}
        onChange={(e) => setTruckId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Detour Point"
        className="border p-2 mb-2"
        value={detourPoint}
        onChange={(e) => setDetourPoint(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={reportDetour}
      >
        Report Detour
      </button>
    </div>
  );
}

export default ReportDetour;