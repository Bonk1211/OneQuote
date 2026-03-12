"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import type { BaseOverheads } from "@/types/database";

export function useOverheads() {
  const account = useCurrentAccount();

  return useQuery<Partial<BaseOverheads>>({
    queryKey: ["overheads"],
    queryFn: () =>
      apiFetch<Partial<BaseOverheads>>("/api/overheads/", {
        token: account?.address,
      }),
    enabled: !!account?.address,
  });
}

interface OverheadUpdatePayload {
  insurance_monthly?: number;
  vehicle_monthly?: number;
  tools_equipment_monthly?: number;
  software_monthly?: number;
  rent_workspace_monthly?: number;
  phone_internet_monthly?: number;
  accounting_monthly?: number;
  marketing_monthly?: number;
  training_monthly?: number;
  other_fixed_monthly?: number;
  other_fixed_description?: string;
  income_tax_rate?: number;
  national_insurance_rate?: number;
  vat_registered?: boolean;
  vat_rate?: number;
  working_days_per_week?: number;
  working_weeks_per_year?: number;
  working_hours_per_day?: number;
  desired_annual_salary?: number;
  desired_profit_margin?: number;
}

export function useSaveOverheads() {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();

  return useMutation<Partial<BaseOverheads>, Error, OverheadUpdatePayload>({
    mutationFn: (payload) =>
      apiFetch<Partial<BaseOverheads>>("/api/overheads/", {
        method: "PUT",
        token: account?.address,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overheads"] });
    },
  });
}
