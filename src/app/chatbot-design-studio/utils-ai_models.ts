/************             AI PROMPT MODEL: START        ************************/

export const COHERE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number}> = [
  {
    name: "Command R",
    value: "command-r",
    description: "Cohere's Command R model.",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096
  },
  {
    name: "Command R+",
    value: "command-r-plus",
    description: "Cohere's enhanced Command R+ model.",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000
  },
  {
    name: "Command A (03-2025)",
    value: "command-a-03-2025",
    description: "Cohere's Command A model (March 2025).",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 512000
  },
  {
    name: "Command R7B (12-2024)",
    value: "command-r7b-12-2024",
    description: "Cohere's Command R7B model (December 2024).",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 4096
  },
  {
    name: "Command A Vision (07-2025)",
    value: "command-a-vision-07-2025",
    description: "Cohere's Command A Vision model (July 2025).",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 512000
  },
  {
    name: "Command R+ (04-2024)",
    value: "command-r-plus-04-2024",
    description: "Cohere's Command R+ model (April 2024).",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000
  },
  {
    name: "Command R+ (08-2024)",
    value: "command-r-plus-08-2024",
    description: "Cohere's Command R+ model (August 2024).",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000
  },
]

export const GOOGLE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number}> = [
  {
    name: "Gemini-pro",
    value: "gemini-pro",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 1000000 // Corretto da 128000 (Gemini 1.5 Pro supporta 1M)
  },
  {
    name: "Gemini 1.5 Flash",
    value: "gemini-1.5-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 1000000 // Corretto da 128000 (Gemini 1.5 Flash supporta 1M)
  },
  {
    name: "Gemini 2.0 Flash",
    value: "gemini-2.0-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 1000000 // Assumo che le versioni 2.x mantengano o migliorino 1.5
  },
  {
    name: "Gemini 2.0 Flash Lite",
    value: "gemini-2.0-flash-lite",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 1000000 // Assumo
  },
  {
    name: "Gemini 2.5 Flash",
    value: "gemini-2.5-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 1000000 // Assumo
  },
  {
    name: "Gemini 2.5 Flash Lite",
    value: "gemini-2.5-flash-lite",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 1000000 // Assumo
  },
]

export const ANTHROPIC_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number}> = [
  {
    name: "Claude-3.7 Sonnet",
    value: "claude-3-7-sonnet-20250219",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000
  },
  {
    name: "Claude Sonnet 4",
    value: "claude-sonnet-4-20250514",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000
  },
  {
    name: "Claude Opus 4",
    value: "claude-opus-4-20250514",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000
  },
  {
    name: "Claude-3.5 Sonnet",
    value: "claude-3-5-sonnet-20240620",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 200000
  },
  {
    name: "Claude 3.5 Haiku",
    value: "claude-3-5-haiku-latest",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 200000
  },
  {
    name: "Claude 3.7 Sonnet",
    value: "claude-3-7-sonnet-latest",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 200000
  },
  {
    name: "Claude Opus 4",
    value: "claude-opus-4-0",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 200000
  },
  {
    name: "Claude Sonnet 4",
    value: "claude-sonnet-4-0",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 200000
  },
]

export const GROQ_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number}> = [
  {
    name: "Llama-3.2-11b-vision-preview",
    value: "llama-3.2-11b-vision-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "Llama-3.2-3b-preview",
    value: "llama-3.2-3b-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "Llama-3.2-90b-vision-preview",
    value: "llama-3.2-90b-vision-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Llama-guard-3-8b",
    value: "llama-guard-3-8b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "Llama-3.2-1b-preview",
    value: "llama-3.2-1b-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096
  },
  {
    name: "Llama3-70b-8192",
    value: "llama3-70b-8192",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "Llama-3.3-70b-specdec",
    value: "llama-3.3-70b-specdec",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Deepseek-r1-distill-qwen-32b",
    value: "deepseek-r1-distill-qwen-32b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Deepseek-r1-distill-llama-70b",
    value: "deepseek-r1-distill-llama-70b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Qwen-2.5-32b",
    value: "qwen-2.5-32b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Mixtral-8x7b-32768",
    value: "mixtral-8x7b-32768",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Llama 3.1 8B – Instant/Low-latency",
    value: "llama-3.1-8b-instant",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "Llama 3.3 70B – Versatile",
    value: "llama-3.3-70b-versatile",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Gemma 2 – 9B Instruct (Italian tuned)",
    value: "gemma2-9b-it",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "Allam 2 – 7B",
    value: "allam-2-7b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "Llama Guard 4 – 12B Safety Model",
    value: "meta-llama/llama-guard-4-12b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "DeepSeek R1 Distilled Llama 70B",
    value: "deepseek-r1-distill-llama-70b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Llama 4 Maverick – 17B (128 Experts, Instruct)",
    value: "meta-llama/llama-4-maverick-17b-128e-instruct",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Llama 4 Scout – 17B (16 Experts, Instruct)",
    value: "meta-llama/llama-4-scout-17b-16e-instruct",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Kimi K2 Instruct (Moonshot AI)",
    value: "moonshotai/kimi-k2-instruct",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "Qwen 3 – 32B",
    value: "qwen/qwen3-32b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768
  }
]

export const DEEPSEEK_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number}> = [
  {
    name: "Deepseek-chat",
    value: "deepseek-chat",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000 // valore stimato in base a modelli simili
  }
]

export var OPENAI_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number}> = [
  {
    name: "Gpt-5",
    value: "gpt-5",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000
  },
  {
    name: "Gpt-5-mini",
    value: "gpt-5-mini",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000
  },
  {
    name: "Gpt-5-nano",
    value: "gpt-5-nano",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000
  },
  {
    name: "GPT-4.1",
    value: "gpt-4.1",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "GPT-4.1 mini",
    value: "gpt-4.1-mini",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "GPT-4.1 nano",
    value: "gpt-4.1-nano",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768
  },
  {
    name: "GPT-4o",
    value: "gpt-4o",
    description: "TYPE_GPT_MODEL.gpt-4o.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 16384
  },
  {
    name: "GPT-4o mini",
    value: "gpt-4o-mini",
    description: "TYPE_GPT_MODEL.gpt-4o-mini.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 16384
  },
  {
    name: "GPT-4 (Legacy)",
    value: "gpt-4",
    description: "TYPE_GPT_MODEL.gpt-4.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8192
  },
  {
    name: "GPT-4 Turbo Preview",
    value: "gpt-4-turbo-preview",
    description: "TYPE_GPT_MODEL.gpt-4-turbo-preview.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 4096
  },
  {
    name: "GPT-3 (DaVinci)",
    value: "text-davinci-003",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096
  },
  {
    name: "GPT-3.5 Turbo",
    value: "gpt-3.5-turbo",
    description: "TYPE_GPT_MODEL.gpt-3.5-turbo.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 4096
  },
  {
    name: "OpenAI o1-mini",
    value: "o1-mini",
    description: "TYPE_GPT_MODEL.o1-mini.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536
  },
  {
    name: "OpenAI o1-preview",
    value: "o1-preview",
    description: "TYPE_GPT_MODEL.o1-preview.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768
  }
]


export var OLLAMA_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
]

export var VLLM_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
]



export const LLM_MODEL: Array<{name: string, value: string, description: string, src: string, status: "active" | "inactive", models: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> }> = [
  { name: "Cohere",         value: "cohere",            description: "",      src:"assets/images/icons/ai_prompt/cohere.svg",      status: "active",   models: COHERE_MODEL        },
  { name: "Google",         value: "google",            description: "",      src:"assets/images/icons/ai_prompt/google.svg",      status: "active",   models: GOOGLE_MODEL        },
  { name: "Anthropic",      value: "anthropic",         description: "",      src:"assets/images/icons/ai_prompt/anthropic.svg",   status: "active",   models: ANTHROPIC_MODEL     },
  { name: "Groq",           value: "groq",              description: "",      src:"assets/images/icons/ai_prompt/groq.svg",        status: "active",   models: GROQ_MODEL          },
  { name: "Deepseek",       value: "deepseek",          description: "",      src:"assets/images/icons/ai_prompt/deepseek.svg",    status: "active",   models: DEEPSEEK_MODEL      },
  { name: "Ollama",         value: "ollama",            description: "",      src:"assets/images/icons/ai_prompt/ollama.svg",      status: "active",   models: OLLAMA_MODEL        },
  { name: "OpenAI",         value: "openai",            description: "",      src:"assets/images/icons/ai_prompt/openai.svg",      status: "active",   models: OPENAI_MODEL        },
  { name: "vLLM",           value: "vllm",              description: "",      src:"assets/images/icons/ai_prompt/vllm.svg",        status: "active",   models: VLLM_MODEL          },
]

export const DEFAULT_MODEL: { name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number} = OPENAI_MODEL.find(model => model.value === "gpt-4o")!

/**
* Generates llm_models_flat array by transforming all models from utils-ai_models
* Changes name format to "Provider - ModelName" and value format to "provider-modelname"
* Adds description and src for each record
*/
export function generateLlmModelsFlat(): Array<{modelName: string, llm: string, model: string, description: string, src: string, status: "active" | "inactive", configured: boolean, min_tokens?: number, max_output_tokens?: number}> {
  let llm_models_flat = [];//: Array<{modelName: string, llm: string, model: string, description: string, src: string, status: "active" | "inactive", configured: boolean, min_tokens?: number, max_output_tokens?: number}> = [];
  LLM_MODEL.forEach(provider => {
    provider.models.forEach(model => {
      // Add to the new array
      llm_models_flat.push({
        modelName:model.name,
        llm:provider.value,
        model:model.value,
        description: model.description,
        src: provider.src,
        status: model.status,
        configured: false, 
        min_tokens: (model as any).min_tokens || 1,
        max_output_tokens: (model as any).max_output_tokens || 128000
      });
    });
  });
  return llm_models_flat;
}

// Generate the array
export const LLM_MODELS_FLAT = generateLlmModelsFlat();

/************             AI PROMPT MODEL: END        ************************/