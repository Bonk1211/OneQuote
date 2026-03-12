"use client";

import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const account = useCurrentAccount();
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    business_type: "sole_trader",
    trade_category: "",
    currency_code: "GBP",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account?.address) return;
    apiFetch<Record<string, string | null>>("/api/users/me", {
      token: account.address,
    })
      .then((data) => {
        if (data) {
          setForm({
            full_name: data.full_name || "",
            business_name: data.business_name || "",
            business_type: data.business_type || "sole_trader",
            trade_category: data.trade_category || "",
            currency_code: data.currency_code || "GBP",
          });
        }
      })
      .catch(() => {});
  }, [account?.address]);

  const handleSave = async () => {
    if (!account?.address) return;
    setSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PUT",
        token: account.address,
        body: JSON.stringify(form),
      });
    } catch {
      // TODO: show error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="space-y-4">
        {[
          { key: "full_name", label: "Full Name", type: "text" },
          { key: "business_name", label: "Business Name", type: "text" },
          { key: "trade_category", label: "Trade / Profession", type: "text" },
        ].map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-sm text-zinc-400">{field.label}</label>
            <input
              type={field.type}
              value={form[field.key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Business Type</label>
          <select
            value={form.business_type}
            onChange={(e) => setForm((f) => ({ ...f, business_type: e.target.value }))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="sole_trader">Sole Trader</option>
            <option value="limited_company">Limited Company</option>
            <option value="partnership">Partnership</option>
            <option value="freelancer">Freelancer</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Currency</label>
          <select
            value={form.currency_code}
            onChange={(e) => setForm((f) => ({ ...f, currency_code: e.target.value }))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="GBP">GBP (British Pound)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
