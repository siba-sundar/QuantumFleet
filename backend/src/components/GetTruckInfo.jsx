import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function GetTruckInfo() {
  const [truckId, setTruckId] = useState('');
  const [truckInfo, setTruckInfo] = useState(null);

  const getTruckInfo = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Call the smart contract function
        const info = await contract.methods.getTruckInfo(truckId).call();

        // Convert all data to strings
        setTruckInfo({
          truckId: info.truckId.toString(),
          maxCapacity: info.maxCapacity.toString(),
          currentLoad: info.currentLoad.toString(),
          routeId: info.routeId.toString(),
          isDelayed: info.isDelayed ? 'Yes' : 'No',
          gpsStatus: info.gpsStatus
        });
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Get Truck Info</h2>
      <input
        type="number"
        placeholder="Truck ID"
        className="border p-2 mb-2"
        value={truckId}
        onChange={(e) => setTruckId(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={getTruckInfo}
      >
        Get Truck Info
      </button>
      {truckInfo && (
        <div className="mt-4">
          <h3 className="text-xl font-bold">Truck Information:</h3>
          <p>Truck ID: {truckInfo.truckId}</p>
          <p>Max Capacity: {truckInfo.maxCapacity}</p>
          <p>Current Load: {truckInfo.currentLoad}</p>
          <p>Route ID: {truckInfo.routeId}</p>
          <p>Is Delayed: {truckInfo.isDelayed}</p>
          <p>GPS Status: {truckInfo.gpsStatus}</p>
        </div>
      )}
    </div>
  );
}

export default GetTruckInfo;
