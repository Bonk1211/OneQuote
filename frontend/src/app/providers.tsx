"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { useState } from "react";
import { networkConfig, darkTheme } from "@/lib/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect theme={darkTheme}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
