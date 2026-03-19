"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  useCurrentAccount,
  useAutoConnectWallet,
} from "@mysten/dapp-kit";
import { useUserProfile } from "@/hooks/useUserProfile";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const account = useCurrentAccount();
  const autoConnectStatus = useAutoConnectWallet();
  const router = useRouter();

  // Auto-fetch profile once wallet is connected (populates Zustand store)
  useUserProfile();

  // Auto-connect still in progress — show loader
  if (autoConnectStatus === "idle") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Auto-connect finished (attempted/disabled) but no account — redirect
  if (!account) {
    router.replace("/login");
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-zinc-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
