import fetch from 'node-fetch';
import { env } from '../config/env.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateGroqResponse({
  prompt,
  model,
  temperature = 0.7,
}: {
  prompt: string;
  model?: string | null;
  temperature?: number;
}): Promise<string | null> {
  if (!env.groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const finalModel = model?.trim() || env.groqDefaultModel;
  const body = {
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: finalModel,
    temperature,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: false,
    stop: null,
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[groq.service] API error (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  return content.trim() || null;
}
