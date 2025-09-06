import { ethers } from "ethers";

// Domain info for EIP-712
const DOMAIN = {
  name: "ProofOfDelivery",
  version: "1",
  chainId: 11155111, // Sepolia, change if needed
  verifyingContract: import.meta.env.VITE_POD_ADDRESS,
};

// Type definition for EIP-712 Finalize
const FINALIZE_TYPE = [
  { name: "orderId", type: "uint256" },
  { name: "payee", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
];

/**
 * Sign a finalize PoD transaction off-chain
 * @param {ethers.Signer} signer - The wallet signer (Metamask / injected)
 * @param {number} orderId - Order ID to finalize
 * @param {string} payee - Recipient of payment
 * @param {number} nonce - Nonce from contract
 * @param {number} deadline - Unix timestamp until signature is valid
 * @returns {Promise<{v:number,r:string,s:string}>} - Signature components
 */
export async function signFinalizeTransaction(signer, orderId, payee, nonce, deadline) {
  const value = { orderId, payee, nonce, deadline };
  const signature = await signer._signTypedData(DOMAIN, { Finalize: FINALIZE_TYPE }, value);

  // Split into v, r, s for contract
  const sig = ethers.utils.splitSignature(signature);
  return { v: sig.v, r: sig.r, s: sig.s };
}

/**
 * Generate deadline timestamp (default +1h)
 * @param {number} secondsFromNow
 * @returns {number}
 */
export function getDeadline(secondsFromNow = 3600) {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

/**
 * Fetch nonce for a given order (from blockchain)
 * @param {object} podContract - thirdweb contract instance
 * @param {number} orderId
 */
export async function getNonce(podContract, orderId) {
  return await podContract.call("nonces", [orderId]);
}
