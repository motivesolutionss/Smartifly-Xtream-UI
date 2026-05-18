export const PROVIDER_HEALTH_SCHEMA_VERSION = 1;

export const PROVIDER_HEALTH_EVENT_TYPES = [
  'IMAGE_SUCCESS',
  'IMAGE_FAILURE',
  'URL_REJECTED',
  'URL_SUPPRESSED',
  'RAIL_EMPTY',
  'DUPLICATE_COLLISION',
] as const;

export const PROVIDER_HEALTH_CONTEXT_TYPES = [
  'HOME_HERO',
  'HOME_POSTER',
  'CONTINUE_WATCHING',
  'DETAILS',
  'LIVE_CARD',
  'SEARCH',
] as const;

export type ProviderHealthEventType = (typeof PROVIDER_HEALTH_EVENT_TYPES)[number];
export type ProviderHealthContextType = (typeof PROVIDER_HEALTH_CONTEXT_TYPES)[number];
