"use client";

import {
  useCurrentAccount,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { userProfile, setUserProfile, logout: clearStore } = useAuthStore();

  const signOut = () => {
    disconnect();
    clearStore();
  };

  return {
    /** The connected wallet account (null if not connected) */
    account,
    /** Wallet address string (null if not connected) */
    onechainAddress: account?.address ?? null,
    /** Whether a wallet is connected */
    isWalletConnected: !!account,
    /** Alias — wallet connection is the auth gate */
    isAuthenticated: !!account,
    /** Optional user profile from the backend */
    userProfile,
    setUserProfile,
    /** Disconnect wallet and clear local state */
    signOut,
  };
}
