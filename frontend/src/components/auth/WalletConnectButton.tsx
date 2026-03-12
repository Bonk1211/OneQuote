"use client";

import { ConnectButton } from "@mysten/dapp-kit";

interface WalletConnectButtonProps {
  className?: string;
}

/**
 * Thin wrapper around the dApp Kit ConnectButton for use in custom layouts.
 */
export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  return (
    <div className={className}>
      <ConnectButton />
    </div>
  );
}
