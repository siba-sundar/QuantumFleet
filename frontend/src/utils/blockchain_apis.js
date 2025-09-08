// frontend/src/utils/blockchain_apis.js
import { ethers } from "ethers";
import { loadContracts } from "../config/blockchain"; // ✅ use loader
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE;
const POD_ADDRESS = import.meta.env.VITE_POD_ADDRESS;

// Domain info for EIP-712
const DOMAIN = {
  name: "ProofOfDelivery",
  version: "1",
  chainId: 11155111, // Sepolia
  verifyingContract: POD_ADDRESS,
};

// Type definition for EIP-712 Finalize
const FINALIZE_TYPE = [
  { name: "orderId", type: "uint256" },
  { name: "payee", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
];

/* ---------------- AccessRegistry API ---------------- */
export async function apiGrantRole(account, role) {
  return axios.post(`${BASE_URL}/access/grant`, { account, role });
}

export async function apiRevokeRole(account, role) {
  return axios.post(`${BASE_URL}/access/revoke`, { account, role });
}

export async function apiHasRole(account, role) {
  return axios.get(`${BASE_URL}/access/has/${account}/${role}`);
}

/* ---------------- DeliveryManagement API ---------------- */

// 1️⃣ Create Full Delivery Flow
export async function apiCreateDelivery({ truckId, origin, destination, eta, payee, amount }) {
  return axios.post(`${BASE_URL}/delivery/create`, {
    truckId,
    origin,
    destination,
    eta,
    payee,
    amount,
  });
}

// 2️⃣ Finalize Delivery Flow (meta-tx style)
export async function apiFinalizeDelivery(signer, orderId, payee) {
  // 1️⃣ Load PoD contract
  const { podContract } = await loadContracts();

  // 2️⃣ Fetch nonce from blockchain
  const nonce = await podContract.call("nonces", [orderId]);

  // 3️⃣ Compute deadline (1 hour from now)
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  // 4️⃣ Prepare typed data
  const value = { orderId, payee, nonce, deadline };

  // 5️⃣ Sign off-chain using EIP-712
  const signature = await signer._signTypedData(DOMAIN, { Finalize: FINALIZE_TYPE }, value);
  const { v, r, s } = ethers.utils.splitSignature(signature);

  // 6️⃣ Send to backend (relayer will broadcast on-chain)
  const response = await axios.post(`${BASE_URL}/delivery/finalize`, {
    orderId,
    payee,
    deadline,
    sig: { v, r, s },
  });

  return response.data;
}

// 3️⃣ Cancel Delivery Flow
export async function apiCancelDelivery(orderId) {
  return axios.post(`${BASE_URL}/delivery/cancel`, { orderId });
}

// 4️⃣ Assign Carrier & Link Escrow
export async function apiAssignCarrier(orderId, carrier) {
  return axios.post(`${BASE_URL}/delivery/assign-carrier`, { orderId, carrier });
}

// 5️⃣ Live Tracking (Add Checkpoint + Status Update)
export async function apiAddCheckpoint(orderId, latE6, lonE6, ts, status) {
  return axios.post(`${BASE_URL}/delivery/checkpoint`, {
    orderId,
    latE6,
    lonE6,
    ts,
    status,
  });
}

// 6️⃣ Full Delivery Audit (Read-only)
export async function apiGetDeliveryAudit(orderId) {
  return axios.get(`${BASE_URL}/delivery/${orderId}/audit`);
}

/* ---------------- ProofOfDelivery API (if needed separately) ---------------- */
export async function apiInitProof(orderId) {
  return axios.post(`${BASE_URL}/pod/init`, { orderId });
}

export async function apiGetCheckpoints(orderId) {
  return axios.get(`${BASE_URL}/pod/${orderId}/checkpoints`);
}

export async function apiGetProofStatus(orderId) {
  return axios.get(`${BASE_URL}/pod/${orderId}/status`);
}
