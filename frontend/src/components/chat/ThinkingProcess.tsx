"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  History,
  Brain,
  FileCode,
  TrendingUp,
  Database,
  Check,
  AlertCircle,
} from "lucide-react";
import type { AIState } from "@/hooks/useChat";

interface StepDef {
  id: AIState;
  label: string;
  detail: string;
  icon: typeof Search;
}

const STEPS: StepDef[] = [
  { id: "checking_sources", label: "Searching market rates", detail: "Tavily API", icon: Search },
  { id: "loading_context", label: "Loading conversation context", detail: "Memory", icon: History },
  { id: "thinking", label: "Generating response", detail: "Gemini 3.1 Pro", icon: Brain },
  { id: "parsing", label: "Parsing structured output", detail: "JSON extraction", icon: FileCode },
  { id: "profitability", label: "Running profitability engine", detail: "Break-even analysis", icon: TrendingUp },
  { id: "saving", label: "Saving quote", detail: "Database", icon: Database },
];

type StepState = "waiting" | "active" | "done";

function getStepStates(aiState: AIState): StepState[] {
  const activeIdx = STEPS.findIndex((s) => s.id === aiState);
  return STEPS.map((_, i) => {
    if (activeIdx < 0) return "waiting";
    if (i < activeIdx) return "done";
    if (i === activeIdx) return "active";
    return "waiting";
  });
}

export function ThinkingProcess({ aiState }: { aiState: AIState }) {
  const [elapsed, setElapsed] = useState(0);
  const [stepStates, setStepStates] = useState<StepState[]>(STEPS.map(() => "waiting"));
  const startRef = useRef<number>(0);
  const isActive = aiState !== "idle";

  // Reset timer when starting
  useEffect(() => {
    if (isActive) {
      startRef.current = Date.now();
      setElapsed(0);
    }
  }, [isActive]);

  // Elapsed timer
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [isActive]);

  // Update step states from real aiState
  useEffect(() => {
    setStepStates(getStepStates(aiState));
  }, [aiState]);

  if (!isActive) return null;

  const isError = aiState === "error";

  return (
    <div className="flex gap-3 mb-4">
      {/* Bot avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isError
            ? "rgba(239, 68, 68, 0.2)"
            : "rgba(56, 189, 178, 0.12)",
          border: `1px solid ${isError ? "rgba(239, 68, 68, 0.3)" : "rgba(56, 189, 178, 0.2)"}`,
        }}
      >
        {isError ? (
          <AlertCircle className="h-4 w-4" style={{ color: "#EF4444" }} />
        ) : (
          <Brain className="h-4 w-4" style={{ color: "#38BDB2" }} />
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(145deg, rgba(20,20,28,1) 0%, rgba(26,26,38,1) 100%)",
          border: `1px solid ${isError ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 178, 0.1)"}`,
          boxShadow: isError
            ? "0 0 20px rgba(239, 68, 68, 0.05)"
            : "0 0 20px rgba(56, 189, 178, 0.03), inset 0 1px 0 rgba(255,255,255,0.02)",
          padding: "16px 20px",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        {/* Subtle noise texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.15) 1px, rgba(255,255,255,0.15) 2px)",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-3 relative">
          <div className="flex items-center gap-2">
            {/* Animated pulse dot */}
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{
                  backgroundColor: isError ? "#EF4444" : "#38BDB2",
                  animationDuration: "2s",
                }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: isError ? "#EF4444" : "#38BDB2" }}
              />
            </span>
            <span
              className="text-[10px] font-mono uppercase tracking-[0.15em] font-semibold"
              style={{ color: isError ? "rgba(239, 68, 68, 0.8)" : "rgba(56, 189, 178, 0.7)" }}
            >
              {isError ? "Error" : "Processing"}
            </span>
          </div>
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            {elapsed.toFixed(1)}s
          </span>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical connector */}
          <div
            className="absolute left-[6px] top-3 w-px"
            style={{
              height: "calc(100% - 24px)",
              background: "linear-gradient(180deg, rgba(56,189,178,0.2) 0%, rgba(56,189,178,0.02) 100%)",
            }}
          />

          {STEPS.map((step, i) => {
            const state = stepStates[i];
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className="relative flex items-center gap-3"
                style={{
                  padding: "5px 0",
                  opacity: state === "waiting" ? 0 : 1,
                  transform: state === "waiting" ? "translateX(-6px)" : "translateX(0)",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Node */}
                <div className="relative z-10 flex h-[13px] w-[13px] shrink-0 items-center justify-center">
                  {state === "done" ? (
                    <div
                      className="flex h-[13px] w-[13px] items-center justify-center rounded-full"
                      style={{ background: "rgba(56, 189, 178, 0.15)" }}
                    >
                      <Check className="h-[8px] w-[8px]" style={{ color: "#38BDB2" }} strokeWidth={3} />
                    </div>
                  ) : state === "active" ? (
                    <div className="relative flex h-[13px] w-[13px] items-center justify-center">
                      <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: "rgba(56, 189, 178, 0.3)", animationDuration: "1.5s" }}
                      />
                      <div
                        className="h-[7px] w-[7px] rounded-full"
                        style={{ background: "#38BDB2", boxShadow: "0 0 8px rgba(56, 189, 178, 0.5)" }}
                      />
                    </div>
                  ) : (
                    <div className="h-1 w-1 rounded-full ml-1" style={{ background: "rgba(255,255,255,0.08)" }} />
                  )}
                </div>

                {/* Label + tag */}
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className="h-3 w-3 shrink-0"
                    style={{
                      color:
                        state === "active" ? "#38BDB2"
                          : state === "done" ? "rgba(56, 189, 178, 0.4)"
                            : "rgba(255,255,255,0.15)",
                      transition: "color 0.3s",
                    }}
                  />
                  <span
                    className="text-[11px] font-mono truncate"
                    style={{
                      color:
                        state === "active" ? "rgba(255,255,255,0.9)"
                          : state === "done" ? "rgba(255,255,255,0.35)"
                            : "rgba(255,255,255,0.15)",
                      transition: "color 0.3s",
                    }}
                  >
                    {step.label}
                  </span>

                  {state === "active" && (
                    <span
                      className="shrink-0 text-[9px] font-mono px-1.5 py-px rounded"
                      style={{
                        background: "rgba(56, 189, 178, 0.08)",
                        color: "rgba(56, 189, 178, 0.6)",
                        border: "1px solid rgba(56, 189, 178, 0.12)",
                        animation: "fadeSlideIn 0.2s ease forwards",
                      }}
                    >
                      {step.detail}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <style jsx>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateX(-4px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
