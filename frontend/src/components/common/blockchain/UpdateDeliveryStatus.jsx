import React, { useState } from "react";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { ethers } from "ethers";
// import axios from "axios";
import deliveryAbi from "../../../abi/DeliveryManagement.json";
// Enum mapping to match smart contract integers
const STATUS_ENUM = {
  // Created: 0,
  InTransit: 1,
  // Delivered: 2,
  Cancelled: 3,
};

export default function UpdateDeliveryStatus() {
  const [formData, setFormData] = useState({
    orderId: "",
    status: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setIsLoading(true);

  //   try {
  //     const statusInt = STATUS_ENUM[formData.status];
  //     if (statusInt === undefined) {
  //       toast.error("Invalid status selected");
  //       return;
  //     }

  //     // 1️⃣ Connect to wallet
  //     if (!window.ethereum) throw new Error("MetaMask not found");
  //     const provider = new ethers.BrowserProvider(window.ethereum); // ✅ v6 change
  //     const signer = await provider.getSigner();
  //     const signerAddress = await signer.getAddress();

  //     // 2️⃣ Define EIP-712 domain + types
  //     const domain = {
  //       name: "DeliveryManagement",
  //       version: "1",
  //       chainId: 11155111, // Sepolia testnet
  //       verifyingContract: import.meta.env.VITE_DELIVERY_ADDRESS, // ⚡ replace with deployed Delivery contract address
  //     };

  //     const types = {
  //       StatusUpdate: [
  //         { name: "orderId", type: "uint256" },
  //         { name: "status", type: "uint8" },
  //         { name: "nonce", type: "uint256" },
  //         { name: "deadline", type: "uint256" },
  //       ],
  //     };

  //     // 3️⃣ Prepare message values
  //     const orderId = parseInt(formData.orderId);
  //     const deadline = Math.floor(Date.now() / 1000) + 3600; // valid for 1 hour
  //     const nonce = 0; // ⚡ replace with actual nonce if contract tracks it

  //     const value = { orderId, status: statusInt, nonce, deadline };

  //     // 4️⃣ Request signature (ethers v6)
  //     const signature = await signer.signTypedData(domain, types, value);
  //     const sig = ethers.Signature.from(signature); // parse sig parts

  //     // 5️⃣ Call backend relayer
  //     const res = await axios.post(`http://localhost:4001/delivery/status`, {
  //       orderId,
  //       status: statusInt,
  //       deadline,
  //       sig,
  //       signer: signerAddress,
  //     });

  //     if (res.data.success) {
  //       toast.success(`Delivery status updated to ${formData.status} ✅`);
  //       setFormData({ orderId: "", status: "" });
  //     } else {
  //       toast.error(res.data.error || "Failed to update status");
  //     }
  //   } catch (error) {
  //     console.error("Error in gasless status update:", error);
  //     toast.error(error.message || "Transaction failed");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      const statusInt = STATUS_ENUM[formData.status];
      if (statusInt === undefined) {
        toast.error("Invalid status selected");
        return;
      }
      if (!formData.orderId) throw new Error("Order ID required");

      // 1️⃣ Connect to MetaMask
      if (!window.ethereum) throw new Error("MetaMask not found");
      const provider = new ethers.BrowserProvider(window.ethereum); // v6
      const signer = await provider.getSigner();

      // 2️⃣ Load Delivery contract
      const deliveryContract = new ethers.Contract(
        import.meta.env.VITE_DELIVERY_ADDRESS,
        deliveryAbi, // <-- make sure you imported ABI at top
        signer
      );

      // 3️⃣ Call update function (example: updateStatus)
      const tx = await deliveryContract.setStatus(
        parseInt(formData.orderId),
        statusInt
      );

      // 4️⃣ Wait for tx confirmation
      await tx.wait();

      toast.success(`✅ Status updated to ${formData.status}`);
      setFormData({ orderId: "", status: "" });
    } catch (error) {
      console.error("❌ Error updating status:", error);
      toast.error(error.reason || error.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">
        Update Delivery Status
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Order ID
          </label>
          <input
            type="text"
            name="orderId"
            value={formData.orderId}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter order ID"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
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
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
          {isLoading ? "Updating..." : "Update Status"}
        </LoadingButton>
      </form>
    </div>
  );
}
