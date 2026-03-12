"use client";

import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import type { BaseOverheads } from "@/types/database";

const fields = [
  { key: "insurance_monthly", label: "Insurance (monthly)", group: "Fixed Costs" },
  { key: "vehicle_monthly", label: "Vehicle (monthly)", group: "Fixed Costs" },
  { key: "tools_equipment_monthly", label: "Tools & Equipment (monthly)", group: "Fixed Costs" },
  { key: "software_monthly", label: "Software (monthly)", group: "Fixed Costs" },
  { key: "rent_workspace_monthly", label: "Rent / Workspace (monthly)", group: "Fixed Costs" },
  { key: "phone_internet_monthly", label: "Phone & Internet (monthly)", group: "Fixed Costs" },
  { key: "accounting_monthly", label: "Accounting (monthly)", group: "Fixed Costs" },
  { key: "marketing_monthly", label: "Marketing (monthly)", group: "Fixed Costs" },
  { key: "training_monthly", label: "Training / CPD (monthly)", group: "Fixed Costs" },
  { key: "other_fixed_monthly", label: "Other Fixed (monthly)", group: "Fixed Costs" },
  { key: "desired_annual_salary", label: "Desired Annual Salary (pre-tax)", group: "Targets" },
  { key: "desired_profit_margin", label: "Desired Profit Margin (%)", group: "Targets", isPercent: true },
  { key: "income_tax_rate", label: "Income Tax Rate (%)", group: "Tax", isPercent: true },
  { key: "national_insurance_rate", label: "NI / Self-Employment Tax (%)", group: "Tax", isPercent: true },
  { key: "vat_rate", label: "VAT Rate (%)", group: "Tax", isPercent: true },
  { key: "working_days_per_week", label: "Working Days / Week", group: "Schedule", isRaw: true },
  { key: "working_weeks_per_year", label: "Working Weeks / Year", group: "Schedule", isRaw: true },
  { key: "working_hours_per_day", label: "Working Hours / Day", group: "Schedule", isRaw: true },
] as const;

export default function OverheadsPage() {
  const account = useCurrentAccount();
  const [data, setData] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!account?.address) return;
    apiFetch<BaseOverheads>("/api/overheads/", { token: account?.address })
      .then((res) => {
        const mapped: Record<string, number> = {};
        for (const f of fields) {
          const raw = (res as unknown as Record<string, unknown>)[f.key];
          if (raw == null) continue;
          if ("isPercent" in f && f.isPercent) {
            mapped[f.key] = Math.round(Number(raw) * 10000) / 100; // 0.20 -> 20
          } else if ("isRaw" in f && f.isRaw) {
            mapped[f.key] = Number(raw);
          } else {
            mapped[f.key] = Math.round(Number(raw) / 100); // pence -> pounds
          }
        }
        setData(mapped);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [account?.address]);

  const handleSave = async () => {
    if (!account?.address) return;
    setSaving(true);
    const payload: Record<string, number | boolean> = {};
    for (const f of fields) {
      const val = data[f.key] ?? 0;
      if ("isPercent" in f && f.isPercent) {
        payload[f.key] = val / 100; // 20 -> 0.20
      } else if ("isRaw" in f && f.isRaw) {
        payload[f.key] = val;
      } else {
        payload[f.key] = Math.round(val * 100); // pounds -> pence
      }
    }
    try {
      await apiFetch("/api/overheads/", {
        method: "PUT",
        token: account?.address,
        body: JSON.stringify(payload),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const groups = [...new Set(fields.map((f) => f.group))];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Overheads</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Set your base costs so the AI can calculate profitable quotes
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {groups.map((group) => (
        <div key={group} className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">{group}</h2>
          <div className="grid grid-cols-2 gap-3">
            {fields
              .filter((f) => f.group === group)
              .map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-zinc-500">{f.label}</label>
                  <input
                    type="number"
                    value={data[f.key] ?? ""}
                    onChange={(e) =>
                      setData((d) => ({ ...d, [f.key]: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
