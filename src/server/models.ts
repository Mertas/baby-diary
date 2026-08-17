// Модели и провайдеры LLM. DeepSeek — базовый; OpenRouter и Groq подключаются
// опционально (бесплатные тарифы/модели) — их модели появляются в списке только при наличии ключа.
// Все провайдеры совместимы с OpenAI SDK (chat.completions), отличаются baseURL и ключом.
import OpenAI from 'openai';
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, DEEPSEEK_FLASH_MODEL, OPENROUTER_API_KEY, GROQ_API_KEY, LLM_TIMEOUT_MS } from './config.js';

export interface ModelInfo {
  id: string;
  label: string;
  group: string;
  free?: boolean; // пометка «бесплатная модель» (бейдж в селекте)
}

const OPENROUTER_FREE_MODELS: Array<Pick<ModelInfo, 'id' | 'label'>> = [
  { id: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
  { id: 'openrouter/qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B' },
  { id: 'openrouter/deepseek/deepseek-chat:free', label: 'DeepSeek V3' },
  { id: 'openrouter/meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B' },
  { id: 'openrouter/mistralai/mistral-7b-instruct:free', label: 'Mistral 7B' },
];

const GROQ_MODELS: Array<Pick<ModelInfo, 'id' | 'label'>> = [
  { id: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'groq/qwen-2.5-32b', label: 'Qwen 2.5 32B' },
  { id: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
];

/** Список моделей, доступных в этом окружении (ключи из .env). */
export function getAvailableModels(): ModelInfo[] {
  const out: ModelInfo[] = [];
  if (DEEPSEEK_API_KEY) {
    out.push({ id: DEEPSEEK_MODEL, label: 'DeepSeek Chat', group: 'DeepSeek' });
    if (DEEPSEEK_FLASH_MODEL && DEEPSEEK_FLASH_MODEL !== DEEPSEEK_MODEL) {
      out.push({ id: DEEPSEEK_FLASH_MODEL, label: 'DeepSeek Flash', group: 'DeepSeek' });
    }
    out.push({ id: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)', group: 'DeepSeek' });
  }
  if (OPENROUTER_API_KEY) {
    for (const m of OPENROUTER_FREE_MODELS) {
      out.push({ id: m.id, label: m.label + ' · free', group: 'OpenRouter (free)', free: true });
    }
  }
  if (GROQ_API_KEY) {
    for (const m of GROQ_MODELS) {
      out.push({ id: m.id, label: m.label, group: 'Groq (free тариф)', free: true });
    }
  }
  return out;
}

export function getModelInfo(model: string): ModelInfo | undefined {
  return getAvailableModels().find((m) => m.id === model);
}

/** Модель разрешена? (белый список для /prompt). */
export function isModelAllowed(model: string): boolean {
  return getAvailableModels().some((m) => m.id === model);
}

export function defaultModel(): string {
  return DEEPSEEK_MODEL || 'deepseek-chat';
}

// ─── Клиенты провайдеров (OpenAI-совместимые) ───

const deepseek = DEEPSEEK_API_KEY ? new OpenAI({ apiKey: DEEPSEEK_API_KEY, baseURL: DEEPSEEK_BASE_URL, timeout: LLM_TIMEOUT_MS }) : null;
const openrouter = OPENROUTER_API_KEY ? new OpenAI({ apiKey: OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1', timeout: LLM_TIMEOUT_MS, defaultHeaders: { 'HTTP-Referer': 'http://localhost:1911', 'X-Title': 'Baby Diary' } }) : null;
const groq = GROQ_API_KEY ? new OpenAI({ apiKey: GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1', timeout: LLM_TIMEOUT_MS }) : null;

/** Клиент под модель (по префиксу id модели). */
export function clientFor(model: string): OpenAI {
  if (model.startsWith('openrouter/') && openrouter) return openrouter;
  if (model.startsWith('groq/') && groq) return groq;
  if (deepseek) return deepseek;
  throw new Error('No LLM provider configured (check .env)');
}
