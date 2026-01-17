// frontend/src/utils/blockchain_signatures.js
// import { ethers } from "ethers";
// import { loadContracts } from "../config/blockchain"; // ✅ use loader, not sdk

export async function signFinalizePoD(signer, orderId, payee, secondsFromNow = 3600) {
  console.warn("Blockchain signatures disabled");
  return { v: 0, r: "0x", s: "0x", deadline: 0, nonce: 0 };
}
