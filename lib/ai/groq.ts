/**
 * Groq API Integration Module
 * Supports Groq LLaMA 3.3 70B, LLaMA 3 8B, Mixtral 8x7B, Gemma 2 9B
 */

export const GROQ_MODELS = {
  LLAMA_33_70B: 'llama-3.3-70b-versatile',
  LLAMA_3_8B: 'llama3-8b-8192',
  MIXTRAL_8X7B: 'mixtral-8x7b-32768',
  GEMMA_2_9B: 'gemma2-9b-it',
};

export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY || '';
  return key.trim().length > 10;
}

export async function generateGroqCompletion(
  prompt: string,
  systemPrompt?: string,
  modelOverride?: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not configured');

  const model = modelOverride || process.env.GROQ_MODEL || GROQ_MODELS.LLAMA_33_70B;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
