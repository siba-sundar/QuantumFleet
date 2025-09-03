// services/deliveryService.js
import { loadContracts } from "../config/contracts.js";

// ---- Write ----
async function createDelivery(orderId, sender, receiver, details) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("createDelivery", [
    orderId,
    sender,
    receiver,
    details,
  ]);
}

async function updateDelivery(orderId, status) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("updateDelivery", [orderId, status]);
}

// Called by PoD contract in Solidity, but can also be called directly
async function markDeliveredFromPoD(orderId) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("markDeliveredFromPoD", [orderId]);
}

// ---- Read ----
async function getDelivery(orderId) {
  const { deliveryContract } = await loadContracts();
  return await deliveryContract.call("getDelivery", [orderId]);
}

export { createDelivery, updateDelivery, markDeliveredFromPoD, getDelivery };
