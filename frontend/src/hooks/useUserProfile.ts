"use client";

import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api";
import { useEffect } from "react";

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  business_name?: string;
  business_type?: string;
  trade_category?: string;
  country_code?: string;
  currency_code?: string;
  onechain_address?: string;
  onboarding_completed?: boolean;
}

export function useUserProfile() {
  const account = useCurrentAccount();
  const { setUserProfile } = useAuthStore();

  const query = useQuery<UserProfile>({
    queryKey: ["userProfile", account?.address],
    queryFn: () =>
      apiFetch<UserProfile>("/api/auth/me", {
        token: account?.address,
      }),
    enabled: !!account?.address,
  });

  // Sync backend profile into Zustand store
  useEffect(() => {
    if (query.data) {
      setUserProfile({
        id: query.data.id,
        email: query.data.email,
        full_name: query.data.full_name,
        business_name: query.data.business_name,
      });
    }
  }, [query.data, setUserProfile]);

  return query;
}
