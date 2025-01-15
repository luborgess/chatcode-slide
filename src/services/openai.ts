import { toast } from "sonner";

const OPENAI_API_URL = "https://api.openai.com/v1";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const generateChatResponse = async (messages: ChatMessage[], apiKey: string): Promise<string> => {
  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-coder-33b-instruct",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to generate response");
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