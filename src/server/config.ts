import 'dotenv/config';

export const PORT = parseInt(process.env.PORT || '1911', 10);
export const DB_PATH = process.env.DB_PATH || './data/babydiary.db';
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
export const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
export const DEEPSEEK_FLASH_MODEL = process.env.DEEPSEEK_FLASH_MODEL || 'deepseek-chat';
export const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10);
