"use client";

import {
  Clock,
  Wallet,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MilestoneStatus, ProjectStatus } from "@/types/database";

const milestoneConfig: Record<
  MilestoneStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: "Pending", color: "bg-zinc-500/20 text-zinc-400", icon: Clock },
  funded: { label: "Funded", color: "bg-green-500/20 text-green-400", icon: Wallet },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400", icon: Play },
  release_requested: {
    label: "Release Requested",
    color: "bg-yellow-500/20 text-yellow-400",
    icon: ArrowUpCircle,
  },
  released: { label: "Released", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  disputed: { label: "Disputed", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
  refunded: { label: "Refunded", color: "bg-zinc-500/20 text-zinc-400", icon: RotateCcw },
};

const projectConfig: Record<
  ProjectStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  draft: { label: "Draft", color: "bg-zinc-500/20 text-zinc-400", icon: Clock },
  quoted: { label: "Quoted", color: "bg-blue-500/20 text-blue-400", icon: Clock },
  accepted: { label: "Accepted", color: "bg-indigo-500/20 text-indigo-400", icon: CheckCircle2 },
  escrowed: { label: "Escrowed", color: "bg-purple-500/20 text-purple-400", icon: Wallet },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400", icon: Play },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-zinc-500/20 text-zinc-400", icon: XCircle },
  disputed: { label: "Disputed", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
};

interface Props {
  status: MilestoneStatus | ProjectStatus;
  type?: "milestone" | "project";
}

export function EscrowStatusBadge({ status, type = "milestone" }: Props) {
  const config = type === "milestone"
    ? milestoneConfig[status as MilestoneStatus]
    : projectConfig[status as ProjectStatus];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
