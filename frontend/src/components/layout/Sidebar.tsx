"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquarePlus,
  Settings,
  Calculator,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quote/new", label: "New Quote", icon: MessageSquarePlus },
  { href: "/overheads", label: "Overheads", icon: Calculator },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { onechainAddress, signOut } = useAuth();

  const truncated = onechainAddress
    ? `${onechainAddress.slice(0, 6)}...${onechainAddress.slice(-4)}`
    : null;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 px-4 py-6">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-white">
          Quote<span className="text-indigo-400">Guard</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-500">Profitable quoting, guaranteed</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 pt-4">
        {truncated && (
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-mono text-zinc-400">{truncated}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </button>
      </div>
    </aside>
  );
}
