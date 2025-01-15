import { ChatMessage } from "./openai";

const MAX_CONTEXT_MESSAGES = 10;
const SYSTEM_PROMPT = `You are a helpful AI assistant focused on helping users with coding and development tasks. 
You should:
- Provide clear, concise explanations
- Share code examples when relevant
- Use markdown formatting for code blocks
- Focus on best practices and modern development approaches
- If you're unsure about something, be honest about it`;

export const prepareChatMessages = (messages: ChatMessage[]): ChatMessage[] => {
  const systemMessage: ChatMessage = {
    role: "system",
    content: SYSTEM_PROMPT
  };

  // Get the last N messages to keep context size manageable
  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  // Combine system prompt with recent messages
  return [systemMessage, ...recentMessages];
};

export const formatUserMessage = (message: string): string => {
  // Add any preprocessing to user messages here
  // For example, you could add reminders about code formatting
  if (message.toLowerCase().includes('code') || message.includes('```')) {
    return `${message}\n\nPlease format any code responses using markdown code blocks with appropriate language tags.`;
  }
  return message;
};
