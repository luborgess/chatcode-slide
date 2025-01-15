import { toast } from "sonner";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const generateChatResponse = async (messages: ChatMessage[], apiKey: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("Please enter your DeepSeek API key");
  }

  try {
    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to generate response");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating response:", error);
    if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error("Failed to generate response");
    }
    throw error;
  }
};