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

export function useUpdateQuote(id: string) {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();

  return useMutation<Quote, Error, Partial<Quote>>({
    mutationFn: (data) =>
      apiFetch<Quote>(`/api/quotes/${id}`, {
        method: "PATCH",
        token: account?.address,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useUpdateProject(id: string) {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, { title?: string; description?: string; client_name?: string }>({
    mutationFn: (data) =>
      apiFetch(`/api/projects/${id}`, {
        method: "PATCH",
        token: account?.address,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
    },
  });
}

export function useUpdateUserProfile() {
  const account = useCurrentAccount();

  return useMutation<Record<string, unknown>, Error, { business_name?: string }>({
    mutationFn: (data) =>
      apiFetch(`/api/users/me`, {
        method: "PUT",
        token: account?.address,
        body: JSON.stringify(data),
      }),
  });
}

export function useDownloadQuotePdf(id: string) {
  const account = useCurrentAccount();

  const download = async () => {
    if (!account?.address) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(
      `${apiUrl}/api/quotes/${id}/pdf`,
      { headers: { Authorization: `Bearer ${account.address}` } }
    );
    if (!res.ok) throw new Error("PDF download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuoteGuard-${id.slice(0, 8).toUpperCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return { download };
}
