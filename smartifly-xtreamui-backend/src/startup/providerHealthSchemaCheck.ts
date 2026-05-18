import { prisma } from '../config/prisma';

type ColumnNameRow = { Field: string };
type IndexNameRow = { Key_name: string };

const REQUIRED_COLUMNS = [
  'id',
  'event_id',
  'device_id',
  'profile_id',
  'portal_identity',
  'portal_base_url',
  'host',
  'event_type',
  'context',
  'content_type',
  'content_id',
  'metadata_json',
  'occurred_at',
  'app_version',
  'platform',
  'created_at',
] as const;

const REQUIRED_INDEXES = [
  'PRIMARY',
  'uq_provider_health_event_id',
  'idx_provider_health_event_occurred',
  'idx_provider_health_event_portal',
  'idx_provider_health_event_host',
] as const;

export async function assertProviderHealthSchemaReady(): Promise<void> {
  const tableRows = await prisma.$queryRawUnsafe<Array<{ TABLE_NAME: string }>>(
    `
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'provider_health_event'
      LIMIT 1
    `,
  );

  if (tableRows.length === 0) {
    throw new Error(
      '[Startup] Missing table provider_health_event. Run Prisma migrations before starting backend.',
    );
  }

  const columns = await prisma.$queryRawUnsafe<ColumnNameRow[]>('SHOW COLUMNS FROM provider_health_event');
  const indexes = await prisma.$queryRawUnsafe<IndexNameRow[]>('SHOW INDEX FROM provider_health_event');

  const columnSet = new Set(columns.map((row) => row.Field));
  const indexSet = new Set(indexes.map((row) => row.Key_name));

  const missingColumns = REQUIRED_COLUMNS.filter((name) => !columnSet.has(name));
  if (missingColumns.length > 0) {
    throw new Error(
      `[Startup] provider_health_event missing columns: ${missingColumns.join(', ')}. Run latest Prisma migrations.`,
    );
  }

  const missingIndexes = REQUIRED_INDEXES.filter((name) => !indexSet.has(name));
  if (missingIndexes.length > 0) {
    throw new Error(
      `[Startup] provider_health_event missing indexes: ${missingIndexes.join(', ')}. Run latest Prisma migrations.`,
    );
  }
}
