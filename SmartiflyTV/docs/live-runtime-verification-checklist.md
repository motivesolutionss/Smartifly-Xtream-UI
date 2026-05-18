# Live Runtime Verification Checklist

Purpose: verify Live screen behavior under real operator conditions with deterministic pass/fail criteria.

## Preconditions

- Build type: `debug`
- Device: Android TV target (same class used by operators)
- Logged-in portal: at least one unstable/high-volume provider
- Network: normal + one constrained test (packet loss / slow link)

## Scenario 1: Rapid Category Switching

Steps:
1. Open Live screen.
2. Move focus across categories quickly for 20-30 seconds.
3. Revisit 3-5 previously visited categories.

Expected:
- No crash.
- No frozen loading indicator.
- Channel list always matches selected category.
- No old category data flashes after new selection.

Pass/Fail:
- `PASS` if all expected conditions hold.
- `FAIL` if stale list flash, stuck loading, or crash appears.

## Scenario 2: Revisit Live After Navigation Away

Steps:
1. Open Live and load channels.
2. Navigate to Movies, then Series, then back to Live.
3. Repeat sequence 3 times.

Expected:
- Live re-enters with valid state (not `All: 0 loaded (Loading...)` forever).
- Category sidebar remains responsive.
- EPG belongs to currently focused channel only.

Pass/Fail:
- `PASS` if all 3 loops are stable.
- `FAIL` if any loop gets stuck or shows stale EPG/channel state.

## Scenario 3: All Category + Load More on Unstable Provider

Steps:
1. Select `All`.
2. Scroll until load-more is triggered multiple times.
3. Continue until end-of-list condition.

Expected:
- Progressive loading works without duplicate flood.
- Snapshot providers do not loop endless load-more.
- Total list remains navigable and responsive.

Pass/Fail:
- `PASS` if load-more behavior converges correctly.
- `FAIL` if endless spinner, duplicate storm, or severe UI hitching occurs.

## Scenario 4: EPG Freshness Guard

Steps:
1. Focus channel A and wait for EPG.
2. Immediately switch to category B and focus channel C.
3. Repeat with fast focus changes.

Expected:
- EPG updates only for currently focused channel/category.
- No stale EPG from previous channel/category appears.

Pass/Fail:
- `PASS` if EPG never cross-contaminates.
- `FAIL` if stale EPG appears.

## Scenario 5: Telemetry Contract Health

Steps:
1. Trigger normal image/loading paths and one suppressed URL case.
2. Verify backend ingest endpoint metrics/logs.

Expected:
- Events accepted with correct `schemaVersion`.
- `URL_SUPPRESSED` accepted by backend contract.
- No silent drops due to enum mismatch.

Pass/Fail:
- `PASS` if all expected events are ingested.
- `FAIL` if schema mismatch or event rejection appears.

## Execution Matrix

| Date | Build SHA | Portal | Scenario 1 | Scenario 2 | Scenario 3 | Scenario 4 | Scenario 5 | Notes |
|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | `<commit>` | `<identity>` | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | `<notes>` |

## Release Gate Rule

- Live is release-ready only if all scenarios are `PASS` on:
  - at least one stable provider
  - at least one unstable/high-volume provider
