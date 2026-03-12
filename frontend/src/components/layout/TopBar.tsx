"use client";

import { ConnectButton } from "@mysten/dapp-kit";

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div />
      <ConnectButton />
    </header>
  );
}
