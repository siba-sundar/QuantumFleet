import { sdk } from "./blockchain.js";

// Load addresses from .env
const DELIVERY_ADDRESS = process.env.DELIVERY_ADDRESS;
const POD_ADDRESS = process.env.POD_ADDRESS;
const ACCESS_ADDRESS = process.env.ACCESS_ADDRESS;

async function loadContracts() {
  const deliveryContract = await sdk.getContract(DELIVERY_ADDRESS);
  const podContract = await sdk.getContract(POD_ADDRESS);
  const accessContract = await sdk.getContract(ACCESS_ADDRESS);

  return {
    deliveryContract,
    podContract,
    accessContract,
  };
}

export { loadContracts };
