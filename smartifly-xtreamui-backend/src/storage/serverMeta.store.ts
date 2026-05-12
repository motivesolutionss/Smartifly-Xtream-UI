import { promises as fs } from 'fs';
import path from 'path';

interface ServerMetaState {
  orders: Record<string, number>;
}

const STORE_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'server-meta.json');

const defaultState = (): ServerMetaState => ({ orders: {} });

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(defaultState(), null, 2), 'utf8');
  }
}

async function readState(): Promise<ServerMetaState> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as Partial<ServerMetaState>;
    return { orders: parsed.orders ?? {} };
  } catch {
    return defaultState();
  }
}

function queueWrite(nextState: ServerMetaState): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureStoreFile();
    await fs.writeFile(STORE_FILE, JSON.stringify(nextState, null, 2), 'utf8');
  });
  return writeQueue;
}

export async function getServerOrders(): Promise<Record<string, number>> {
  const state = await readState();
  return state.orders;
}

export async function setServerOrder(id: number, order: number): Promise<void> {
  const state = await readState();
  state.orders[String(id)] = order;
  await queueWrite(state);
}

export async function setServerOrders(orders: Array<{ id: number; order: number }>): Promise<void> {
  const state = await readState();
  orders.forEach((item) => {
    state.orders[String(item.id)] = item.order;
  });
  await queueWrite(state);
}

export async function removeServerOrder(id: number): Promise<void> {
  const state = await readState();
  delete state.orders[String(id)];
  await queueWrite(state);
}
