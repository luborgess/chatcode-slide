import { useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { CodePanel } from "@/components/CodePanel";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCodePanel, setShowCodePanel] = useState(false);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="chat-gradient relative flex h-full w-full flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
        </div>
        <ChatInput onSend={handleSendMessage} />
      </div>
      {showCodePanel && (
        <CodePanel
          code="console.log('Hello World');"
          onClose={() => setShowCodePanel(false)}
        />
      )}
    </div>
  );
};

export default Index;