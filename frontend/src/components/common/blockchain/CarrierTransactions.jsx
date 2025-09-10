import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import escrowAbi from "../../../abi/PaymentEscrow.json";
import deliveryAbi from "../../../abi/DeliveryManagement.json";
import { useActiveAccount } from "thirdweb/react";
import { FileText } from "lucide-react";

const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_ADDRESS;
const DELIVERY_ADDRESS = import.meta.env.VITE_DELIVERY_ADDRESS;

export default function CarrierTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const account = useActiveAccount();
  const address = account?.address;

  useEffect(() => {
    if (!address) return;

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, provider);
        const delivery = new ethers.Contract(DELIVERY_ADDRESS, deliveryAbi, provider);

        const nextOrderId = await delivery.nextOrderId();
        const txs = [];

        for (let id = 1; id < nextOrderId; id++) {
          try {
            const e = await escrow.getEscrow(id);

            if (e.payee.toLowerCase() === address.toLowerCase()) {
              txs.push({
                orderId: id,
                payer: e.payer,
                payee: e.payee,
                amount: ethers.formatEther(e.amount),
                tokenType: e.tokenType === 0 ? "ETH" : "ERC20",
                released: e.released,
              });
            }
          } catch {
            // ignore if escrow not found for this orderId
          }
        }

        setTransactions(txs);
      } catch (err) {
        console.error("Error fetching carrier transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        My Escrow Transactions
      </h2>

      {loading ? (
        <p className="text-gray-500">Loading transactions...</p>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            No Transactions Yet
          </h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Once you start making deliveries and payments are locked in escrow,
            they will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Order ID</th>
                <th className="p-2">Payer</th>
                <th className="p-2">Amount</th>
                {/* <th className="p-2">Token</th> */}
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.orderId} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{tx.orderId}</td>
                  <td className="p-2 truncate">{tx.payer}</td>
                  <td className="p-2">{tx.amount}</td>
                  {/* <td className="p-2">{tx.tokenType}</td> */}
                  <td
                    className={`p-2 font-semibold ${
                      tx.released ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {tx.released ? "Released" : "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
