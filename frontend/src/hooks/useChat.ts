"use client";

import { useState, useCallback } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import type { ChatMessage, ChatApiResponse } from "@/types/quote";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

      try {
        const response = await apiFetch<ChatApiResponse>("/api/chat/quote", {
          method: "POST",
          token: account.address,
          body: JSON.stringify({
            message: content,
            conversation_id: conversationId,
          }),
        });

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
      } catch (error) {
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
      }
    },
    [account?.address, conversationId]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setLatestQuote(null);
  }, []);

  return { messages, isLoading, conversationId, latestQuote, sendMessage, reset };
}
