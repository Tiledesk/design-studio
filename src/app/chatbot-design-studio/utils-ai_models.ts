/************             AI PROMPT MODEL: START        ************************/

export const COHERE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number, reasoning: boolean}> = [
  {
    name: "Command A+ (05-2026)",
    value: "command-a-plus-05-2026",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 64000,
    reasoning: true
  },
  {
    name: "Command A (03-2025)",
    value: "command-a-03-2025",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8000,
    reasoning: false
  },
  {
    name: "Command R7B (12-2024)",
    value: "command-r7b-12-2024",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 4000,
    reasoning: true
  },
  {
    name: "Command A Vision (07-2025)",
    value: "command-a-vision-07-2025",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8000,
    reasoning: false
  },
  {
    name: "Command R+ (08-2024)",
    value: "command-r-plus-08-2024",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: false
  },
  {
    name: "Command A Reasoning (08-2025)",
    value: "command-a-reasoning-08-2025",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32000,
    reasoning: true
  },
  {
    name: "Command A Translate",
    value: "command-a-translate-08-2025",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 8000,
    reasoning: false
  },
  {
    name: "Command R",
    value: "command-r",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096,
    reasoning: false
  },
  {
    name: "Command R+",
    value: "command-r-plus",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: false
  },
  {
    name: "Command R+ (04-2024)",
    value: "command-r-plus-04-2024",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: false
  },
]

export const GOOGLE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number, reasoning: boolean}> = [
  {
    name: "Gemini 4 Carbon",
    value: "gemini-4-carbon",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini 4 Argon",
    value: "gemini-4-argon",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini 3.8 Flash",
    value: "gemini-3.8-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini 3.6 Flash",
    value: "gemini-3.6-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini 3.5 Flash",
    value: "gemini-3.5-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65000,
    reasoning: true
  },
  {
    name: "Gemini 3.5 Flash-Lite",
    value: "gemini-3.5-flash-lite",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini 3.1 Flash-Lite",
    value: "gemini-3.1-flash-lite",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini Omni Flash",
    value: "gemini-omni-1.1-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 57920,
    reasoning: true
  },
  {
    name: "Gemini 3.1 Pro Preview",
    value: "gemini-3.1-pro-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini 3.1 Flash Live Preview",
    value: "gemini-3.1-flash-live-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Gemini 3 Flash Preview",
    value: "gemini-3-flash-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65500,
    reasoning: true
  },
  {
    name: "Gemini 2.5 Pro",
    value: "gemini-2.5-pro",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 64000,
    reasoning: true
  },
  {
    name: "Gemini 2.0 Flash",
    value: "gemini-2.0-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 1000000,
    reasoning: false
  },
  {
    name: "Gemini 2.0 Flash Lite",
    value: "gemini-2.0-flash-lite",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 1000000,
    reasoning: false
  },
  {
    name: "Gemini 2.5 Flash",
    value: "gemini-2.5-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 1000000,
    reasoning: true
  },
  {
    name: "Gemini 2.5 Flash Lite",
    value: "gemini-2.5-flash-lite",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 1000000,
    reasoning: false
  },
  {
    name: "Gemini-pro",
    value: "gemini-pro",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 1000000,
    reasoning: false
  },
  {
    name: "Gemini 1.5 Flash",
    value: "gemini-1.5-flash",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 1000000,
    reasoning: false
  },
  {
    name: "Gemini 3 pro preview",
    value: "gemini-3-pro-preview",
    description: "TYPE_GPT_MODEL.gemini-3-pro-preview.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
]

export const ANTHROPIC_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number, reasoning: boolean}> = [
  {
    name: "Claude Opus 5.5",
    value: "claude-opus-5-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Sonnet 5.5",
    value: "claude-sonnet-5-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Haiku 5.5",
    value: "claude-haiku-5-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Fable 5.2",
    value: "claude-fable-5-2",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Fable 5.1",
    value: "claude-fable-5-1",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Opus 5",
    value: "claude-opus-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Sonnet 5",
    value: "claude-sonnet-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Fable 5",
    value: "claude-fable-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: false
  },
  {
    name: "Claude Opus 4.8",
    value: "claude-opus-4-8",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Opus 4.7",
    value: "claude-opus-4-7",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Opus 4.6",
    value: "claude-opus-4-6",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Claude Opus 4.5",
    value: "claude-opus-4-5-20251101",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 64000,
    reasoning: true
  },
  {
    name: "Claude Sonnet 4.6",
    value: "claude-sonnet-4-6",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 64000,
    reasoning: true
  },
  {
    name: "Claude Sonnet 4.5",
    value: "claude-sonnet-4-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 64000,
    reasoning: false
  },
  {
    name: "Claude Haiku 4.5",
    value: "claude-haiku-4-5",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 64000,
    reasoning: true
  },
  {
    name: "Claude Opus 4.1",
    value: "claude-opus-4-1",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32000,
    reasoning: true
  },
  {
    name: "Claude 4 Sonnet",
    value: "claude-sonnet-4-0",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: false
  },
  {
    name: "Claude 4 Opus",
    value: "claude-opus-4-0",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: true
  },
  {
    name: "Claude 4 Sonnet",
    value: "claude-sonnet-4-20250514",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: false
  },
  {
    name: "Claude 4 Opus",
    value: "claude-opus-4-20250514",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: false
  },
  {
    name: "Claude-3.5 Sonnet",
    value: "claude-3-5-sonnet-20240620",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: false
  },
  {
    name: "Claude 3.5 Haiku",
    value: "claude-3-5-haiku-latest",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: false
  },
  {
    name: "Claude 3.7 Sonnet",
    value: "claude-3-7-sonnet-latest",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: true
  },
  {
    name: "Claude-3.7 Sonnet",
    value: "claude-3-7-sonnet-20250219",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 200000,
    reasoning: true
  },
]

export const GROQ_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number, reasoning: boolean}> = [
  {
    name: "MiniMax M2.7 (Enterprise Preview)",
    value: "minimaxai/minimax-m2.7",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 131072,
    reasoning: true
  },
  {
    name: "Muse Spark Open (Enterprise Preview)",
    value: "meta-models/muse-spark-open",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 131072,
    reasoning: true
  },
  {
    name: "Llama Prompt Guard 2 86M",
    value: "meta-llama/llama-prompt-guard-2-86m",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 512,
    reasoning: false
  },
  {
    name: "Llama Prompt Guard 2 22M",
    value: "meta-llama/llama-prompt-guard-2-22m",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 512,
    reasoning: false
  },
  {
    name: "Llama 3.1 8B Instant",
    value: "llama-3.1-8b-instant",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "Llama 3.3 70B Versatile",
    value: "llama-3.3-70b-versatile",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "ALLaM-2-7B",
    value: "allam-2-7b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 4096,
    reasoning: false
  },
  {
    name: "Compound",
    value: "groq/compound",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: true
  },
  {
    name: "Compound Mini",
    value: "groq/compound-mini",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: true
  },
  {
    name: "Qwen3.6-27B",
    value: "qwen/qwen3.6-27b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: true
  },
  {
    name: "GPT OSS 120B",
    value: "openai/gpt-oss-120b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "GPT OSS 20B",
    value: "openai/gpt-oss-20b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Safety GPT OSS 20B",
    value: "openai/gpt-oss-safeguard-20b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: true
  },
  {
    name: "Qwen3.6-27B",
    value: "qwen3.6-27b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 16384,
    reasoning: true
  },
  {
    name: "GPT OSS 20B",
    value: "gpt-oss-20b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: true
  },
  {
    name: "GPT OSS 120B",
    value: "gpt-oss-120b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: true
  },
  {
    name: "Safety GPT OSS 20B",
    value: "gpt-oss-safeguard-20b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: false
  },
  {
    name: "Llama 4 Scout – 17B (16 Experts, Instruct)",
    value: "meta-llama/llama-4-scout-17b-16e-instruct",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Kimi K2 Instruct (Moonshot AI)",
    value: "moonshotai/kimi-k2-instruct",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Qwen 3 – 32B",
    value: "qwen/qwen3-32b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Llama Guard 4 – 12B Safety Model",
    value: "meta-llama/llama-guard-4-12b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "DeepSeek R1 Distilled Llama 70B",
    value: "deepseek-r1-distill-llama-70b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Llama 4 Maverick – 17B (128 Experts, Instruct)",
    value: "meta-llama/llama-4-maverick-17b-128e-instruct",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Gemma 2 – 9B Instruct (Italian tuned)",
    value: "gemma2-9b-it",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "Mixtral-8x7b-32768",
    value: "mixtral-8x7b-32768",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Llama-3.2-11b-vision-preview",
    value: "llama-3.2-11b-vision-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "Llama-3.2-3b-preview",
    value: "llama-3.2-3b-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "Llama-3.2-90b-vision-preview",
    value: "llama-3.2-90b-vision-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Llama-guard-3-8b",
    value: "llama-guard-3-8b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "Llama-3.2-1b-preview",
    value: "llama-3.2-1b-preview",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096,
    reasoning: false
  },
  {
    name: "Llama3-70b-8192",
    value: "llama3-70b-8192",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "Llama-3.3-70b-specdec",
    value: "llama-3.3-70b-specdec",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Deepseek-r1-distill-qwen-32b",
    value: "deepseek-r1-distill-qwen-32b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "Qwen-2.5-32b",
    value: "qwen-2.5-32b",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
]

export const DEEPSEEK_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number, reasoning: boolean}> = [
  {
    name: "DeepSeek V4.1 Flash",
    value: "deepseek-flash",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 384000,
    reasoning: true
  },
  {
    name: "DeepSeek V4 Pro",
    value: "deepseek-v4-pro",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 384000,
    reasoning: true
  },
  {
    name: "Deepseek-chat",
    value: "deepseek-chat",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
]

export const OPENAI_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number, reasoning: boolean}> = [
  {
    name: "GPT-6 Astra",
    value: "gpt-6-astra",
    description: "TYPE_GPT_MODEL.gpt-6-astra.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "GPT-6.1 Sol",
    value: "gpt-6.1-sol",
    description: "TYPE_GPT_MODEL.gpt-6.1-sol.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "GPT-6.1 Terra",
    value: "gpt-6.1-terra",
    description: "TYPE_GPT_MODEL.gpt-6.1-terra.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "GPT-6 Luna",
    value: "gpt-6-luna",
    description: "TYPE_GPT_MODEL.gpt-6-luna.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "GPT-6 Sol",
    value: "gpt-6-sol",
    description: "TYPE_GPT_MODEL.gpt-6-sol.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.6 Sol",
    value: "gpt-5.6-sol",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.6 Terra",
    value: "gpt-5.6-terra",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.6 Luna",
    value: "gpt-5.6-luna",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.5",
    value: "gpt-5.5",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.4",
    value: "gpt-5.4",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.4 mini",
    value: "gpt-5.4-mini",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.4 nano",
    value: "gpt-5.4-nano",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.3",
    value: "gpt-5.3-chat-latest",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.2",
    value: "gpt-5.2",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5.1",
    value: "gpt-5.1",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5",
    value: "gpt-5",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5-mini",
    value: "gpt-5-mini",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "Gpt-5-nano",
    value: "gpt-5-nano",
    description: "TYPE_GPT_MODEL.deepseek-chat.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: true
  },
  {
    name: "GPT-4.1",
    value: "gpt-4.1",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "GPT-4.1 mini",
    value: "gpt-4.1-mini",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "GPT-4o",
    value: "gpt-4o",
    description: "TYPE_GPT_MODEL.gpt-4o.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 16384,
    reasoning: false
  },
  {
    name: "GPT-4o mini",
    value: "gpt-4o-mini",
    description: "TYPE_GPT_MODEL.gpt-4o-mini.description",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 16384,
    reasoning: false
  },
  {
    name: "GPT-4 (Legacy)",
    value: "gpt-4",
    description: "TYPE_GPT_MODEL.gpt-4.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 8192,
    reasoning: false
  },
  {
    name: "GPT-3.5 Turbo",
    value: "gpt-3.5-turbo",
    description: "TYPE_GPT_MODEL.gpt-3.5-turbo.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096,
    reasoning: false
  },
  {
    name: "GPT-4.1 nano",
    value: "gpt-4.1-nano",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
  {
    name: "GPT-4 Turbo Preview",
    value: "gpt-4-turbo-preview",
    description: "TYPE_GPT_MODEL.gpt-4-turbo-preview.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096,
    reasoning: false
  },
  {
    name: "GPT-3 (DaVinci)",
    value: "text-davinci-003",
    description: "TYPE_GPT_MODEL.text-davinci-003.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 4096,
    reasoning: false
  },
  {
    name: "OpenAI o1-mini",
    value: "o1-mini",
    description: "TYPE_GPT_MODEL.o1-mini.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 65536,
    reasoning: false
  },
  {
    name: "OpenAI o1-preview",
    value: "o1-preview",
    description: "TYPE_GPT_MODEL.o1-preview.description",
    status: "inactive",
    min_tokens: 1,
    max_output_tokens: 32768,
    reasoning: false
  },
]


export var OLLAMA_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive", min_tokens?: number, max_output_tokens?: number, reasoning?: boolean, server?: string}> = [
  {
    name: "ollama_1",
    value: "ollama_1",
    description: "",
    status: "active",
    min_tokens: 1,
    max_output_tokens: 128000,
    reasoning: false
  }
]

export var VLLM_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
]

// Gemini Agent Platform: come vLLM, i modelli arrivano solo dall'integration di progetto
// (GET /integration/name/agentplatform -> value.servers[].models), mai da questa lista.
export var AGENTPLATFORM_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
]

// Filled at runtime from the project's OpenRouter integration: the models and
// the providers that serve them are chosen in the dashboard, not listed here.
export var OPENROUTER_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
]



export const LLM_MODEL: Array<{name: string, value: string, description: string, src: string, status: "active" | "inactive", models: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> }> = [
  { name: "Cohere",         value: "cohere",            description: "",      src:"assets/images/icons/ai_prompt/cohere.svg",      status: "active",   models: COHERE_MODEL        },
  { name: "Google",         value: "google",            description: "",      src:"assets/images/icons/ai_prompt/google.svg",      status: "active",   models: GOOGLE_MODEL        },
  { name: "Anthropic",      value: "anthropic",         description: "",      src:"assets/images/icons/ai_prompt/anthropic.svg",   status: "active",   models: ANTHROPIC_MODEL     },
  { name: "Groq",           value: "groq",              description: "",      src:"assets/images/icons/ai_prompt/groq.svg",        status: "active",   models: GROQ_MODEL          },
  { name: "Deepseek",       value: "deepseek",          description: "",      src:"assets/images/icons/ai_prompt/deepseek.svg",    status: "active",   models: DEEPSEEK_MODEL      },
  { name: "Ollama",         value: "ollama",            description: "",      src:"assets/images/icons/ai_prompt/ollama.svg",      status: "active",   models: OLLAMA_MODEL        },
  { name: "vLLM",           value: "vllm",              description: "",      src:"assets/images/icons/ai_prompt/vllm.svg",        status: "active",   models: VLLM_MODEL          },
  { name: "OpenRouter",     value: "openrouter",        description: "",      src:"assets/images/icons/ai_prompt/openrouter.png",  status: "active",   models: OPENROUTER_MODEL    },
  { name: "OpenAI",         value: "openai",            description: "",      src:"assets/images/icons/ai_prompt/openai.svg",      status: "active",   models: OPENAI_MODEL        },
  { name: "Gemini Agent Platform", value: "agentplatform", description: "",   src:"assets/images/icons/ai_prompt/google.svg",      status: "active",   models: AGENTPLATFORM_MODEL },
 ]

export const DEFAULT_MODEL: { name: string, value: string, description:string, status: "active" | "inactive", min_tokens: number, max_output_tokens: number, reasoning: boolean} = OPENAI_MODEL.find(model => model.value === "gpt-5.4-mini")!

/**
* Generates llm_models_flat array by transforming all models from utils-ai_models
* Changes name format to "Provider - ModelName" and value format to "provider-modelname"
* Adds description and src for each record
*/
export function generateLlmModelsFlat(): Array<{uid: string, modelName: string, llm: string, llmLabel: string, model: string, description: string, src: string, status: "active" | "inactive", configured: boolean, min_tokens?: number, max_output_tokens?: number, reasoning?: boolean, server?: string}> {
  let llm_models_flat: Array<{uid: string, modelName: string, llm: string, llmLabel: string, model: string, description: string, src: string, status: "active" | "inactive", configured: boolean, min_tokens?: number, max_output_tokens?: number, reasoning?: boolean, server?: string}> = [];
  LLM_MODEL.forEach(provider => {
    provider.models.forEach(model => {
      const server = (model as any).server;
      llm_models_flat.push({
        // Chiave univoca per la select: lo stesso model id può arrivare da più provider
        // (es. "gemini-2.5-flash" statico di Google e via Agent Platform) o da più server
        // della stessa integration. Senza uid ng-select aggancerebbe la prima voce trovata.
        uid: `${provider.value}::${server ?? ''}::${model.value}`,
        modelName: model.name,
        llm: provider.value,
        // Etichetta del gruppo nella select: il nome leggibile del provider
        // ("Gemini Agent Platform"), non il value tecnico salvato su action.llm.
        llmLabel: provider.name,
        model: model.value,
        description: model.description,
        src: provider.src,
        status: model.status,
        configured: false,
        min_tokens: (model as any).min_tokens || 1,
        max_output_tokens: (model as any).max_output_tokens || 128000,
        reasoning: (model as any).reasoning ?? false,
        server: server
      });
    });
  });
  return llm_models_flat;
}

// Generate the array
export const LLM_MODELS_FLAT = generateLlmModelsFlat();

/************             AI PROMPT MODEL: END        ************************/