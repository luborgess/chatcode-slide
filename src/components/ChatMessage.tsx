import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface ChatMessageProps {
  content: string;
  isUser?: boolean;
  timestamp?: string;
}

export const ChatMessage = ({ content, isUser = false, timestamp }: ChatMessageProps) => {
  return (
    <div className={cn("flex w-full gap-3 px-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-secondary">
        <MessageSquare className="h-4 w-4" />
      </div>
      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        <div className="message-bubble rounded-lg px-4 py-2 text-sm">
          {content}
        </div>
        {timestamp && (
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        )}
      </div>
    </div>
  );
};