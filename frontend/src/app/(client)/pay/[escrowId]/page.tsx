"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { MilestoneTracker } from "@/components/escrow/MilestoneTracker";
import type { Project, Milestone } from "@/types/database";

export default function ClientPaymentPage() {
  const { escrowId } = useParams<{ escrowId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!escrowId) return;
    const supabase = createClient();

    // Client accesses via client_access_token — backend handles auth
    supabase
      .from("projects")
      .select("*, milestones(*)")
      .eq("client_access_token", escrowId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProject(data as Project);
          setMilestones((data.milestones as Milestone[]) || []);
        }
        setLoading(false);
      });
  }, [escrowId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Project not found or invalid access link</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white">
          Quote<span className="text-indigo-400">Guard</span>
          <span className="ml-2 text-sm font-normal text-zinc-500">Payment Portal</span>
        </h1>
      </header>

      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{project.title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{project.description}</p>
        </div>

        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Total Amount</span>
            <span className="text-xl font-bold text-white">
              {formatCurrency(project.total_quoted_amount)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="mb-4 text-sm font-medium text-zinc-300">Payment Schedule</h3>
          <MilestoneTracker
            milestones={milestones}
            userRole="client"
            onAction={(milestoneId, action) => {
              console.log("Client action:", action, "on:", milestoneId);
              // TODO: OneWallet connect + fund/release flow
            }}
          />
        </div>
      </div>
    </div>
  );
}
