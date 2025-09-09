import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import podAbi from "../../../abi/ProofOfDelivery.json";

const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;

export default function UpdateCheckpoints({ blockchainOrderId }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCheckpoints = async () => {
    if (!blockchainOrderId) return;
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const podContract = new ethers.Contract(POD_ADDRESS, podAbi, signer);

      // Assuming contract has getCheckpoints(orderId) returning array of structs
      const cps = await podContract.getCheckpoints(Number(blockchainOrderId));
      const formatted = cps.map((cp) => ({
        lat: Number(cp.lat) / 1e6,
        lon: Number(cp.lon) / 1e6,
        timestamp: Number(cp.plannedTime),
      }));
      setCheckpoints(formatted);
      console.log("[✅ Fetched Checkpoints]", formatted);
    } catch (err) {
      console.error("Failed to fetch checkpoints:", err);
      toast.error("Failed to fetch checkpoints");
    }
  };

  useEffect(() => {
    fetchCheckpoints();
  }, [blockchainOrderId]);

  const handleChange = (index, field, value) => {
    const updated = [...checkpoints];
    updated[index][field] = value;
    setCheckpoints(updated);
  };

  const handleUpdate = async () => {
    if (!blockchainOrderId) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const podContract = new ethers.Contract(POD_ADDRESS, podAbi, signer);

      const latE6s = checkpoints.map((cp) => {
        const val = Math.round(Number(cp.lat) * 1e6);
        if (val > 2 ** 255 - 1 || val < -(2 ** 255)) throw new Error("Latitude out of int256 range");
        return val;
      });

      const lonE6s = checkpoints.map((cp) => {
        const val = Math.round(Number(cp.lon) * 1e6);
        if (val > 2 ** 255 - 1 || val < -(2 ** 255)) throw new Error("Longitude out of int256 range");
        return val;
      });

      const plannedTimes = checkpoints.map((cp) => {
        const val = Math.floor(Number(cp.timestamp));
        if (val < 0) throw new Error("Invalid timestamp");
        return val;
      });

      // Assuming contract has updateCheckpoints(orderId, lat[], lon[], time[])
      const tx = await podContract.updateCheckpoints(
        Number(blockchainOrderId),
        latE6s,
        lonE6s,
        plannedTimes
      );
      await tx.wait();
      toast.success("Checkpoints updated successfully!");
      console.log("[✅ Checkpoints updated]");
    } catch (err) {
      console.error("Failed to update checkpoints:", err);
      toast.error(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 text-center">
        Update Checkpoints
      </h2>
      {checkpoints.length === 0 ? (
        <p className="text-gray-500 text-center">No checkpoints found</p>
      ) : (
        <div className="space-y-3">
          {checkpoints.map((cp, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2 items-center bg-gray-50 p-2 rounded">
              <input
                type="number"
                step="0.000001"
                value={cp.lat}
                onChange={(e) => handleChange(idx, "lat", e.target.value)}
                className="p-1 border rounded w-full"
                placeholder="Latitude"
              />
              <input
                type="number"
                step="0.000001"
                value={cp.lon}
                onChange={(e) => handleChange(idx, "lon", e.target.value)}
                className="p-1 border rounded w-full"
                placeholder="Longitude"
              />
              <input
                type="datetime-local"
                value={new Date(cp.timestamp * 1000).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const ts = Math.floor(new Date(e.target.value).getTime() / 1000);
                  handleChange(idx, "timestamp", ts);
                }}
                className="p-1 border rounded w-full"
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleUpdate}
        disabled={loading || checkpoints.length === 0}
        className={`w-full py-3 mt-3 text-white font-semibold rounded-xl flex justify-center items-center ${
          loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Updating..." : "Update Checkpoints"}
      </button>
    </div>
  );
}
