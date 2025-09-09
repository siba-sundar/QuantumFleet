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
  reservationData,
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!window.ethereum) throw new Error("MetaMask not detected");
      if (!truckId || !origin || !destination)
        throw new Error("Missing truckId/origin/destination");
      if (!eta || isNaN(Number(eta)))
        throw new Error("ETA must be a valid UNIX timestamp");
      if (!ethers.isAddress(payee)) throw new Error("Invalid payee address");
      if (!amount || isNaN(Number(amount)))
        throw new Error("Amount must be a number");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1️⃣ Create Delivery
      const deliveryContract = new ethers.Contract(
        DELIVERY_ADDRESS,
        deliveryAbi,
        signer
      );
      let orderId;
      try {
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
        orderId = event?.args?.orderId?.toString();
        if (!orderId) throw new Error("OrderId not found in logs");
        console.log("[✅ Delivery Created] OrderId:", orderId);
      } catch (err) {
        console.error("Failed to create delivery:", err);
        throw new Error("Create Delivery failed");
      }

      // 2️⃣ Assign Carrier
      try {
        const txAssign = await deliveryContract.assignCarrier(orderId, payee);
        await txAssign.wait();
        console.log("[✅ Carrier Assigned]", payee);
      } catch (err) {
        console.error("Failed to assign carrier:", err);
        throw new Error("Assign Carrier failed");
      }

      // 3️⃣ Create Escrow (ETH)
      const escrowContract = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, signer);
      try {
        const tx2 = await escrowContract.createEscrowETH(orderId, payee, {
          value: ethers.parseEther(amount.toString()),
        });
        await tx2.wait();
        console.log("[✅ Escrow Created] Amount:", amount);
      } catch (err) {
        console.error("Failed to create escrow:", err);
        throw new Error("Create Escrow failed");
      }

      // 4️⃣ Initialize PoD
      const podContract = new ethers.Contract(POD_ADDRESS, podAbi, signer);
      try {
        const tx3 = await podContract.initProof(orderId);
        await tx3.wait();
        console.log("[✅ PoD Initialized]");
      } catch (err) {
        console.error("Failed to init PoD:", err);
        throw new Error("Init PoD failed");
      }

      // 5️⃣ Add Checkpoints
      if (reservationData?.trucks) {
        for (const truck of reservationData.trucks) {
          if (truck.checkpoints?.length > 0) {
            try {
              const latE6s = truck.checkpoints.map((cp) => {
                const val = Math.round(Number(cp.latitude) * 1e6);
                if (val > 2 ** 255 - 1 || val < -(2 ** 255)) {
                  throw new Error("Latitude out of int256 range");
                }
                return val;
              });

              const lonE6s = truck.checkpoints.map((cp) => {
                const val = Math.round(Number(cp.longitude) * 1e6);
                if (val > 2 ** 255 - 1 || val < -(2 ** 255)) {
                  throw new Error("Longitude out of int256 range");
                }
                return val;
              });

              const plannedTimes = truck.checkpoints.map((cp) => {
                const val = Math.floor(Number(cp.timestamp / 1000));
                if (val < 0) throw new Error("Invalid timestamp");
                return val;
              });

              const txCheckpoints = await podContract.createProofWithCheckpoints(
                Number(orderId),
                latE6s,
                lonE6s,
                plannedTimes
              );
              await txCheckpoints.wait();
              console.log(`[✅ Checkpoints added for Truck ${truck.truckId}]`);
            } catch (err) {
              console.error(`Failed to add checkpoints for Truck ${truck.truckId}:`, err);
              throw new Error(`Checkpoints update failed for Truck ${truck.truckId}`);
            }
          }
        }
      }

      // 6️⃣ Save reservation in DB
      if (reservationData) {
        try {
          const finalReservationData = {
            ...reservationData,
            blockchainOrderId: orderId,
            status: "Pending",
            createdAt: new Date().toISOString(),
          };
          const response = await createReservation(finalReservationData);
          if (!response.success) throw new Error("Failed to save reservation");
          console.log("[✅ Reservation saved in DB]");
        } catch (err) {
          console.error("DB save error:", err);
          toast.error("Blockchain successful but DB update failed");
        }
      }

      setAmount("");
      if (onSuccess) onSuccess(orderId);
      toast.success("Delivery created successfully!");
    } catch (err) {
      console.error("Transaction Error:", err);
      toast.error(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="p-6 space-y-5 rounded-2xl shadow-lg mx-auto bg-white max-w-md"
    >
      <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
        Create Delivery
      </h2>

      <InputField label="Truck ID" value={truckId} readOnly />
      <InputField label="Origin" value={origin} readOnly />
      <InputField label="Destination" value={destination} readOnly />
      <InputField label="ETA" value={new Date(eta * 1000).toLocaleString()} readOnly />
      <InputField label="Carrier Address" value={payee} readOnly fontMono />
      <InputField
        label="Amount (ETH)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        step="0.01"
        required
      />

      {reservationData?.trucks?.map((truck, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-2">
            Checkpoints for Truck {truck.truckId}
          </h3>
          {truck.checkpoints?.length > 0 ? (
            truck.checkpoints.map((cp, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Lat: {Math.round(cp.latitude * 1e6)}</span>
                <span>Lon: {Math.round(cp.longitude * 1e6)}</span>
                <span>Time: {cp.timestamp / 1000}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No checkpoints</p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 mt-3 text-white font-semibold rounded-xl flex justify-center items-center ${
          loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading && (
          <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {loading ? "Processing..." : "Create Delivery"}
      </button>
    </form>
  );
}

// Reusable Input Field
function InputField({ label, value, onChange, readOnly, type, step, required, fontMono }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        type={type || "text"}
        step={step}
        required={required}
        className={`w-full p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          fontMono ? "font-mono text-sm" : "bg-gray-50"
        }`}
      />
    </div>
  );
}
