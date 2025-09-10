import React, { useState, useEffect } from "react";
import { LoadingButton } from "./LoadingButton";
import { useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import podAbi from "../../../abi/ProofOfDelivery.json";
import deliveryAbi from "../../../abi/DeliveryManagement.json";
import accessAbi from "../../../abi/AccessRegistry.json";

const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;
const DELIVERY_ADDRESS = import.meta.env.VITE_DELIVERY_ADDRESS;
const ACCESS_ADDRESS = import.meta.env.VITE_ACCESS_ADDRESS;

export default function FinalizeDelivery({ blockchainOrderId }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isFinalized, setIsFinalized] = useState(false);
  const account = useActiveAccount();
  const address = account?.address;

  // ✅ Fetch whether delivery is finalized
  useEffect(() => {
    const fetchFinalized = async () => {
      if (!blockchainOrderId || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const podContract = new ethers.Contract(POD_ADDRESS, podAbi, provider);

        const finalized = await podContract.isFinalized(
          parseInt(blockchainOrderId)
        );
        setIsFinalized(finalized);
      } catch (err) {
        console.error("Error fetching finalized status:", err);
      }
    };

    fetchFinalized();
  }, [blockchainOrderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!address) {
      setMessage("❌ Please connect your wallet first!");
      return;
    }

    const id = parseInt(blockchainOrderId);
    if (!id || isNaN(id)) {
      setMessage("❌ Invalid Order ID provided");
      return;
    }

    try {
      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const podContract = new ethers.Contract(POD_ADDRESS, podAbi, signer);
      const deliveryContract = new ethers.Contract(
        DELIVERY_ADDRESS,
        deliveryAbi,
        provider
      );
      const accessRegistry = new ethers.Contract(
        ACCESS_ADDRESS,
        accessAbi,
        provider
      );

      // Check if user is Admin
      const isAdmin = await accessRegistry.hasRole(address, 0); // Role.Admin == 0

      // Ensure proof exists
      const proofExists = await podContract.proofExists(id);
      if (!proofExists) {
        const tx = await podContract.connect(signer).initProof(id);
        await tx.wait();
        setMessage("ℹ️ Proof initialized for this order.");
      }

      // Check assigned carrier
      const assignedCarrier = await deliveryContract.getAssignedCarrier(id);
      const isAssignedCarrier =
        assignedCarrier.toLowerCase() === address.toLowerCase();

      if (!isAssignedCarrier && !isAdmin) {
        setMessage("❌ You are not authorized to finalize this delivery!");
        setLoading(false);
        return;
      }

      // Finalize delivery
      const tx = await podContract.finalizeDelivery(id, address);
      await tx.wait();

      setMessage("✅ Delivery finalized & payment released!");
      setIsFinalized(true); // ✅ update state
    } catch (error) {
      console.error("Finalize Error:", error);

      let reason = "❌ Failed to finalize delivery";
      if (error?.error?.message) reason = "❌ " + error.error.message;
      else if (error?.data?.message) reason = "❌ " + error.data.message;
      else if (error?.reason) reason = "❌ " + error.reason;
      else if (error?.message) reason = "❌ " + error.message;

      setMessage(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-lg border border-gray-200">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">
        Finalize Delivery
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Wallet Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connected Wallet
          </label>
          <input
            type="text"
            value={address || "Not Connected"}
            readOnly
            className="w-full border-gray-300 rounded-lg shadow-sm p-2 bg-gray-100 text-gray-800"
          />
        </div>

        {/* Order ID (from props) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order ID
          </label>
          <p className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium">
            {blockchainOrderId || "N/A"}
          </p>
        </div>

        {/* ✅ Disable finalize button if already finalized */}
        <LoadingButton
          type={!isFinalized ? "submit" : "button"}
          isLoading={loading}
          disabled={isFinalized}
          className={`w-full ${
            isFinalized
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          } text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out`}
        >
          {isFinalized
            ? "Already Finalized"
            : loading
            ? "Finalizing..."
            : "Finalize Delivery"}
        </LoadingButton>
      </form>

      {message && <p className="mt-4 text-gray-800 font-medium">{message}</p>}
    </div>
  );
}
