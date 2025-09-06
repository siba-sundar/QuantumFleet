import axios from "axios";

const BASE_URL = import.meta.env.BASE_URL;

/* ---------------- AccessRegistry API ---------------- */
async function apiGrantRole(account, role) {
  return axios.post(`${BASE_URL}/access/grant`, { account, role });
}

async function apiRevokeRole(account, role) {
  return axios.post(`${BASE_URL}/access/revoke`, { account, role });
}

async function apiHasRole(account, role) {
  return axios.get(`${BASE_URL}/access/has/${account}/${role}`);
}

/* ---------------- DeliveryManagement API ---------------- */
async function apiCreateDelivery(orderId, sender, receiver, details) {
  return axios.post(`${BASE_URL}/delivery/create`, { orderId, sender, receiver, details });
}

async function apiUpdateDelivery(orderId, status) {
  return axios.post(`${BASE_URL}/delivery/update`, { orderId, status });
}

async function apiMarkDelivered(orderId) {
  return axios.post(`${BASE_URL}/delivery/mark-delivered`, { orderId });
}

async function apiGetDelivery(orderId) {
  return axios.get(`${BASE_URL}/delivery/${orderId}`);
}

/* ---------------- ProofOfDelivery API ---------------- */
async function apiInitProof(orderId) {
  return axios.post(`${BASE_URL}/pod/init`, { orderId });
}

async function apiAddCheckpoint(orderId, latE6, lonE6, ts) {
  return axios.post(`${BASE_URL}/pod/checkpoint`, { orderId, latE6, lonE6, ts });
}

async function apiFinalize(orderId) {
  return axios.post(`${BASE_URL}/pod/finalize`, { orderId });
}

async function apiGetCheckpoints(orderId) {
  return axios.get(`${BASE_URL}/pod/${orderId}/checkpoints`);
}

async function apiGetProofStatus(orderId) {
  return axios.get(`${BASE_URL}/pod/${orderId}/status`);
}

export {
  apiGrantRole,
  apiRevokeRole,
  apiHasRole,
  apiCreateDelivery,
  apiUpdateDelivery,
  apiMarkDelivered,
  apiGetDelivery,
  apiInitProof,
  apiAddCheckpoint,
  apiFinalize,
  apiGetCheckpoints,
  apiGetProofStatus,
};
