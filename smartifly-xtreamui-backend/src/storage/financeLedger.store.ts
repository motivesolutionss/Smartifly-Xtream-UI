import { promises as fs } from 'fs';
import path from 'path';

export type LedgerEntryType =
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_CANCELED'
  | 'PLAN_CHANGED'
  | 'REFUND'
  | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  userId?: number | null;
  licenseId?: number | null;
  amount: number;
  currency: string;
  status: 'POSTED' | 'VOID';
  note?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

interface LedgerState {
  entries: LedgerEntry[];
}

const STORE_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'finance-ledger.json');

const defaultState = (): LedgerState => ({ entries: [] });

let writeQueue: Promise<void> = Promise.resolve();

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(defaultState(), null, 2), 'utf8');
  }
}

async function readState(): Promise<LedgerState> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as Partial<LedgerState>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return defaultState();
  }
}

function queueWrite(nextState: LedgerState): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureStoreFile();
    await fs.writeFile(STORE_FILE, JSON.stringify(nextState, null, 2), 'utf8');
  });
  return writeQueue;
}

export async function listLedgerEntries(): Promise<LedgerEntry[]> {
  const state = await readState();
  return [...state.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function appendLedgerEntry(input: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry> {
  const state = await readState();
  const entry: LedgerEntry = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  state.entries.unshift(entry);
  await queueWrite(state);
  return entry;
}
