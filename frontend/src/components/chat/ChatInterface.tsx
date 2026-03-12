"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { QuoteSuggestion } from "./QuoteSuggestion";

interface Props {
  onQuoteAccepted?: (conversationId: string) => void;
}

export function ChatInterface({ onQuoteAccepted }: Props) {
  const { messages, isLoading, conversationId, latestQuote, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">
                Describe your project
              </h2>
              <p className="mt-2 max-w-md text-sm text-zinc-400">
                Tell me about the job in plain English. For example: &quot;Bathroom
                remodel, 3 days, $400 materials, 35% margin&quot;
              </p>
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

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing your project...</span>
          </div>
        )}
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
