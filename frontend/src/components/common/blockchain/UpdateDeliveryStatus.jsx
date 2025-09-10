import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { ethers } from "ethers";
import deliveryAbi from "../../../abi/DeliveryManagement.json";

// Enum mapping to match smart contract integers
const STATUS_ENUM = {
  Created: 0,
  InTransit: 1,
  // Delivered: 2,
  Cancelled: 3,
};

// Reverse mapping for contract int -> string
const STATUS_NAMES = Object.keys(STATUS_ENUM).reduce((acc, key) => {
  acc[STATUS_ENUM[key]] = key;
  return acc;
}, {});

export default function UpdateDeliveryStatus({ blockchainOrderId }) {
  const [formData, setFormData] = useState({ status: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [getStatusOfDelivery, setGetStatusOfDelivery] = useState("");
  const [isDelivered, setIsDelivered] = useState(false);

  // Fetch current delivery status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!blockchainOrderId || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const deliveryContract = new ethers.Contract(
          import.meta.env.VITE_DELIVERY_ADDRESS,
          deliveryAbi,
          provider
        );

        const statusInt = await deliveryContract.getStatus(
          parseInt(blockchainOrderId)
        );
        const statusStr = STATUS_NAMES[statusInt] || "";
        setGetStatusOfDelivery(statusStr);
        setFormData({ status: statusStr });
        setIsDelivered(statusStr === "Delivered"); // ✅ disable if Delivered
      } catch (err) {
        console.error("Error fetching delivery status:", err);
      }
    };

    fetchStatus();
  }, [blockchainOrderId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage("");

    try {
      const statusInt = STATUS_ENUM[formData.status];
      if (statusInt === undefined) {
        toast.error("Invalid status selected");
        return;
      }

      if (!blockchainOrderId) throw new Error("Order ID not found");

      if (!window.ethereum) throw new Error("MetaMask not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const deliveryContract = new ethers.Contract(
        import.meta.env.VITE_DELIVERY_ADDRESS,
        deliveryAbi,
        signer
      );

      const tx = await deliveryContract.setStatus(
        parseInt(blockchainOrderId),
        statusInt
      );
      await tx.wait();

      setSuccessMessage(`✅ Status updated to ${formData.status}`);
      setGetStatusOfDelivery(formData.status);
      setIsDelivered(formData.status === "Delivered");
    } catch (error) {
      console.error("❌ Error updating status:", error);
      toast.error(error.reason || error.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-lg border border-gray-200">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">
        Update Delivery Status
      </h2>

      <p className="mb-4 text-sm text-gray-600">
        <span className="font-semibold">Order ID:</span>{" "}
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">
          {blockchainOrderId}
        </span>
      </p>

      <p className="mb-4 text-sm text-gray-700">
        <span className="font-semibold">Current Status:</span>{" "}
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">
          {getStatusOfDelivery || "Fetching..."}
        </span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Update To
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isDelivered} // ✅ disable select if Delivered
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            required
          >
            <option value="">Select Status</option>
            {Object.keys(STATUS_ENUM).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={isDelivered} // ✅ disable button if Delivered
          className={`w-full ${
            isDelivered
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          } text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out`}
        >
          {isDelivered
            ? "Already Delivered"
            : isLoading
            ? "Updating..."
            : "Update Status"}
        </LoadingButton>
      </form>

      {successMessage && (
        <p className="mt-4 text-green-600 font-medium">{successMessage}</p>
      )}
    </div>
  );
}
