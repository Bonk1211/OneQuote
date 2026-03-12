"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const account = useCurrentAccount();
  const router = useRouter();

  useEffect(() => {
    if (account) router.push("/dashboard");
  }, [account, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <h1 className="text-3xl font-bold text-white">
          Quote<span className="text-indigo-400">Guard</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          AI-powered profitability checking for your quotes
        </p>

        <div className="mt-8 flex justify-center">
          <ConnectButton connectText="Connect Wallet to Sign In" />
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          By connecting your wallet, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
