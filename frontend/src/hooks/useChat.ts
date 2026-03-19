"use client";

import { useState, useCallback } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { apiFetch } from "@/lib/api";
import type { ChatMessage, ChatApiResponse, Conversation, ConversationDetail } from "@/types/quote";

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

        // If this is a new conversation (first message), notify sidebar to refresh
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
        // Set latest quote from last message that has one
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
  }, []);

  return { messages, isLoading, conversationId, latestQuote, sendMessage, loadConversation, reset };
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
