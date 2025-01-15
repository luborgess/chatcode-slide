import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CodePanelProps {
  code: string;
  language?: string;
  onClose: () => void;
}

export const CodePanel = ({ code, language = "typescript", onClose }: CodePanelProps) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel fixed right-0 top-0 h-full w-1/2 transform border-l border-border transition-transform duration-300 ease-in-out">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={copyCode}>
            <Copy className={cn("h-4 w-4", copied && "text-green-500")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[calc(100%-3.5rem)]">
        <pre className="p-4">
          <code>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
};