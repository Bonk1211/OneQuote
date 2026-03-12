"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import { MilestoneTracker } from "@/components/escrow/MilestoneTracker";
import type { Project, Milestone } from "@/types/database";

interface ProjectWithRelations extends Project {
  milestones: Milestone[];
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const account = useCurrentAccount();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);

  useEffect(() => {
    if (!account?.address || !id) return;

    apiFetch<ProjectWithRelations>(`/api/projects/${id}`, {
      token: account.address,
    })
      .then((data) => setProject(data))
      .catch(() => {});
  }, [account?.address, id]);

  if (!project) {
    return <div className="p-6 text-zinc-500">Loading...</div>;
  }

  const milestones = project.milestones || [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {project.client_name || "No client"} &middot;{" "}
            {project.estimated_duration_days} days
          </p>
        </div>
        <EscrowStatusBadge status={project.status} type="project" />
      </div>

      {/* Funding progress */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Quoted</p>
          <p className="text-lg font-bold">{formatCurrency(project.total_quoted_amount)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Funded</p>
          <p className="text-lg font-bold text-green-400">
            {formatCurrency(project.total_funded_amount)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Released</p>
          <p className="text-lg font-bold text-indigo-400">
            {formatCurrency(project.total_released_amount)}
          </p>
        </div>
      </div>

      {/* Milestone tracker */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">Milestones</h2>
        {milestones.length > 0 ? (
          <MilestoneTracker
            milestones={milestones}
            userRole="operator"
            onAction={(milestoneId, action) => {
              console.log("Action:", action, "on milestone:", milestoneId);
            }}
          />
        ) : (
          <p className="text-sm text-zinc-500">No milestones defined yet</p>
        )}
      </div>
    </div>
  );
}
