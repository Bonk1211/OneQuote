"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Hammer, PaintBucket, Globe, Video, Wrench, Sparkles } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { QuoteSuggestion } from "./QuoteSuggestion";
import { ThinkingProcess } from "./ThinkingProcess";

interface Props {
  onQuoteAccepted?: (conversationId: string) => void;
  resumeConversationId?: string;
}

export function ChatInterface({ onQuoteAccepted, resumeConversationId }: Props) {
  const { messages, isLoading, aiState, conversationId, latestQuote, sendMessage, loadConversation, reset } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiState]);

  // Load existing conversation or reset for a fresh one
  useEffect(() => {
    if (resumeConversationId) {
      loadConversation(resumeConversationId);
    } else {
      reset();
    }
  }, [resumeConversationId, loadConversation, reset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-2xl px-4">
              <div className="text-center mb-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
                  <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  What are you working on?
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Describe your project and I&apos;ll generate a profitability-checked quote with milestones.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: Hammer,
                    title: "Home Renovation",
                    prompt: "Bathroom remodel for a client — gut the existing space, new tiling, plumbing fixtures, vanity install. About 5 days of work, $1,200 in materials.",
                  },
                  {
                    icon: Globe,
                    title: "Web Development",
                    prompt: "Build a custom e-commerce website with product catalog, shopping cart, payment integration, and admin dashboard. Timeline around 3 weeks.",
                  },
                  {
                    icon: Video,
                    title: "Video Production",
                    prompt: "Wedding highlight video — full day shoot, drone footage, 2 cameras, edited down to a 5-minute cinematic film with color grading and licensed music.",
                  },
                  {
                    icon: PaintBucket,
                    title: "Interior Painting",
                    prompt: "Paint a 3-bedroom apartment — walls and ceilings, minor patching, 2 coats throughout. Client supplies the paint, I handle labor and equipment.",
                  },
                  {
                    icon: Wrench,
                    title: "Plumbing Service",
                    prompt: "Commercial kitchen plumbing fit-out — install grease trap, 3-compartment sink, dishwasher hookup, and hot water line. 2 days on site.",
                  },
                  {
                    icon: Sparkles,
                    title: "Custom Project",
                    prompt: "I need a quote for ",
                  },
                ].map((suggestion) => (
                  <button
                    key={suggestion.title}
                    onClick={() => {
                      if (suggestion.title === "Custom Project") {
                        setInput(suggestion.prompt);
                      } else {
                        sendMessage(suggestion.prompt);
                      }
                    }}
                    className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-all hover:border-indigo-500/50 hover:bg-zinc-800/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 transition-colors group-hover:bg-indigo-500/10">
                      <suggestion.icon className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
                        {suggestion.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                        {suggestion.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="mb-4">
            <MessageBubble message={msg} />
            {msg.parsedQuote && msg.profitAnalysis && (
              <div className="mt-3 ml-0">
                <QuoteSuggestion
                  quote={msg.parsedQuote}
                  analysis={msg.profitAnalysis}
                  onAccept={() =>
                    conversationId && onQuoteAccepted?.(conversationId)
                  }
                />
              </div>
            )}
          </div>
        ))}

        <ThinkingProcess aiState={aiState} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800 bg-zinc-950 p-4"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your project or ask a question..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-3 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
