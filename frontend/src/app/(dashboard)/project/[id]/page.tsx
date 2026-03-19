"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  Save,
  Download,
  Eye,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useUpdateQuote, useUpdateProject, useUpdateUserProfile, useDownloadQuotePdf } from "@/hooks/useQuote";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import { Dialog } from "@/components/ui/Dialog";
import { InvoicePreview } from "@/components/quote/InvoicePreview";
import type { Project, Quote, Milestone, LineItem } from "@/types/database";

interface ProjectWithRelations extends Project {
  milestones: Milestone[];
  quotes: Quote[];
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const account = useCurrentAccount();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [editingItems, setEditingItems] = useState<LineItem[]>([]);
  const [editingMilestones, setEditingMilestones] = useState<Milestone[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSummary, setEditingSummary] = useState("");
  const [editingClientName, setEditingClientName] = useState("");
  const [editingBusinessName, setEditingBusinessName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const quote = project?.quotes?.[0] ?? null;
  const milestones = project?.milestones ?? [];
  const updateQuote = useUpdateQuote(quote?.id ?? "");
  const updateProject = useUpdateProject(id ?? "");
  const updateUserProfile = useUpdateUserProfile();
  const { download: downloadPdf } = useDownloadQuotePdf(quote?.id ?? "");

  // Fetch user profile for business name
  useEffect(() => {
    if (!account?.address) return;
    apiFetch<{ business_name?: string }>("/api/users/me", { token: account.address })
      .then((u) => setEditingBusinessName(u.business_name ?? ""))
      .catch(() => {});
  }, [account?.address]);

  const fetchProject = useCallback(async () => {
    if (!account?.address || !id) return;
    try {
      const data = await apiFetch<ProjectWithRelations>(`/api/projects/${id}`, {
        token: account.address,
      });
      setProject(data);
      if (data.quotes?.[0]) {
        setEditingItems(data.quotes[0].line_items.map((li) => ({ ...li })));
        setEditingTitle(data.quotes[0].title ?? data.title);
        setEditingSummary(data.quotes[0].summary ?? data.description ?? "");
        setEditingClientName(data.client_name ?? "");
      } else {
        setEditingTitle(data.title);
        setEditingSummary(data.description ?? "");
        setEditingClientName(data.client_name ?? "");
      }
      if (data.milestones) {
        setEditingMilestones(data.milestones.map((ms) => ({ ...ms })));
      }
    } catch {
      // ignore
    }
  }, [account?.address, id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // --- Line item editing ---
  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    setEditingItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.total = Math.round(Number(item.quantity) * Number(item.unit_price));
      }
      next[index] = item;
      return next;
    });
  };

  const addLineItem = () => {
    setEditingItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit: "hours", unit_price: 0, total: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setEditingItems((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Milestone editing ---
  const updateMilestone = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setEditingMilestones((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // --- Save ---
  const handleSave = async () => {
    if (!quote) return;
    setSaving(true);
    try {
      const subtotal = editingItems.reduce((s, li) => s + li.total, 0);
      const vatAmount = quote.vat_amount > 0
        ? Math.round(subtotal * (quote.vat_amount / quote.subtotal))
        : 0;
      await Promise.all([
        updateQuote.mutateAsync({
          title: editingTitle,
          summary: editingSummary,
          line_items: editingItems,
          subtotal,
          vat_amount: vatAmount,
          total_amount: subtotal + vatAmount,
        } as Partial<Quote>),
        updateProject.mutateAsync({
          title: editingTitle,
          description: editingSummary,
          client_name: editingClientName,
        }),
        editingBusinessName
          ? updateUserProfile.mutateAsync({ business_name: editingBusinessName })
          : Promise.resolve(),
      ]);
      setIsEditing(false);
      await fetchProject();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (quote) {
      setEditingItems(quote.line_items.map((li) => ({ ...li })));
      setEditingTitle(quote.title ?? project?.title ?? "");
      setEditingSummary(quote.summary ?? project?.description ?? "");
      setEditingClientName(project?.client_name ?? "");
    }
    setEditingMilestones(milestones.map((ms) => ({ ...ms })));
    setIsEditing(false);
  };

  if (!project) {
    return <div className="p-6 text-zinc-500">Loading...</div>;
  }

  const displayItems = isEditing ? editingItems : (quote?.line_items ?? []);
  const displaySubtotal = displayItems.reduce((s, li) => s + li.total, 0);
  const displayVat = quote?.vat_amount ?? 0;
  const displayTotal = isEditing
    ? displaySubtotal + (quote?.vat_amount && quote.subtotal > 0
      ? Math.round(displaySubtotal * (quote.vat_amount / quote.subtotal))
      : 0)
    : (quote?.total_amount ?? 0);

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          {isEditing ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="text-2xl font-bold bg-transparent border-b border-indigo-500 text-white focus:outline-none w-full"
              placeholder="Project title"
            />
          ) : (
            <h1 className="text-2xl font-bold">{project.title}</h1>
          )}
          {isEditing ? (
            <textarea
              value={editingSummary}
              onChange={(e) => setEditingSummary(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Project description / summary"
            />
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              {project.description || "No description"} &middot;{" "}
              {project.estimated_duration_days} days
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <EscrowStatusBadge status={project.status} type="project" />
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <MetricCard label="Quoted" value={formatCurrency(project.total_quoted_amount)} />
        <MetricCard
          label="Profit Margin"
          value={quote?.profit_margin_percent != null ? `${quote.profit_margin_percent.toFixed(1)}%` : "-"}
          color={quote?.is_profitable ? "text-green-400" : "text-red-400"}
        />
        <MetricCard
          label="Break-even"
          value={quote?.break_even_amount != null ? formatCurrency(quote.break_even_amount) : "-"}
        />
        <MetricCard
          label="Min Day Rate"
          value={quote?.min_daily_rate != null ? formatCurrency(quote.min_daily_rate) : "-"}
        />
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex gap-3">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Pencil className="h-4 w-4" />
            Edit Quote
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </>
        )}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <Eye className="h-4 w-4" />
          Preview Invoice
        </button>
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Invoice Details: Billed By / Billed To */}
      {isEditing && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Billed By (Business Name)
            </label>
            <input
              type="text"
              value={editingBusinessName}
              onChange={(e) => setEditingBusinessName(e.target.value)}
              className="mt-2 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              placeholder="Your business name"
            />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Billed To (Client Name)
            </label>
            <input
              type="text"
              value={editingClientName}
              onChange={(e) => setEditingClientName(e.target.value)}
              className="mt-2 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              placeholder="Client name"
            />
          </div>
        </div>
      )}

      {/* Non-editing view of billing info */}
      {!isEditing && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Billed By</p>
            <p className="mt-1 text-sm font-medium text-white">{editingBusinessName || "QuoteGuard"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Billed To</p>
            <p className="mt-1 text-sm font-medium text-white">{project.client_name || "—"}</p>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Line Items
          </h2>
          {isEditing && (
            <button
              onClick={addLineItem}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-400" style={{ width: "40%" }}>Description</th>
                <th className="px-4 py-3 text-right text-zinc-400">Qty</th>
                <th className="px-4 py-3 text-center text-zinc-400">Unit</th>
                <th className="px-4 py-3 text-right text-zinc-400">Rate</th>
                <th className="px-4 py-3 text-right text-zinc-400">Total</th>
                {isEditing && <th className="px-4 py-3 w-12" />}
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  {isEditing ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(i, "description", e.target.value)}
                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-right text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(i, "unit", e.target.value)}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="hours">hours</option>
                          <option value="days">days</option>
                          <option value="units">units</option>
                          <option value="sqm">sqm</option>
                          <option value="fixed">fixed</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price / 100}
                          onChange={(e) => updateLineItem(i, "unit_price", Math.round((parseFloat(e.target.value) || 0) * 100))}
                          className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-right text-sm text-white focus:border-indigo-500 focus:outline-none"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-white">
                        {formatCurrency(item.total, quote?.currency_code)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeLineItem(i)}
                          className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-white">{item.description}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{item.quantity}</td>
                      <td className="px-4 py-3 text-center text-zinc-300">{item.unit}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">
                        {formatCurrency(item.unit_price, quote?.currency_code)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {formatCurrency(item.total, quote?.currency_code)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={isEditing ? 6 : 5} className="px-4 py-8 text-center text-zinc-500">
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-zinc-700 bg-zinc-800/30">
              <tr>
                <td colSpan={isEditing ? 4 : 3} />
                <td className="px-4 py-2.5 text-right text-sm text-zinc-400">Subtotal</td>
                <td className={`px-4 py-2.5 text-right text-sm font-medium text-white ${isEditing ? "" : ""}`} colSpan={isEditing ? 1 : 1}>
                  {formatCurrency(displaySubtotal, quote?.currency_code)}
                </td>
                {isEditing && <td />}
              </tr>
              {displayVat > 0 && (
                <tr>
                  <td colSpan={isEditing ? 4 : 3} />
                  <td className="px-4 py-2 text-right text-sm text-zinc-400">VAT</td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-white">
                    {formatCurrency(
                      isEditing && quote?.subtotal
                        ? Math.round(displaySubtotal * (quote.vat_amount / quote.subtotal))
                        : displayVat,
                      quote?.currency_code
                    )}
                  </td>
                  {isEditing && <td />}
                </tr>
              )}
              <tr className="border-t border-zinc-700">
                <td colSpan={isEditing ? 4 : 3} />
                <td className="px-4 py-3 text-right font-semibold text-white">Total</td>
                <td className="px-4 py-3 text-right text-base font-bold text-white">
                  {formatCurrency(displayTotal, quote?.currency_code)}
                </td>
                {isEditing && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Payment Milestones
          </h2>
          <div className="space-y-2">
            {(isEditing ? editingMilestones : milestones)
              .sort((a, b) => a.sequence_number - b.sequence_number)
              .map((ms, i) => (
                <div
                  key={ms.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                      {i + 1}
                    </span>
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={ms.title}
                          onChange={(e) => updateMilestone(i, "title", e.target.value)}
                          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <p className="text-sm font-medium text-white">{ms.title}</p>
                      )}
                      {ms.description && !isEditing && (
                        <p className="text-xs text-zinc-500">{ms.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(ms.amount_fiat, quote?.currency_code)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Invoice Preview Overlay */}
      <InvoicePreviewOverlay
        show={showPreview}
        onClose={() => setShowPreview(false)}
        onDownload={downloadPdf}
        quote={quote}
        project={project}
        displayItems={displayItems}
        displaySubtotal={displaySubtotal}
        displayVat={displayVat}
        displayTotal={displayTotal}
        milestones={milestones}
        editingTitle={editingTitle}
        editingSummary={editingSummary}
        editingClientName={editingClientName}
        editingBusinessName={editingBusinessName}
      />
    </div>
  );
}

/* ─── Animated Invoice Preview Overlay ─────────────────────────────── */

function InvoicePreviewOverlay({
  show,
  onClose,
  onDownload,
  quote,
  project,
  displayItems,
  displaySubtotal,
  displayVat,
  displayTotal,
  milestones,
  editingTitle,
  editingSummary,
  editingClientName,
  editingBusinessName,
}: {
  show: boolean;
  onClose: () => void;
  onDownload: () => void;
  quote: Quote | null;
  project: ProjectWithRelations;
  displayItems: LineItem[];
  displaySubtotal: number;
  displayVat: number;
  displayTotal: number;
  milestones: Milestone[];
  editingTitle: string;
  editingSummary: string;
  editingClientName: string;
  editingBusinessName: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Mount → wait for paint → animate in
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (show) {
      setMounted(true);
      // Give the browser a full frame to paint the "invisible" initial state
      timer = setTimeout(() => setVisible(true), 30);
    } else if (mounted) {
      setVisible(false);
    }
    return () => clearTimeout(timer);
  }, [show, mounted]);

  // After animate out → unmount
  const handleTransitionEnd = (e: React.TransitionEvent) => {
    // Only unmount on the overlay's own transition, not children
    if (!visible && e.currentTarget === e.target) setMounted(false);
  };

  // Close on Escape
  useEffect(() => {
    if (!mounted) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mounted, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!mounted) return null;

  return (
    <>
      {/* Inject keyframes */}
      <style jsx global>{`
        @keyframes invoiceShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div
        ref={overlayRef}
        onClick={handleBackdropClick}
        onTransitionEnd={handleTransitionEnd}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundColor: visible ? "rgba(9, 9, 11, 0.85)" : "rgba(9, 9, 11, 0)",
          backdropFilter: visible ? "blur(12px)" : "blur(0px)",
          transition: "background-color 0.5s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Floating toolbar — slides down */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-30px)",
            transition: "opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.2s, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                boxShadow: "0 0 20px rgba(79, 70, 229, 0.3)",
              }}
            >
              <Eye className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-zinc-300">Invoice Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
                boxShadow: "0 4px 15px rgba(79, 70, 229, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 transition-all duration-200 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* A4 Card — scales up with spring-like ease */}
        <div
          className="relative"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? "scale(1) translateY(0)"
              : "scale(0.85) translateY(60px)",
            transition: visible
              ? "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s, transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s"
              : "opacity 0.3s ease, transform 0.35s ease",
          }}
        >
          {/* Glow behind the card */}
          <div
            className="absolute -inset-4 rounded-2xl opacity-40 blur-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.1) 50%, rgba(79,70,229,0.05) 100%)",
              opacity: visible ? 0.4 : 0,
              transition: visible ? "opacity 0.8s ease 0.3s" : "opacity 0.2s ease",
            }}
          />

          {/* Scrollable container with shadow framing */}
          <div
            className="relative h-[85vh] overflow-y-auto rounded-xl"
            style={{
              boxShadow: visible
                ? "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px rgba(79,70,229,0.1)"
                : "0 0 0 rgba(0,0,0,0)",
              transition: visible ? "box-shadow 0.6s ease 0.15s" : "box-shadow 0.2s ease",
            }}
          >
            {/* Shimmer edge effect on top */}
            <div
              className="sticky top-0 z-10 h-[2px] w-full"
              style={{
                background: visible
                  ? "linear-gradient(90deg, transparent, rgba(79,70,229,0.6), rgba(124,58,237,0.6), transparent)"
                  : "transparent",
                backgroundSize: "200% 100%",
                animation: visible ? "invoiceShimmer 3s linear infinite" : "none",
                transition: "background 0.3s ease",
              }}
            />

            {quote && (
              <InvoicePreview
                title={editingTitle || quote.title}
                summary={editingSummary || (quote.summary ?? "")}
                quoteId={quote.id}
                businessName={editingBusinessName}
                clientName={editingClientName || (project.client_name ?? "")}
                currency={quote.currency_code}
                lineItems={displayItems}
                subtotal={displaySubtotal}
                vatAmount={displayVat}
                totalAmount={displayTotal}
                milestones={milestones}
                createdAt={quote.created_at}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Metric Card ─────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-lg font-bold ${color ?? "text-white"}`}>{value}</p>
    </div>
  );
}
