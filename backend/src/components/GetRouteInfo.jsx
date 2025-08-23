import React, { useState } from 'react';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../utils/utils.json';

function GetRouteInfo() {
  const [routeId, setRouteId] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);

  const getRouteInfo = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Call the smart contract function
        const info = await contract.methods.getRouteInfo(routeId).call();

        // Debugging: log raw data
        console.log('Raw info from contract:', info);

        // Process and set the route info
        setRouteInfo({
          routeId: info.routeId.toString(),
          touchpoints: info.touchpoints,
          loadUnloadPoints: info.loadUnloadPoints.map(point => point.toString()), // Convert numbers to strings
          maxCapacity: info.maxCapacity.toString() // Ensure this is a string
        });
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Get Route Info</h2>
      <input
        type="number"
        placeholder="Route ID"
        className="border p-2 mb-2"
        value={routeId}
        onChange={(e) => setRouteId(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={getRouteInfo}
      >
        Get Route Info
      </button>
      {routeInfo && (
        <div className="mt-4">
          <h3 className="text-xl font-bold">Route Information:</h3>
          <p>Route ID: {routeInfo.routeId}</p>
          <p>Touchpoints: {routeInfo.touchpoints.join(', ')}</p>
          <p>Load/Unload Points: {routeInfo.loadUnloadPoints.join(', ')}</p>
          <p>Max Capacity: {routeInfo.maxCapacity}</p>
        </div>
      )}
    </div>
  );
}

export default GetRouteInfo;
