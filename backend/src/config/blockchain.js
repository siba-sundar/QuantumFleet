// backend/config/blockchain.js
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import dotenv from "dotenv";
dotenv.config();

// Initialize SDK with Thirdweb Secret Key
const sdk = new ThirdwebSDK("sepolia", {
  secretKey: process.env.THIRDWEB_SECRET_KEY,
});

// Load contracts
const DELIVERY_ADDRESS = process.env.DELIVERY_ADDRESS;
const POD_ADDRESS = process.env.POD_ADDRESS;
const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS;
const ACCESS_ADDRESS = process.env.ACCESS_ADDRESS;

export async function loadContracts() {
  const deliveryContract = await sdk.getContract(DELIVERY_ADDRESS);
  const podContract = await sdk.getContract(POD_ADDRESS);
  const escrowContract = await sdk.getContract(ESCROW_ADDRESS);
  const accessContract = await sdk.getContract(ACCESS_ADDRESS);
  return { deliveryContract, podContract, escrowContract, accessContract };
}

/* ---------------- DeliveryManagement ---------------- */

export async function createDelivery(truckId, origin, destination, eta) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("createDelivery", [truckId, origin, destination, eta]);
}

export async function assignCarrier(orderId, carrier) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("assignCarrier", [orderId, carrier]);
}

export async function setStatus(orderId, status) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("setStatus", [orderId, status]);
}

export async function markDeliveredFromPoD(orderId) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("markDeliveredFromPoD", [orderId]);
}

export async function getDelivery(orderId) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("getDelivery", [orderId]);
}

export async function getAssignedCarrier(orderId) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("getAssignedCarrier", [orderId]);
}

/* ---------------- PaymentEscrow ---------------- */

export async function createEscrowETH(orderId, payee, amount) {
  const { escrowContract } = await loadContracts();
  return await escrowContract.call("createEscrowETH", [orderId, payee], { value: amount });
}

export async function createEscrowERC20(orderId, payee, token, amount) {
  const { escrowContract } = await loadContracts();
  return await escrowContract.call("createEscrowERC20", [orderId, payee, token, amount]);
}

export async function releasePayment(orderId) {
  const { escrowContract } = await loadContracts();
  return await escrowContract.call("releasePayment", [orderId]);
}

export async function refund(orderId) {
  const { escrowContract } = await loadContracts();
  return await escrowContract.call("refund", [orderId]);
}

export async function getEscrow(orderId) {
  const { escrowContract } = await loadContracts();
  return await escrowContract.call("escrows", [orderId]);
}

/* ---------------- ProofOfDelivery ---------------- */

export async function initProof(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("initProof", [orderId]);
}

export async function addCheckpoint(orderId, latE6, lonE6, ts) {
  const { podContract } = await loadContracts();
  return await podContract.call("addCheckpoint", [orderId, latE6, lonE6, ts]);
}

// For meta-tx finalization with carrier signature
export async function finalizePoD(orderId, payee, deadline, sig) {
  const { podContract } = await loadContracts();
  const { v, r, s } = sig;
  return await podContract.call("finalizeWithSig", [orderId, payee, deadline, v, r, s]);
}


export async function isFinalized(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("isFinalized", [orderId]);
}

export async function getCheckpoints(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("getCheckpoints", [orderId]);
}

/* ---------------- AccessRegistry ---------------- */

export async function grantRole(account, role) {
  const { accessContract } = await loadContracts();
  return await accessContract.call("grantRole", [account, role]);
}

export async function revokeRole(account, role) {
  const { accessContract } = await loadContracts();
  return await accessContract.call("revokeRole", [account, role]);
}

export async function hasRole(account, role) {
  const { accessContract } = await loadContracts();
  return await accessContract.call("hasRole", [account, role]);
}

// Export sdk for low-level access if needed
export { sdk };
