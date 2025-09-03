// services/podService.js
import { loadContracts } from "../config/contracts.js";

// ---- Write ----
async function initProof(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("initProof", [orderId]);
}

async function addCheckpoint(orderId, latE6, lonE6, ts) {
  const { podContract } = await loadContracts();
  return await podContract.call("addCheckpoint", [orderId, latE6, lonE6, ts]);
}

async function finalize(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("finalize", [orderId]);
}

// ---- Read ----
async function proofExists(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("proofExists", [orderId]);
}

async function isFinalized(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("isFinalized", [orderId]);
}

async function getCheckpoints(orderId) {
  const { podContract } = await loadContracts();
  return await podContract.call("getCheckpoints", [orderId]);
}

export { initProof, addCheckpoint, finalize, proofExists, isFinalized, getCheckpoints };
