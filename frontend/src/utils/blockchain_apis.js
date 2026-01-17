// frontend/src/utils/blockchain_apis.js
// import { ethers } from "ethers";
// import { loadContracts } from "../config/blockchain"; // ✅ use loader

// ... (imports disabled)

export async function apiFinalizeDelivery(signer, orderId, payee) {
  console.warn("Blockchain features disabled");
  return { success: false, error: "Blockchain disabled" };
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
