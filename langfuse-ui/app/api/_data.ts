import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), ".data");

async function ensureDir(dir: string) {
  try { await fs.promises.mkdir(dir, { recursive: true }); } catch {}
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  await ensureDir(DATA_DIR);
  const file = path.join(DATA_DIR, name);
  try { const buf = await fs.promises.readFile(file, "utf8"); return JSON.parse(buf) as T; } catch { return fallback; }
}

async function writeJson<T>(name: string, value: T): Promise<void> {
  await ensureDir(DATA_DIR);
  const file = path.join(DATA_DIR, name);
  const tmp = file + ".tmp";
  await fs.promises.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.promises.rename(tmp, file);
}

export type UserPrompt = {
  id: string;
  userId: string;
  title: string;
  content: string;
  legalArea: string;
  tags: string[];
  isPublic: boolean;
  version: number;
  promptLanguage?: string;
  targetLanguage?: string;
  createdAt: string;
  updatedAt: string;
};

export type PromptInteraction = {
  promptId: string;
  userId: string;
  interactionType: "helpful" | "view" | "copy" | "use" | "rate";
  rating?: number;
  timestamp: string;
};

export type UserRanking = {
  userId: string;
  totalScore: number;
  promptCount: number;
  helpfulVotes: number;
  expertiseAreas: string[];
  level: "junior" | "senior" | "expert";
};

export async function getUserPrompts(): Promise<UserPrompt[]> {
  return readJson<UserPrompt[]>("user_prompts.json", []);
}

export async function setUserPrompts(items: UserPrompt[]): Promise<void> {
  return writeJson("user_prompts.json", items);
}

export async function getInteractions(): Promise<PromptInteraction[]> {
  return readJson<PromptInteraction[]>("prompt_interactions.json", []);
}

export async function setInteractions(items: PromptInteraction[]): Promise<void> {
  return writeJson("prompt_interactions.json", items);
}

export async function getRankings(): Promise<UserRanking[]> {
  return readJson<UserRanking[]>("user_rankings.json", []);
}

export async function setRankings(items: UserRanking[]): Promise<void> {
  return writeJson("user_rankings.json", items);
}

export function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}



