import Link from "next/link";
import { ArrowRight, Shield, Brain, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Quote<span className="text-indigo-400">Guard</span>
          </h1>
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-bold leading-tight tracking-tight">
            Stop undercharging.
            <br />
            <span className="text-indigo-400">Start profiting.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            AI-powered profitability checking for contractors and freelancers.
            Describe your project, get an instant quote with break-even analysis,
            and guarantee your payment with smart contract escrow.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create Your First Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800 px-6 py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <Brain className="mb-4 h-8 w-8 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">AI Quoting</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Describe your project in plain English. Our AI calculates your
              break-even point and recommends profitable pricing.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <Zap className="mb-4 h-8 w-8 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Instant Analysis</h3>
            <p className="mt-2 text-sm text-zinc-400">
              See your minimum daily rate, overhead allocation, and profit margin
              before you send a single quote.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <Shield className="mb-4 h-8 w-8 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Guaranteed Payment</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Client funds are locked in escrow and released as you complete
              milestones. No more chasing invoices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
