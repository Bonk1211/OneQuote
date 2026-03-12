"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import type { Quote, Milestone } from "@/types/database";

interface QuoteDetail extends Quote {
  projects: {
    id: string;
    title: string;
    status: string;
    client_name: string | null;
    client_email: string | null;
    escrow_object_id: string | null;
    milestones: Milestone[];
  } | null;
}

interface QuoteListItem extends Quote {
  projects: {
    title: string;
    status: string;
    client_name: string | null;
  } | null;
}

export function useQuotes() {
  const account = useCurrentAccount();

  return useQuery<QuoteListItem[]>({
    queryKey: ["quotes"],
    queryFn: () =>
      apiFetch<QuoteListItem[]>("/api/quotes/", {
        token: account?.address,
      }),
    enabled: !!account?.address,
  });
}

export function useQuote(id: string) {
  const account = useCurrentAccount();

  return useQuery<QuoteDetail>({
    queryKey: ["quotes", id],
    queryFn: () =>
      apiFetch<QuoteDetail>(`/api/quotes/${id}`, {
        token: account?.address,
      }),
    enabled: !!account?.address && !!id,
  });
}

export function useUpdateQuoteStatus(id: string) {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();

  return useMutation<Quote, Error, string>({
    mutationFn: (status: string) =>
      apiFetch<Quote>(`/api/quotes/${id}/status?status=${encodeURIComponent(status)}`, {
        method: "PATCH",
        token: account?.address,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}
