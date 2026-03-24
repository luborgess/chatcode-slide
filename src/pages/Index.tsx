import { useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage as ChatMessageComponent } from "@/components/ChatMessage";
import { CodePanel } from "@/components/CodePanel";
import { generateChatResponse, ChatMessage } from "@/services/openai";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  interface Message {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: string;
  }

  const handleSendMessage = async (content: string) => {
    if (!apiKey) {
      toast.error("Please enter your OpenAI API key first");
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const chatMessages: ChatMessage[] = messages.map(msg => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content
      }));
      chatMessages.push({ role: "user", content });

      const response = await generateChatResponse(chatMessages, apiKey);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If response contains code, show the code panel
      if (response.includes("```")) {
        setShowCodePanel(true);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="chat-gradient relative flex h-full w-full flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            <input
              type="password"
              placeholder="Enter your DeepSeek API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Link
              to="/osint"
              className="ml-3 flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <Shield className="h-4 w-4" />
              OSINT
            </Link>
          </div>
          
          {messages.map((message) => (
            <ChatMessageComponent key={message.id} {...message} />
          ))}
          
          {isLoading && (
            <div className="flex justify-center">
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          )}
        </div>
        <ChatInput onSend={handleSendMessage} />
      </div>
      {showCodePanel && (
        <CodePanel
          code={messages[messages.length - 1]?.content || ""}
          onClose={() => setShowCodePanel(false)}
        />
      )}
    </div>
  );
};

export default Index;