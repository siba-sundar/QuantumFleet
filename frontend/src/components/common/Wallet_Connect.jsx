// Wallet_Connect.jsx
import React from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

const client = createThirdwebClient({
  clientId: "3d4a668e5441b2f589fb6ca07943ae6c",
});

const wallets = [
  inAppWallet({
    auth: {
      options: ["google"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

export default function Wallet_Connect({ onWalletConnected }) {
  const account = useActiveAccount();

  // Whenever account changes, notify parent
  React.useEffect(() => {
    if (account?.address && onWalletConnected) {
      onWalletConnected(account.address);
    }
  }, [account, onWalletConnected]);

  return (
    <ConnectButton
      client={client}
      connectModal={{ size: "compact" }}
      wallets={wallets}
    />
  );
}
