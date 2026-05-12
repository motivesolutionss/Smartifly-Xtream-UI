import { promises as fs } from 'fs';
import path from 'path';

type JsonObject = Record<string, unknown>;

export interface PackageRecord extends JsonObject {
  id: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureTemplateRecord extends JsonObject {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnouncementRecord extends JsonObject {
  id: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ContentStoreState {
  packages: PackageRecord[];
  featureTemplates: FeatureTemplateRecord[];
  announcements: AnnouncementRecord[];
}

const STORE_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'admin-content.json');

const defaultState = (): ContentStoreState => ({
  packages: [],
  featureTemplates: [],
  announcements: [],
});

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(defaultState(), null, 2), 'utf8');
  }
}

async function readState(): Promise<ContentStoreState> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as Partial<ContentStoreState>;
    return {
      packages: Array.isArray(parsed.packages) ? (parsed.packages as PackageRecord[]) : [],
      featureTemplates: Array.isArray(parsed.featureTemplates)
        ? (parsed.featureTemplates as FeatureTemplateRecord[])
        : [],
      announcements: Array.isArray(parsed.announcements)
        ? (parsed.announcements as AnnouncementRecord[])
        : [],
    };
  } catch {
    return defaultState();
  }
}

function queueWrite(nextState: ContentStoreState): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureStoreFile();
    await fs.writeFile(STORE_FILE, JSON.stringify(nextState, null, 2), 'utf8');
  });
  return writeQueue;
}

export async function listPackages(): Promise<PackageRecord[]> {
  const state = await readState();
  return state.packages;
}

export async function savePackages(packages: PackageRecord[]): Promise<void> {
  const state = await readState();
  await queueWrite({ ...state, packages });
}

export async function listFeatureTemplates(): Promise<FeatureTemplateRecord[]> {
  const state = await readState();
  return state.featureTemplates;
}

export async function saveFeatureTemplates(templates: FeatureTemplateRecord[]): Promise<void> {
  const state = await readState();
  await queueWrite({ ...state, featureTemplates: templates });
}

export async function listAnnouncements(): Promise<AnnouncementRecord[]> {
  const state = await readState();
  return state.announcements;
}

export async function saveAnnouncements(announcements: AnnouncementRecord[]): Promise<void> {
  const state = await readState();
  await queueWrite({ ...state, announcements });
}
