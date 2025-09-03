// services/accessService.js
import { loadContracts } from "../config/contracts.js";

// ---- Write functions ----
async function grantRole(account, role) {
  const { accessContract } = await loadContracts();
  return await accessContract.call("grantRole", [account, role]);
}

async function revokeRole(account, role) {
  const { accessContract } = await loadContracts();
  return await accessContract.call("revokeRole", [account, role]);
}

// ---- Read functions ----
async function hasRole(account, role) {
  const { accessContract } = await loadContracts();
  return await accessContract.call("hasRole", [account, role]);
}

export { grantRole, revokeRole, hasRole };
