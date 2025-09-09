import React, { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { createReservation } from "../../../utils/api";
import deliveryAbi from "../../../abi/DeliveryManagement.json";
import escrowAbi from "../../../abi/PaymentEscrow.json";
import podAbi from "../../../abi/ProofOfDelivery.json";

const DELIVERY_ADDRESS = import.meta.env.VITE_DELIVERY_ADDRESS;
const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_ADDRESS;
const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;

export default function CreateDelivery({
  truckId,
  origin,
  destination,
  eta,
  payee,
  onSuccess,
  reservationData
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!window.ethereum) throw new Error("MetaMask not detected");
      
      // // First create the reservation in the database
      // if (reservationData) {
      //   try {
      //     setLoading(true);
      //     const response = await createReservation(reservationData);
      //     toast.success("Reservation created successfully");
      //     console.log("✅ Reservation created:", response);
      //   } catch (error) {
      //     console.error("❌ Error creating reservation:", error);
      //     toast.error(error.message || "Failed to create reservation");
      //     return; // Stop here if reservation creation fails
      //   }
      // }

      // ✅ validations
      if (!truckId || !origin || !destination)
        throw new Error("Missing truckId/origin/destination");
      if (!eta || isNaN(Number(eta)))
        throw new Error("ETA must be a valid unix timestamp");
      if (!ethers.isAddress(payee)) throw new Error("Invalid payee address");
      if (!amount || isNaN(Number(amount)))
        throw new Error("Amount must be a number");

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      /* ---------------- 1️⃣ Create Delivery ---------------- */
      const deliveryContract = new ethers.Contract(
        DELIVERY_ADDRESS,
        deliveryAbi,
        signer
      );
      const tx1 = await deliveryContract.createDelivery(
        truckId,
        origin,
        destination,
        Number(eta)
      );
      const receipt1 = await tx1.wait();

      const event = receipt1.logs
        .map((log) => {
          try {
            return deliveryContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .find((e) => e.name === "DeliveryCreated");

      const orderId = event?.args?.orderId?.toString();
      if (!orderId) throw new Error("OrderId not found in logs");

      console.log("✅ Delivery created, OrderId:", orderId);

      /* ---------------- 2️⃣ Assign Carrier ---------------- */
      const txAssign = await deliveryContract.assignCarrier(orderId, payee);
      await txAssign.wait();

      console.log("✅ Carrier assigned");

      /* ---------------- 3️⃣ Create Escrow ETH ---------------- */
      const escrowContract = new ethers.Contract(
        ESCROW_ADDRESS,
        escrowAbi,
        signer
      );
      const tx2 = await escrowContract.createEscrowETH(orderId, payee, {
        value: ethers.parseEther(amount.toString()),
      });
      await tx2.wait();

      console.log("✅ Escrow created");

      /* ---------------- 4️⃣ Initialize Proof of Delivery ---------------- */
      const podContract = new ethers.Contract(POD_ADDRESS, podAbi, signer);
      const tx3 = await podContract.initProof(orderId);
      await tx3.wait();

      console.log("✅ Proof initialized");

      // 🔔 Notify parent
      if (onSuccess) onSuccess(orderId);

      setAmount("");
    } catch (err) {
      console.error("❌ Error creating delivery:", err);
      alert(`Error: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };
const handle = () => {
  console.log(`
  truck id : ${truckId} \n
  origin : ${origin} \n
  dest : ${destination} \n
  payee : ${payee} \n
  amount : ${amount}
  `)
}
  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 space-y-4 rounded-xl shadow w-[400px]"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Truck ID
        </label>
        <input
          value={truckId}
          className="w-full p-2 rounded bg-gray-50"
          readOnly
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Origin
        </label>
        <input
          value={origin}
          className="w-full p-2 rounded bg-gray-50"
          readOnly
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Destination
        </label>
        <input
          value={destination}
          className="w-full p-2 rounded bg-gray-50"
          readOnly
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">ETA</label>
        <input
          value={new Date(eta * 1000).toLocaleString()}
          className="w-full p-2 rounded bg-gray-50"
          readOnly
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Carrier Address
        </label>
        <input
          value={payee}
          className="w-full p-2 rounded bg-gray-50 font-mono text-sm"
          readOnly
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Amount (ETH)
        </label>
        <input
          name="amount"
          placeholder="Enter amount in ETH"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          type="number"
          step="0.01"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`px-4 py-2 ${loading ? 'bg-blue-400' : 'bg-blue-600'} text-white rounded w-full flex items-center justify-center space-x-2`}
      >
        {loading && (
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {loading ? "Processing..." : "Create Delivery"}
      </button>
    </form>
  );
}
