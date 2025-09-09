import React, { useState } from "react";
import { LoadingButton } from "./LoadingButton";
import { useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import podAbi from "../../../abi/ProofOfDelivery.json";
import deliveryAbi from "../../../abi/DeliveryManagement.json";
import accessAbi from "../../../abi/AccessRegistry.json";

const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;
const DELIVERY_ADDRESS = import.meta.env.VITE_DELIVERY_ADDRESS;
const ACCESS_ADDRESS = import.meta.env.VITE_ACCESS_ADDRESS;

export default function FinalizeDelivery() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); // <-- new state

  const account = useActiveAccount();
  const address = account?.address;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); // reset previous message

    if (!address) {
      setMessage("❌ Please connect your wallet first!");
      return;
    }

    const id = parseInt(orderId);
    if (!id || isNaN(id)) {
      setMessage("❌ Please enter a valid Order ID");
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
      const tx = await podContract
        .connect(signer)
        .finalizeDelivery(id, address);
      await tx.wait();

      setMessage("✅ Delivery finalized & payment released!");
      setOrderId("");
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
    <div className="p-6 border rounded-lg bg-white shadow-sm w-full h-full">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">
        Finalize Delivery
      </h2>
      <form onSubmit={handleSubmit}>
        {/* Wallet Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connected Wallet
          </label>
          <input
            type="text"
            value={address || "Not Connected"}
            readOnly
            className="w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 text-gray-800"
          />
        </div>

        {/* Order ID */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order ID
          </label>
          <input
            type="number"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter Order ID"
            className="w-full border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>

        {/* Submit */}
        <LoadingButton
          type="submit"
          isLoading={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
          {loading ? "Finalizing..." : "Finalize Delivery"}
        </LoadingButton>
      </form>

      {/* Display message below form */}
      {message && <p className="mt-4 text-gray-800 font-medium">{message}</p>}
    </div>
  );
}
