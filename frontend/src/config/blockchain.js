// frontend/config/blockchain.js
// frontend/config/blockchain.js
// import { ThirdwebSDK } from "@thirdweb-dev/sdk";

// ⚡ Initialize SDK with the browser wallet (MetaMask / WalletConnect)
// if (!window.ethereum) {
//   throw new Error("No injected Ethereum provider found. Please install MetaMask.");
// }
// const sdk = new ThirdwebSDK(window.ethereum);

// 📌 Load contract instances
// const DELIVERY_ADDRESS = import.meta.env.VITE_DELIVERY_ADDRESS;
// const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;
// const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_ADDRESS;
// const ACCESS_ADDRESS = import.meta.env.VITE_ACCESS_ADDRESS;

export async function loadContracts() {
  //   const deliveryContract = await sdk.getContract(DELIVERY_ADDRESS);
  //   const podContract = await sdk.getContract(POD_ADDRESS);
  //   const escrowContract = await sdk.getContract(ESCROW_ADDRESS);
  //   const accessContract = await sdk.getContract(ACCESS_ADDRESS);
  //   return { deliveryContract, podContract, escrowContract, accessContract };
  console.warn("Blockchain disabled");
  return {};
}

/* ---------------- DeliveryManagement ---------------- */

export async function createDelivery(truckId, origin, destination, eta) {
  return null;
}

export async function assignCarrier(orderId, carrier) {
  return null;
}

export async function setStatus(orderId, status) {
  return null;
}

export async function markDeliveredFromPoD(orderId) {
  return null;
}

export async function getDelivery(orderId) {
  return null;
}

export async function getAssignedCarrier(orderId) {
  return null;
}

/* ---------------- PaymentEscrow ---------------- */

export async function createEscrowETH(orderId, payee, amount) {
  return null;
}

export async function createEscrowERC20(orderId, payee, token, amount) {
  return null;
}

export async function releasePayment(orderId) {
  return null;
}

export async function refund(orderId) {
  return null;
}

export async function getEscrow(orderId) {
  return null;
}

/* ---------------- ProofOfDelivery ---------------- */

export async function initProof(orderId) {
  return null;
}

export async function addCheckpoint(orderId, latE6, lonE6, ts) {
  return null;
}

// For meta-tx finalization with carrier signature
export async function finalizePoD(orderId, payee, deadline, sig) {
  return null;
}

export async function isFinalized(orderId) {
  return null;
}

export async function getCheckpoints(orderId) {
  return null;
}

/* ---------------- AccessRegistry ---------------- */

export async function grantRole(account, role) {
  return null;
}

export async function revokeRole(account, role) {
  return null;
}

export async function hasRole(account, role) {
  return null;
}

// Export sdk if you need direct access
export const sdk = null;
