import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, X } from "lucide-react";
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

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel fixed right-0 top-0 h-full w-1/2 transform border-l border-[#2a2a2a] bg-[#1a1a1a]/95 transition-transform duration-300 ease-in-out">
      <div className="flex h-14 items-center justify-between border-b border-[#2a2a2a] px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#888]">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={downloadCode}
            className="hover:bg-[#2a2a2a]"
          >
            <Download className="h-4 w-4 text-[#888] hover:text-white" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={copyCode}
            className="hover:bg-[#2a2a2a]"
          >
            <Copy className={cn("h-4 w-4", copied ? "text-green-500" : "text-[#888] hover:text-white")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="hover:bg-[#2a2a2a]"
          >
            <X className="h-4 w-4 text-[#888] hover:text-white" />
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[calc(100%-3.5rem)] bg-[#1a1a1a]">
        <div className="p-4">
          <pre className="rounded-lg bg-[#1a1a1a] font-mono text-sm leading-relaxed">
            <code className="text-[#f8f8f2]">{code}</code>
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
};