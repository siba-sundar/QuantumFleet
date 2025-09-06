// frontend\src\utils\blockchain_signatures.js
import { ethers } from "ethers";
import { sdk } from "../config/blockchain";

// Domain info for EIP-712
const DOMAIN = {
  name: "ProofOfDelivery",
  version: "1",
  chainId: 11155111, // Sepolia
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
 * - Fetches nonce from contract
 * - Generates deadline
 * - Signs typed data in one step
 * @param {ethers.Signer} signer - The wallet signer (Metamask / injected)
 * @param {number} orderId - Order ID to finalize
 * @param {string} payee - Recipient of payment
 * @param {number} secondsFromNow - Optional deadline offset in seconds (default 1h)
 * @returns {Promise<{v:number,r:string,s:string, deadline:number, nonce:number}>} - Signature + metadata
 */
export async function signFinalizePoD(signer, orderId, payee, secondsFromNow = 3600) {
  // Get the PoD contract instance from sdk
  const podContract = await sdk.getContract(import.meta.env.VITE_POD_ADDRESS);

  // Fetch nonce
  const nonce = await podContract.call("nonces", [orderId]);

  // Compute deadline
  const deadline = Math.floor(Date.now() / 1000) + secondsFromNow;

  // Prepare typed data
  const value = { orderId, payee, nonce, deadline };

  // Sign typed data using injected wallet
  const signature = await signer._signTypedData(DOMAIN, { Finalize: FINALIZE_TYPE }, value);

  // Split signature
  const sig = ethers.utils.splitSignature(signature);

  return { v: sig.v, r: sig.r, s: sig.s, deadline, nonce };
}
