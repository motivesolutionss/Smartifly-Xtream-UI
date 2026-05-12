import { promises as fs } from 'fs';
import path from 'path';

type JsonObject = Record<string, unknown>;

export interface TicketRecord extends JsonObject {
  id: string;
  status: string;
  tags?: string[];
  replies?: JsonObject[];
  updatedAt?: string;
}

export interface TicketTemplateRecord extends JsonObject {
  id: string;
  updatedAt?: string;
}

interface TicketStoreState {
  tickets: TicketRecord[];
  templates: TicketTemplateRecord[];
}

const STORE_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'admin-tickets.json');

const defaultState = (): TicketStoreState => ({ tickets: [], templates: [] });

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(defaultState(), null, 2), 'utf8');
  }
}

async function readState(): Promise<TicketStoreState> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as Partial<TicketStoreState>;
    return {
      tickets: Array.isArray(parsed.tickets) ? (parsed.tickets as TicketRecord[]) : [],
      templates: Array.isArray(parsed.templates) ? (parsed.templates as TicketTemplateRecord[]) : [],
    };
  } catch {
    return defaultState();
  }
}

function queueWrite(nextState: TicketStoreState): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureStoreFile();
    await fs.writeFile(STORE_FILE, JSON.stringify(nextState, null, 2), 'utf8');
  });
  return writeQueue;
}

export async function listTickets(): Promise<TicketRecord[]> {
  const state = await readState();
  return state.tickets;
}

export async function saveTickets(tickets: TicketRecord[]): Promise<void> {
  const state = await readState();
  await queueWrite({ ...state, tickets });
}

export async function listTicketTemplates(): Promise<TicketTemplateRecord[]> {
  const state = await readState();
  return state.templates;
}

export async function saveTicketTemplates(templates: TicketTemplateRecord[]): Promise<void> {
  const state = await readState();
  await queueWrite({ ...state, templates });
}
