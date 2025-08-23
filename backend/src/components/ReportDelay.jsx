import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function ReportDelay() {
  const [truckId, setTruckId] = useState('');
  const [reason, setReason] = useState('');
  const [timeDelayed, setTimeDelayed] = useState('');

  const reportDelay = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        await contract.methods.reportDelay(truckId, reason, timeDelayed).send({ from: accounts[0] });
        alert('Delay reported successfully!');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Report Delay</h2>
      <input
        type="number"
        placeholder="Truck ID"
        className="border p-2 mb-2"
        value={truckId}
        onChange={(e) => setTruckId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Reason"
        className="border p-2 mb-2"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <input
        type="number"
        placeholder="Time Delayed (in seconds)"
        className="border p-2 mb-2"
        value={timeDelayed}
        onChange={(e) => setTimeDelayed(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={reportDelay}
      >
        Report Delay
      </button>
    </div>
  );
}

export default ReportDelay;