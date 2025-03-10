/************             AI PROMPT MODEL: START        ************************/
export const COHERE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Command-r",         value: "command-r",       description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Command-r-plus",    value: "command-r-plus",  description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
]

export const GOOGLE_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Gemini-pro",         value: "gemini-pro",       description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
]

export const ANTHROPIC_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Claude-3.5 Sonnet",                value: "claude-3-5-sonnet-20240620",       description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Claude-3.7 Sonnet",                value: "claude-3-7-sonnet-20250219",       description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
]

export const GROQ_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Llama-3.2-11b-vision-preview",         value: "llama-3.2-11b-vision-preview",         description: "TYPE_GPT_MODEL.text-davinci-003.description",          status: "active" },
    { name: "Llama-3.1-8b-instant",                 value: "llama-3.1-8b-instant",                  description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama-3.2-3b-preview",                 value: "llama-3.2-3b-preview",                  description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama-3.2-90b-vision-preview",         value: "llama-3.2-90b-vision-preview",          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama-guard-3-8b",                     value: "llama-guard-3-8b",                      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama-3.2-1b-preview",                 value: "llama-3.2-1b-preview",                  description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama-3.3-70b-versatile",              value: "llama-3.3-70b-versatile",               description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama3-70b-8192",                      value: "llama3-70b-8192",                       description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Llama-3.3-70b-specdec",                value: "llama-3.3-70b-specdec",                 description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Deepseek-r1-distill-qwen-32b",         value: "deepseek-r1-distill-qwen-32b",          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Deepseek-r1-distill-llama-70b",        value: "deepseek-r1-distill-llama-70b",         description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Qwen-2.5-32b",                         value: "qwen-2.5-32b",                          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Gemma2-9b-it",                         value: "gemma2-9b-it",                          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "active" },
    { name: "Allam-2-7b",                           value: "allam-2-7b",                            description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
    { name: "Mixtral-8x7b-32768",                   value: "mixtral-8x7b-32768",                    description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive" },
]

export const DEEPSEEK_MODEL: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> = [
    { name: "Deepseek-chat",                value: "deepseek-chat",                    description: "TYPE_GPT_MODEL.deepseek-chat.description",         status: "active" },
]

export const LLM_MODEL: Array<{name: string, value: string, description: string, src: string, status: "active" | "inactive", models: Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> }> = [
    { name: "Cohere",         value: "cohere",            description: "",      src:"assets/images/icons/ai_prompt/cohere.svg",      status: "active",   models: COHERE_MODEL        },
    { name: "Google",         value: "google",            description: "",      src:"assets/images/icons/ai_prompt/google.svg",      status: "active",   models: GOOGLE_MODEL        },
    { name: "Anthropic",      value: "anthropic",         description: "",      src:"assets/images/icons/ai_prompt/anthropic.svg",   status: "active",   models: ANTHROPIC_MODEL     },
    { name: "Groq",           value: "groq",              description: "",      src:"assets/images/icons/ai_prompt/groq.svg",        status: "active",   models: GROQ_MODEL          },
    { name: "Deepseek",       value: "deepseek",          description: "",      src:"assets/images/icons/ai_prompt/deepseek.svg",    status: "active",   models: DEEPSEEK_MODEL      },
]
/************             AI PROMPT MODEL: END        ************************/