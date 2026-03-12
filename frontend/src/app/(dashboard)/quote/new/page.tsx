"use client";

import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function NewQuotePage() {
  const router = useRouter();

  const handleQuoteAccepted = (conversationId: string) => {
    // Navigate to the quote detail page
    // The quote was already saved by the backend during chat
    router.push("/dashboard");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">New Quote</h1>
        <p className="text-sm text-zinc-400">
          Describe your project and I&apos;ll generate a profitable quote
        </p>
      </div>
      <div className="flex-1">
        <ChatInterface onQuoteAccepted={handleQuoteAccepted} />
      </div>
    </div>
  );
}
