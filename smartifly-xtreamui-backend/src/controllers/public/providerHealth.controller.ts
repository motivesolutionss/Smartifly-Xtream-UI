import type { Request, Response } from 'express';

import {
  type ProviderHealthContextType,
  type ProviderHealthEventType,
  PROVIDER_HEALTH_CONTEXT_TYPES,
  PROVIDER_HEALTH_EVENT_TYPES,
  PROVIDER_HEALTH_SCHEMA_VERSION,
} from '../../constants/providerHealthTelemetry';
import { ingestProviderHealthEvents, type ProviderHealthEventInput } from '../../services/providerHealth.service';

const EVENT_TYPES = new Set(PROVIDER_HEALTH_EVENT_TYPES);
const CONTEXT_TYPES = new Set(PROVIDER_HEALTH_CONTEXT_TYPES);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseEvent(raw: unknown): ProviderHealthEventInput | null {
  if (!isObject(raw)) return null;

  const eventId = typeof raw.eventId === 'string' ? raw.eventId.trim() : '';
  const deviceId = typeof raw.deviceId === 'string' ? raw.deviceId.trim() : '';
  const portalIdentity = typeof raw.portalIdentity === 'string' ? raw.portalIdentity.trim() : '';
  const portalBaseUrl = typeof raw.portalBaseUrl === 'string' ? raw.portalBaseUrl.trim() : '';
  const host = typeof raw.host === 'string' ? raw.host.trim() : '';
  const eventType = typeof raw.eventType === 'string' ? raw.eventType.trim() : '';
  const context = typeof raw.context === 'string' ? raw.context.trim() : '';
  const occurredAt = typeof raw.occurredAt === 'string' ? raw.occurredAt.trim() : '';
  const appVersion = typeof raw.appVersion === 'string' ? raw.appVersion.trim() : '';
  const platform = typeof raw.platform === 'string' ? raw.platform.trim() : '';

  if (!eventId || !deviceId || !portalIdentity || !portalBaseUrl || !host || !occurredAt || !appVersion || !platform) {
    return null;
  }
  if (!EVENT_TYPES.has(eventType as ProviderHealthEventType) || !CONTEXT_TYPES.has(context as ProviderHealthContextType)) {
    return null;
  }

  const metadata = isObject(raw.metadata) ? raw.metadata : null;
  const profileId = typeof raw.profileId === 'string' ? raw.profileId.trim() : null;
  const contentType = typeof raw.contentType === 'string' ? raw.contentType.trim() : null;
  const contentId = typeof raw.contentId === 'string' ? raw.contentId.trim() : null;

  return {
    eventId,
    deviceId,
    profileId,
    portalIdentity,
    portalBaseUrl,
    host,
    eventType: eventType as ProviderHealthEventInput['eventType'],
    context: context as ProviderHealthEventInput['context'],
    contentType,
    contentId,
    metadata,
    occurredAt,
    appVersion,
    platform,
  };
}

export const ProviderHealthPublicController = {
  async ingest(req: Request, res: Response) {
    try {
      const schemaVersion = req.body?.schemaVersion;
      if (schemaVersion !== PROVIDER_HEALTH_SCHEMA_VERSION) {
        return res.status(400).json({
          success: false,
          message: `Unsupported schemaVersion. Expected ${PROVIDER_HEALTH_SCHEMA_VERSION}.`,
        });
      }

      const eventsRaw = req.body?.events;
      if (!Array.isArray(eventsRaw)) {
        return res.status(400).json({ success: false, message: 'events array is required' });
      }
      if (eventsRaw.length > 100) {
        return res.status(400).json({ success: false, message: 'max 100 events per request' });
      }

      const parsed: ProviderHealthEventInput[] = [];
      let rejected = 0;
      for (const raw of eventsRaw) {
        const event = parseEvent(raw);
        if (!event) {
          rejected += 1;
          continue;
        }
        parsed.push(event);
      }

      const result = await ingestProviderHealthEvents(parsed);
      return res.json({
        success: true,
        accepted: result.accepted,
        rejected: result.rejected + rejected,
      });
    } catch (err) {
      console.error('[ProviderHealthPublicController.ingest] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to ingest provider health telemetry' });
    }
  },
};
