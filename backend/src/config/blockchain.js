import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import dotenv from "dotenv";

// Load env vars
dotenv.config();

// ✅ Use secret key (recommended for backend)
const sdk = new ThirdwebSDK("sepolia", {
  secretKey: process.env.THIRDWEB_SECRET_KEY, // safer than private key
});

export { sdk };
