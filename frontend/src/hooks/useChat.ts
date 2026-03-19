"use client";

import { useState, useCallback } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import type { ChatMessage, ChatApiResponse, Conversation, ConversationDetail } from "@/types/quote";

export type AIState =
  | "idle"
  | "checking_sources"
  | "loading_context"
  | "thinking"
  | "parsing"
  | "profitability"
  | "saving"
  | "error";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiState, setAiState] = useState<AIState>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [latestQuote, setLatestQuote] = useState<ChatApiResponse | null>(null);
  const account = useCurrentAccount();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!account?.address) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setAiState("checking_sources");

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(
          `${apiUrl}/api/chat/quote`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${account.address}`,
            },
            body: JSON.stringify({
              message: content,
              conversation_id: conversationId,
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `Request failed (${res.status})`);
        }

        // Parse SSE stream
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (separated by double newline)
          const events = buffer.split("\n\n");
          buffer = events.pop() || ""; // Keep incomplete event in buffer

          for (const event of events) {
            if (!event.trim()) continue;

            const lines = event.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              }
            }

            if (!eventType || !eventData) continue;

            try {
              const data = JSON.parse(eventData);

              if (eventType === "ai_state") {
                setAiState(data.state as AIState);
              } else if (eventType === "response") {
                const response = data as ChatApiResponse;

                if (!conversationId && response.conversation_id) {
                  window.dispatchEvent(new CustomEvent("conversation-created"));
                }
                setConversationId(response.conversation_id);

                if (response.parsed_quote) {
                  setLatestQuote(response);
                }

                const aiMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: response.message,
                  parsedQuote: response.parsed_quote,
                  profitAnalysis: response.profit_analysis,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
              } else if (eventType === "error") {
                throw new Error(data.message || "Something went wrong");
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "Something went wrong") {
                // JSON parse error — skip this event
              } else {
                throw parseErr;
              }
            }
          }
        }
      } catch (error) {
        setAiState("error");
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setAiState("idle");
      }
    },
    [account?.address, conversationId]
  );

  const loadConversation = useCallback(
    async (convId: string) => {
      if (!account?.address) return;
      setIsLoading(true);
      try {
        const data = await apiFetch<ConversationDetail>(
          `/api/chat/conversations/${convId}`,
          { token: account.address }
        );
        setConversationId(convId);
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parsedQuote: m.parsed_quote,
            profitAnalysis: m.profit_analysis,
            timestamp: new Date(m.created_at),
          }))
        );
        const lastQuoteMsg = [...data.messages].reverse().find((m) => m.parsed_quote);
        if (lastQuoteMsg) {
          setLatestQuote({
            message: lastQuoteMsg.content,
            parsed_quote: lastQuoteMsg.parsed_quote,
            profit_analysis: lastQuoteMsg.profit_analysis,
            conversation_id: convId,
            requires_clarification: false,
            clarification_questions: [],
          });
        }
      } catch {
        // If conversation doesn't exist, just start fresh
      } finally {
        setIsLoading(false);
      }
    },
    [account?.address]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setLatestQuote(null);
    setAiState("idle");
  }, []);

  return { messages, isLoading, aiState, conversationId, latestQuote, sendMessage, loadConversation, reset };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const account = useCurrentAccount();

  const fetchConversations = useCallback(async () => {
    if (!account?.address) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<Conversation[]>("/api/chat/conversations", {
        token: account.address,
      });
      setConversations(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  return { conversations, isLoading, fetchConversations };
}
