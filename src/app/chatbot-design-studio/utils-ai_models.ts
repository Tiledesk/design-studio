/************             AI PROMPT MODEL: START        ************************/
export const COHERE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Command R",                        value: "command-r",                    description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Command R+",                       value: "command-r-plus",               description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Command A (03-2025)",              value: "command-a-03-2025",            description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Command R7B (12-2024)",            value: "command-r7b-12-2024",          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Command A Vision (07-2025)",       value: "command-a-vision-07-2025",     description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Command R+ (04-2024)",             value: "command-r-plus-04-2024",       description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },

]

export const GOOGLE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Gemini-pro",               value: "gemini-pro",              description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Gemini 1.5 Flash",         value: "gemini-1.5-flash",        description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Gemini 2.0 Flash",         value: "gemini-2.0-flash",        description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Gemini 2.0 Flash Lite",    value: "gemini-2.0-flash-lite",   description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Gemini 2.5 Flash",         value: "gemini-2.5-flash",        description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Gemini 2.5 Flash Lite",    value: "gemini-2.5-flash-lite",   description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
]

export const ANTHROPIC_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Claude-3.7 Sonnet",                value: "claude-3-7-sonnet-20250219",        description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Claude Sonnet 4",                  value: "claude-sonnet-4-20250514",          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Claude Opus 4",                    value: "claude-opus-4-20250514",            description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    
    { name: "Claude-3.5 Sonnet",                value: "claude-3-5-sonnet-20240620",        description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Claude 3.5 Haiku",                 value: "claude-3-5-haiku-latest",           description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Claude 3.7 Sonnet",                value: "claude-3-7-sonnet-latest",          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Claude Opus 4",                    value: "claude-opus-4-0",                   description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Claude Sonnet 4",                  value: "claude-sonnet-4-0",                 description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
]

export const GROQ_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Llama-3.2-11b-vision-preview",                     value: "llama-3.2-11b-vision-preview",                      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Llama-3.2-3b-preview",                             value: "llama-3.2-3b-preview",                              description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Llama-3.2-90b-vision-preview",                     value: "llama-3.2-90b-vision-preview",                      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Llama-guard-3-8b",                                 value: "llama-guard-3-8b",                                  description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Llama-3.2-1b-preview",                             value: "llama-3.2-1b-preview",                              description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Llama3-70b-8192",                                  value: "llama3-70b-8192",                                   description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Llama-3.3-70b-specdec",                            value: "llama-3.3-70b-specdec",                             description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Deepseek-r1-distill-qwen-32b",                     value: "deepseek-r1-distill-qwen-32b",                      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Deepseek-r1-distill-llama-70b",                    value: "deepseek-r1-distill-llama-70b",                     description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Qwen-2.5-32b",                                     value: "qwen-2.5-32b",                                      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Mixtral-8x7b-32768",                               value: "mixtral-8x7b-32768",                                description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    
    { name: "Llama 3.1 8B – Instant/Low-latency",               value: "llama-3.1-8b-instant",                              description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama 3.3 70B – Versatile",                        value: "llama-3.3-70b-versatile",                           description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Gemma 2 – 9B Instruct (Italian tuned)",            value: "gemma2-9b-it",                                      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Allam 2 – 7B",                                     value: "allam-2-7b",                                        description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama 3 70B – 8K context",                         value: "llama3-70b-8192",                                   description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama Guard 4 – 12B Safety Model",                 value: "meta-llama/llama-guard-4-12b",                      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "DeepSeek R1 Distilled Llama 70B",                  value: "deepseek-r1-distill-llama-70b",                     description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama 4 Maverick – 17B (128 Experts, Instruct)",   value: "meta-llama/llama-4-maverick-17b-128e-instruct",     description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama 4 Scout – 17B (16 Experts, Instruct)",       value: "meta-llama/llama-4-scout-17b-16e-instruct",         description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Kimi K2 Instruct (Moonshot AI)",                   value: "moonshotai/kimi-k2-instruct",                       description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Qwen 3 – 32B",                                     value: "qwen/qwen3-32b",                                    description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
]

export const DEEPSEEK_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Deepseek-chat",                value: "deepseek-chat",                    description: "TYPE_GPT_MODEL.deepseek-chat.description",         status: "active" },
]

export const OPENAI_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Gpt-5",                value: "gpt-5",                    description: "TYPE_GPT_MODEL.deepseek-chat.description",         status: "active" },
    { name: "Gpt-5-mini",           value: "gpt-5-mini",               description: "TYPE_GPT_MODEL.deepseek-chat.description",         status: "active" },
    { name: "Gpt-5-nano",           value: "gpt-5-nano",               description: "TYPE_GPT_MODEL.deepseek-chat.description",         status: "active" },
]

export const OLLAMA_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
]

export const LLM_MODEL: Array<{name: string, value: string, description: string, src: string, status: "active" | "inactive", models: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> }> = [
    { name: "Cohere",         value: "cohere",            description: "",      src:"assets/images/icons/ai_prompt/cohere.svg",      status: "active",   models: COHERE_MODEL        },
    { name: "Google",         value: "google",            description: "",      src:"assets/images/icons/ai_prompt/google.svg",      status: "active",   models: GOOGLE_MODEL        },
    { name: "Anthropic",      value: "anthropic",         description: "",      src:"assets/images/icons/ai_prompt/anthropic.svg",   status: "active",   models: ANTHROPIC_MODEL     },
    { name: "Groq",           value: "groq",              description: "",      src:"assets/images/icons/ai_prompt/groq.svg",        status: "active",   models: GROQ_MODEL          },
    { name: "Deepseek",       value: "deepseek",          description: "",      src:"assets/images/icons/ai_prompt/deepseek.svg",    status: "active",   models: DEEPSEEK_MODEL      },
    { name: "Ollama",         value: "ollama",            description: "",      src:"assets/images/icons/ai_prompt/ollama.svg",      status: "active",   models: OLLAMA_MODEL        },
    { name: "Openai",         value: "openai",            description: "",      src:"assets/images/icons/ai_prompt/openai.svg",      status: "active",   models: OPENAI_MODEL        },
]
/************             AI PROMPT MODEL: END        ************************/