"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/quote";

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-indigo-600" : "bg-zinc-700"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-zinc-800 text-zinc-200"
        )}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}
