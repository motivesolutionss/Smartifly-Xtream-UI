import { promises as fs } from 'fs';
import path from 'path';

type JsonObject = Record<string, unknown>;

export interface AppSettingsRecord extends JsonObject {
  id: string;
  updatedAt: string;
}

export interface FeatureFlagRecord extends JsonObject {
  id: string;
  updatedAt?: string;
}

export interface MaintenanceWindowRecord extends JsonObject {
  id: string;
  updatedAt?: string;
}

export interface BackupRecord extends JsonObject {
  id: string;
}

export interface NotificationRecord extends JsonObject {
  id: string;
}

interface OpsStoreState {
  settings: AppSettingsRecord;
  featureFlags: FeatureFlagRecord[];
  maintenanceWindows: MaintenanceWindowRecord[];
  backups: BackupRecord[];
  notificationHistory: NotificationRecord[];
  notificationTemplates: NotificationRecord[];
  notificationSegments: NotificationRecord[];
  notificationABTests: NotificationRecord[];
}

const STORE_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'admin-ops.json');

const nowIso = () => new Date().toISOString();

const defaultState = (): OpsStoreState => ({
  settings: {
    id: 'default',
    maintenanceMode: false,
    maintenanceMsg: null,
    latestVersion: '1.0.0',
    minVersion: '1.0.0',
    updateUrl: null,
    forceUpdate: false,
    contactEmail: null,
    contactPhone: null,
    aboutText: null,
    termsUrl: null,
    privacyUrl: null,
    bankName: null,
    accountTitle: null,
    accountNumber: null,
    iban: null,
    paymentInstructions: null,
    updatedAt: nowIso(),
  },
  featureFlags: [],
  maintenanceWindows: [],
  backups: [],
  notificationHistory: [],
  notificationTemplates: [],
  notificationSegments: [],
  notificationABTests: [],
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

async function readState(): Promise<OpsStoreState> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as Partial<OpsStoreState>;
    return {
      settings: (parsed.settings as AppSettingsRecord) ?? defaultState().settings,
      featureFlags: Array.isArray(parsed.featureFlags) ? (parsed.featureFlags as FeatureFlagRecord[]) : [],
      maintenanceWindows: Array.isArray(parsed.maintenanceWindows) ? (parsed.maintenanceWindows as MaintenanceWindowRecord[]) : [],
      backups: Array.isArray(parsed.backups) ? (parsed.backups as BackupRecord[]) : [],
      notificationHistory: Array.isArray(parsed.notificationHistory) ? (parsed.notificationHistory as NotificationRecord[]) : [],
      notificationTemplates: Array.isArray(parsed.notificationTemplates) ? (parsed.notificationTemplates as NotificationRecord[]) : [],
      notificationSegments: Array.isArray(parsed.notificationSegments) ? (parsed.notificationSegments as NotificationRecord[]) : [],
      notificationABTests: Array.isArray(parsed.notificationABTests) ? (parsed.notificationABTests as NotificationRecord[]) : [],
    };
  } catch {
    return defaultState();
  }
}

function queueWrite(nextState: OpsStoreState): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureStoreFile();
    await fs.writeFile(STORE_FILE, JSON.stringify(nextState, null, 2), 'utf8');
  });
  return writeQueue;
}

async function updateState(updater: (state: OpsStoreState) => OpsStoreState): Promise<OpsStoreState> {
  const state = await readState();
  const next = updater(state);
  await queueWrite(next);
  return next;
}

export async function getOpsState(): Promise<OpsStoreState> {
  return readState();
}

export async function patchSettings(data: Partial<AppSettingsRecord>): Promise<AppSettingsRecord> {
  const next = await updateState((state) => ({
    ...state,
    settings: { ...state.settings, ...data, updatedAt: nowIso() },
  }));
  return next.settings;
}

export async function replaceFeatureFlags(items: FeatureFlagRecord[]): Promise<void> {
  await updateState((state) => ({ ...state, featureFlags: items }));
}

export async function replaceMaintenanceWindows(items: MaintenanceWindowRecord[]): Promise<void> {
  await updateState((state) => ({ ...state, maintenanceWindows: items }));
}

export async function replaceBackups(items: BackupRecord[]): Promise<void> {
  await updateState((state) => ({ ...state, backups: items }));
}

export async function replaceNotificationHistory(items: NotificationRecord[]): Promise<void> {
  await updateState((state) => ({ ...state, notificationHistory: items }));
}

export async function replaceNotificationTemplates(items: NotificationRecord[]): Promise<void> {
  await updateState((state) => ({ ...state, notificationTemplates: items }));
}

export async function replaceNotificationSegments(items: NotificationRecord[]): Promise<void> {
  await updateState((state) => ({ ...state, notificationSegments: items }));
}

export async function replaceNotificationABTests(items: NotificationRecord[]): Promise<void> {
  await updateState((state) => ({ ...state, notificationABTests: items }));
}
