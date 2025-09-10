import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { CheckCircle, MapPin, Loader2 } from "lucide-react";
import podAbi from "../../../abi/ProofOfDelivery.json";

const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function UpdateCheckpoints({ blockchainOrderId }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loadingIndex, setLoadingIndex] = useState(null);

  // Google Maps reverse geocode
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        const cityComponent = result.address_components.find((c) =>
          c.types.includes("locality")
        );
        const stateComponent = result.address_components.find((c) =>
          c.types.includes("administrative_area_level_1")
        );
        return cityComponent?.long_name || stateComponent?.long_name || "Unknown";
      }
      return "Unknown";
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      return "Unknown";
    }
  };

  const fetchCheckpoints = async () => {
    if (!blockchainOrderId) return;
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const podContract = new ethers.Contract(POD_ADDRESS, podAbi, signer);

      const cps = await podContract.getCheckpoints(Number(blockchainOrderId));
      const formatted = await Promise.all(
        cps.map(async (cp, idx) => {
          const lat = Number(cp.latE6) / 1e6;
          const lon = Number(cp.lonE6) / 1e6;
          const city = await reverseGeocode(lat, lon);
          return {
            index: idx,
            lat,
            lon,
            city,
            plannedTime: Number(cp.plannedTime),
            actualTime: Number(cp.actualTime),
          };
        })
      );
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

  const handleMarkReached = async (index) => {
    if (!blockchainOrderId) return;
    setLoadingIndex(index);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const podContract = new ethers.Contract(POD_ADDRESS, podAbi, signer);

      const now = Math.floor(Date.now() / 1000);
      const tx = await podContract.markCheckpointReached(
        Number(blockchainOrderId),
        index,
        now
      );
      await tx.wait();

      toast.success(`Checkpoint ${index + 1} marked as reached ✅`);
      console.log("[✅ Checkpoint marked]", { index, now });

      fetchCheckpoints(); // refresh UI
    } catch (err) {
      console.error("Failed to mark checkpoint:", err);
      toast.error(err.message || "Update failed");
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-2xl shadow space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 text-center">
        Update Checkpoints
      </h2>

      {checkpoints.length === 0 ? (
        <p className="text-gray-500 text-center">No checkpoints found</p>
      ) : (
        <div className="space-y-3">
          {checkpoints.map((cp) => (
            <div
              key={cp.index}
              className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-3 rounded"
            >
              <div className="flex-1">
                <p className="font-medium text-indigo-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {cp.city}
                </p>
                <p className="text-xs text-gray-500">
                  ({cp.lat.toFixed(6)}, {cp.lon.toFixed(6)})
                </p>
                {cp.actualTime > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Reached at {new Date(cp.actualTime * 1000).toLocaleString()}
                  </p>
                )}
              </div>

              {cp.actualTime === 0 && (
                <button
                  onClick={() => handleMarkReached(cp.index)}
                  disabled={loadingIndex === cp.index}
                  className="mt-2 md:mt-0 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loadingIndex === cp.index ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Mark as Reached"
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
