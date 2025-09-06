import React, { useState } from "react";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import axios from "axios";
import abi from "../../../abi/ProofOfDelivery.json";

const BASE_URL = import.meta.env.VITE_API_BASE;
const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;

// EIP-712 Domain
const DOMAIN = {
  name: "ProofOfDelivery",
  version: "1",
  chainId: 11155111, // Sepolia
  verifyingContract: POD_ADDRESS,
};

// EIP-712 Types
const FINALIZE_TYPE = [
  { name: "orderId", type: "uint256" },
  { name: "payee", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
];

export default function FinalizeDelivery() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);

  const account = useActiveAccount();
  const address = account?.address;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please connect your wallet first!");
      return;
    }
    if (!orderId) {
      toast.error("Please enter the Order ID");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Setup provider & signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 2️⃣ Read nonce from PoD contract
      const podContract = new ethers.Contract(POD_ADDRESS, abi, provider);
      const nonce = await podContract.nonces(orderId);

      // 3️⃣ Compute deadline (1h from now)
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // 4️⃣ Prepare typed data
      const value = { orderId, payee: address, nonce: nonce.toString(), deadline };

      // 5️⃣ Sign typed data (EIP-712)
      const signature = await signer.signTypedData(
        DOMAIN,
        { Finalize: FINALIZE_TYPE },
        value
      );

      const { v, r, s } = ethers.Signature.from(signature);

      // 6️⃣ Call backend finalize API
      const response = await axios.post(`${BASE_URL}/delivery/finalize`, {
        orderId,
        payee: address,
        deadline,
        sig: { v, r, s },
      });

      console.log("Finalize Result:", response.data);

      if (response.data.success) {
        toast.success("Delivery finalized & payment released!");
        setOrderId("");
      } else {
        toast.error(response.data.error || "Finalize failed");
      }
    } catch (error) {
      console.error("Finalize Error:", error);
      toast.error(error.response?.data?.error || error.message || "Failed to finalize delivery");
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
    </div>
  );
}
