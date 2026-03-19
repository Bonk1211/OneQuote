"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("conversation");

  const handleQuoteAccepted = (conversationId: string) => {
    router.push("/dashboard");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">
          {resumeId ? "Resume Quote" : "New Quote"}
        </h1>
        <p className="text-sm text-zinc-400">
          Describe your project and I&apos;ll generate a profitable quote
        </p>
      </div>
      <div className="flex-1">
        <ChatInterface
          onQuoteAccepted={handleQuoteAccepted}
          resumeConversationId={resumeId ?? undefined}
        />
      </div>
    </div>
  );
}
