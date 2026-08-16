// Общие типы состояния дневника (state). Используются сервером (нормализация/merge)
// и клиентом (рендер). Начало постепенной типизации: каждый тип пересекается с
// Record<string, any>, чтобы не ломать динамический код (LLM-поля вроде t.content,
// r.tags, s.anything читаются клиентом без объявления).

export type FeedEvent = {
  timestamp: number;
  type?: string;          // 'грудное' | 'смесь' | 'прикорм' (+ нормализованные синонимы)
  amount?: number;
  note?: string;
  _delete?: boolean;
} & Record<string, any>;

export type SleepEvent = {
  timestamp: number;
  type?: 'nap' | 'night';
  end?: number;
  note?: string;
  _delete?: boolean;
} & Record<string, any>;

export type EventItem = {
  timestamp: number;
  title?: string;
  note?: string;
  _delete?: boolean;
} & Record<string, any>;

export type CalendarEvent = {
  id: string;
  title: string;
  date?: string;          // 'YYYY-MM-DD' (или свободная строка до уточнения)
  time?: string | null;
  recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  until?: string | null;
  important?: boolean;
  done?: boolean;
  note?: string | null;
  _delete?: boolean;
} & Record<string, any>;

export type Skill = {
  skill?: string;
  title?: string;
  status?: 'done' | 'current' | 'upcoming';
  age?: string;
  note?: string;
} & Record<string, any>;

export type Tip = {
  title: string;
  category?: string;
  text: string;
  _delete?: boolean;
} & Record<string, any>;

export type Recipe = {
  title: string;
  category?: string;
  instructions?: string;
  ingredients?: string[];
  age?: string;
  tags?: string[];
  _delete?: boolean;
} & Record<string, any>;

export type Todo = {
  text?: string;
  title?: string;
  done?: boolean;
  section?: string;
  _delete?: boolean;
} & Record<string, any>;

export type Reminder = {
  date?: string;
  text: string;
  done?: boolean;
  _delete?: boolean;
} & Record<string, any>;

export type BudgetEntry = {
  id?: string;
  type: 'income' | 'expense';
  category?: string;
  amount: number;
  note?: string;
  date?: string;
  _delete?: boolean;
} & Record<string, any>;

export type FamilyMember = {
  name: string;
  role?: string;
  note?: string;
  _delete?: boolean;
} & Record<string, any>;

export type LlmNote = {
  note: string;
  _delete?: boolean;
} & Record<string, any>;

export type StockItem = {
  name: string;
  qty?: number | string;
  unit?: string;
  note?: string;
  _delete?: boolean;
} & Record<string, any>;

export type PhotoExif = {
  taken?: string;         // 'YYYY:MM:DD HH:MM:SS'
  // gps сознательно НЕ хранится (приватность) — см. stripSensitiveState
} & Record<string, any>;

export type Photo = {
  id: string;
  desc?: string;
  ts: number;
  type?: 'photo' | 'video';
  duration?: number;
  exif?: PhotoExif;
  _delete?: boolean;
} & Record<string, any>;

export type TabItem = {
  id: string;
  title: string;
  emoji?: string;
  _delete?: boolean;
} & Record<string, any>;

export type Details = {
  pregnancy?: string;
  birth?: string;
  health?: string;
  feeding?: string;
  allergies?: string;
  skills?: string;
  toys?: string;
  sleepPattern?: string;
  likes?: string;
  dislikes?: string;
  medications?: string;
  doctors?: string;
  [key: string]: unknown;
};

/** Полное состояние дневника. Индексная сигнатура — временный мост для динамического кода. */
export type BabyState = {
  name?: string;
  gender?: string;
  birthDate?: string;
  weight?: number | string;
  height?: number | string;
  city?: string;
  blurb?: string;
  avatar?: string;
  lastMomDay?: string;
  details?: Details;
  clothes?: Record<string, any>;
  kinder?: Record<string, any>;
  feeds?: FeedEvent[];
  sleeps?: SleepEvent[];
  events?: EventItem[];
  tips?: Tip[];
  recipes?: Recipe[];
  spurts?: Record<string, any>[];
  todos?: Todo[];
  shopping?: Record<string, any>[];
  reminders?: Reminder[];
  calendar?: CalendarEvent[];
  tabs?: TabItem[];
  family?: FamilyMember[];
  budget?: BudgetEntry[];
  llmNotes?: LlmNote[];
  stock?: StockItem[];
  photos?: Photo[];
  skills?: Skill[];
} & Record<string, any>;
