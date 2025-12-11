import { Groq } from 'groq-sdk';

// --- CONFIGURATION ---
// Models optimized for JSON instructions & Reasoning
const REASONING_MODELS = [
    "llama-3.3-70b-versatile", // Best instruction follower
    "openai/gpt-oss-120b",     // High capacity
    "openai/gpt-oss-20b",      // Fallback speedster
];

// Models that support the "browser_search" tool
const RESEARCH_MODELS = [
    "openai/gpt-oss-120b",     // Best search synthesis
    "openai/gpt-oss-20b",      // Fallback search
    // Note: Llama 3.3 often hallucinates tool use on Groq, sticking to GPT-OSS for search is safer
];

const getClient = async () => {
  const rawKey = await window.api.store.get('groq-api-key');
  const apiKey = rawKey ? rawKey.trim() : "";
  
  if (!apiKey) {
    console.error("❌ Groq Error: No API Key found.");
    throw new Error("API Key missing. Please check Settings.");
  }
  return new Groq({ apiKey: apiKey, dangerouslyAllowBrowser: true });
};

async function runWithFallback<T>(
    models: string[], 
    operation: (model: string) => Promise<T>
): Promise<T> {
    let lastError: any;

    for (const model of models) {
        try {
            // console.log(`🤖 Attempting with model: ${model}`);
            return await operation(model);
        } catch (error: any) {
            console.warn(`⚠️ Model ${model} failed:`, error?.error?.code || error.message);
            lastError = error;
            
            if (error?.error?.code === 'invalid_api_key') throw error;
            
            continue;
        }
    }
    throw lastError;
}

export const aiEditNote = async (currentText: string, systemPrompt: string) => {
  const client = await getClient();

  return runWithFallback(REASONING_MODELS, async (model) => {
      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an elite text editor engine. 
            You must output valid JSON only. No talking.
            
            TASK: ${systemPrompt}
            
            REQUIRED FORMAT: { "content": "..." }`
          },
          { role: "user", content: currentText }
        ],
        model: model,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No content received");

      return JSON.parse(content).content || currentText;
  });
};

export const aiResearch = async (query: string) => {
  const client = await getClient();

  console.log("🔍 Starting Deep Research for:", query);

  return runWithFallback(RESEARCH_MODELS, async (model) => {
      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a deep research assistant. Use the browser tool to find the most current information. Compile a detailed report in Markdown."
          },
          { 
            role: "user", 
            content: `Research topic: "${query}". \nOutput a structured Markdown report with: Executive Summary, Key Findings, and Sources.` 
          }
        ],
        model: model,
        temperature: 0.6,
        max_completion_tokens: 1024, 
        tools: [{ type: "browser_search" }],
        tool_choice: "auto"
      });

      return completion.choices[0]?.message?.content || "Research failed to generate text.";
  });
};

export const aiChat = async (history: { role: string, content: string }[], context: string) => {
  const client = await getClient();

  const systemPrompt = `
    You are BetterNotes AI, an agent capable of controlling this productivity app.
    
    CURRENT SCREEN CONTEXT:
    """
    ${context.substring(0, 10000)}
    """

    You can perform multiple actions at once. 
    To do so, append a SINGLE JSON block at the VERY END of your response wrapped in ":::".
    
    The JSON must contain an "actions" array.

    AVAILABLE TOOLS:
    - "add_task" (value: task text)
    - "toggle_task" (value: exact task text to check/uncheck)
    - "delete_task" (value: exact task text)
    - "create_note" (value: "Title | Content")

    EXAMPLE: "I'll add those tasks and delete the old one."
    :::
    {
      "actions": [
        { "tool": "add_task", "value": "Buy Milk" },
        { "tool": "add_task", "value": "Buy Eggs" },
        { "tool": "delete_task", "value": "Buy Junk Food" }
      ]
    }
    :::

    Be concise.
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history
  ];

  const REASONING_MODELS = [
    "llama-3.3-70b-versatile", 
    "openai/gpt-oss-120b",     
    "openai/gpt-oss-20b",      
  ];

  async function runWithFallback<T>(models: string[], operation: (model: string) => Promise<T>): Promise<T> {
      let lastError: any;
      for (const model of models) {
          try { return await operation(model); } 
          catch (error: any) { 
              if (error?.error?.code === 'invalid_api_key') throw error;
              lastError = error; continue; 
          }
      }
      throw lastError;
  }

  return runWithFallback(REASONING_MODELS, async (model) => {
      const completion = await client.chat.completions.create({
        // @ts-ignore
        messages: messages,
        model: model,
        temperature: 0.5, 
        max_completion_tokens: 1024,
      });

      return completion.choices[0]?.message?.content || "I couldn't generate a response.";
  });
};