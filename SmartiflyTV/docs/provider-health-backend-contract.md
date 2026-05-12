# Provider Health Backend Contract (Stage 2)

## Objective
Aggregate runtime image/provider quality telemetry from TV clients into backend so Admin can monitor operator/server health centrally.

This extends Stage 1 local diagnostics into enterprise observability.

## 1) Data Model

### 1.1 Ingestion Event (`provider_health_event`)
Fields:
- `eventId`: string (UUID from client)
- `deviceId`: string
- `profileId`: string? (optional for anonymous/early session)
- `portalIdentity`: string (e.g. `STAR-001`)
- `portalBaseUrl`: string
- `host`: string (image host extracted from URL)
- `eventType`: enum
  - `IMAGE_SUCCESS`
  - `IMAGE_FAILURE`
  - `URL_REJECTED`
  - `RAIL_EMPTY`
  - `DUPLICATE_COLLISION`
- `context`: enum
  - `HOME_HERO`
  - `HOME_POSTER`
  - `CONTINUE_WATCHING`
  - `DETAILS`
  - `LIVE_CARD`
  - `SEARCH`
- `contentType`: enum? (`movie`, `series`, `live`) optional
- `contentId`: string? optional
- `metadata`: json (small map for reason codes)
- `occurredAt`: ISO timestamp
- `appVersion`: string
- `platform`: string (`ANDROID_TV`)

### 1.2 Aggregated Daily Table (`provider_health_daily`)
Dimensions:
- `date`
- `portalIdentity`
- `portalBaseUrl`
- `host`
- `context`

Metrics:
- `imageSuccessCount`
- `imageFailureCount`
- `urlRejectedCount`
- `railEmptyCount`
- `duplicateCollisionCount`
- `uniqueDevices`
- `updatedAt`

Derived (query-time):
- `failureRate = imageFailureCount / (imageSuccessCount + imageFailureCount)`
- `urlRejectRate`

## 2) API Endpoints

### 2.1 TV -> Backend ingestion
`POST /v1/public/telemetry/provider-health`

Request:
```json
{
  "events": [
    {
      "eventId": "uuid",
      "deviceId": "tv-device-id",
      "profileId": "optional-profile-id",
      "portalIdentity": "STAR-001",
      "portalBaseUrl": "http://premiumtvs.space:8080",
      "host": "cdn.example.com",
      "eventType": "IMAGE_FAILURE",
      "context": "HOME_HERO",
      "contentType": "movie",
      "contentId": "12345",
      "metadata": { "reason": "decode_error" },
      "occurredAt": "2026-05-12T10:15:30Z",
      "appVersion": "1.0.2",
      "platform": "ANDROID_TV"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "accepted": 25,
  "rejected": 0
}
```

Validation rules:
- Max 100 events per request.
- Reject events older than 7 days.
- Deduplicate by `eventId` (idempotent ingestion).

### 2.2 Admin summary endpoint
`GET /v1/admin/provider-health/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`

Response:
```json
{
  "items": [
    {
      "portalIdentity": "STAR-001",
      "portalBaseUrl": "http://premiumtvs.space:8080",
      "totalImages": 18234,
      "imageFailures": 2489,
      "failureRate": 0.1365,
      "urlRejected": 312,
      "railEmpty": 4,
      "uniqueDevices": 124,
      "status": "DEGRADED"
    }
  ]
}
```

### 2.3 Admin host drilldown endpoint
`GET /v1/admin/provider-health/hosts?portalIdentity=STAR-001&from=YYYY-MM-DD&to=YYYY-MM-DD`

Response:
```json
{
  "items": [
    {
      "host": "img1.example.net",
      "context": "HOME_POSTER",
      "total": 9032,
      "failures": 3044,
      "failureRate": 0.337,
      "status": "CRITICAL"
    }
  ]
}
```

### 2.4 Admin timeline endpoint
`GET /v1/admin/provider-health/timeline?portalIdentity=STAR-001&days=30`

Response:
- daily series for failure rate, URL reject rate, and empty-rail incidents.

## 3) Severity Policy

Per portal:
- `HEALTHY`: failureRate < 10%
- `DEGRADED`: 10% to < 25%
- `CRITICAL`: >= 25%

Per host override:
- Host with `total >= 100` and `failureRate >= 35%` flagged `CRITICAL_HOST`.

## 4) TV Client Behavior (for Stage 2)

Batching:
- Keep local ring buffer in memory (optional persisted queue for offline).
- Flush every 60 seconds or when 30 events queued.
- Backoff on failure (30s -> 60s -> 120s max).

Safety:
- Never block UI on telemetry send.
- Drop oldest events if queue exceeds cap (e.g. 1000).

Privacy:
- No credentials, no raw URLs with query secrets.
- Host extraction should strip query string before sending.

## 5) Backend Implementation Notes

In `smartifly-xtreamui-backend`:
1. Add migration for:
   - `provider_health_event` (raw)
   - `provider_health_daily` (aggregated)
2. Add public telemetry controller:
   - auth by device token or signed app key.
3. Add aggregation job (hourly):
   - raw -> daily rollups.
4. Add admin controller + RBAC guards.

## 6) Admin Panel Integration

New Admin pages:
- `Provider Health Overview`
- `Portal Health Detail`
- `Host Drilldown`

Widgets:
- Failure-rate leaderboard (worst portals)
- Critical host table
- Empty-rail incidents trend
- URL reject trend

## 7) Rollout Plan

Phase 2A:
- Backend ingestion endpoint + storage + summary endpoint.

Phase 2B:
- TV client flush integration (from existing runtime monitor).

Phase 2C:
- Admin dashboard pages.

Phase 2D:
- Alerting hooks (Slack/email) for critical thresholds.

## 8) Acceptance Criteria
- Backend accepts batched telemetry with idempotency.
- Admin can identify worst portal and worst host in < 2 clicks.
- No user-visible performance impact on TV during telemetry operations.
- Missing/bad provider assets become measurable by portal and context.

