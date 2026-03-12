"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, DollarSign, TrendingUp } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import { formatCurrency } from "@/lib/utils";
import type { Project } from "@/types/database";

export default function DashboardPage() {
  const account = useCurrentAccount();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account?.address) return;
    apiFetch<Project[]>("/api/quotes/", { token: account.address })
      .then(() => {
        // For now, projects come from quotes endpoint's nested data
        // TODO: Add dedicated /api/projects endpoint
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch projects via backend API
    apiFetch<Project[]>("/api/projects/", { token: account.address })
      .then((data) => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [account?.address]);

  const totalQuoted = projects.reduce((s, p) => s + p.total_quoted_amount, 0);
  const totalFunded = projects.reduce((s, p) => s + p.total_funded_amount, 0);
  const totalReleased = projects.reduce((s, p) => s + p.total_released_amount, 0);

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/quote/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Quote
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-400" />
            <span className="text-sm text-zinc-400">Total Quoted</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalQuoted)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span className="text-sm text-zinc-400">Total Funded</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalFunded)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-teal-400" />
            <span className="text-sm text-zinc-400">Total Released</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalReleased)}</p>
        </div>
      </div>

      {/* Projects list */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-3">
          <h2 className="text-sm font-medium text-zinc-300">Recent Projects</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-500">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-zinc-500">No projects yet</p>
            <Link
              href="/quote/new"
              className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
            >
              Create your first quote
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-800/50"
              >
                <div>
                  <p className="text-sm font-medium text-white">{p.title}</p>
                  <p className="text-xs text-zinc-500">
                    {p.client_name || "No client"} &middot;{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(p.total_quoted_amount)}
                  </span>
                  <EscrowStatusBadge status={p.status} type="project" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
