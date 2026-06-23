# SmartiflyTV Enterprise Showcase Guardrails

## Purpose
This checklist is the mandatory quality gate for all feature/bugfix changes before showcase or release.
It protects TV performance, reliability, and cross-module stability for mixed-quality operator servers.

## 1) Change Scope Discipline
For every change, review all related layers before merging:
- Data contract/model layer (`data/remote/models`, DTOs)
- Mapping/normalization layer (`data/mapper`, resolver utilities)
- Repository/service logic (`data/repository`, orchestration)
- ViewModel state logic (`features/*ViewModel`)
- UI consumer layer (`features/*Screen`, UI components)
- Performance impact layer (`performance/*`, prefetch behavior)

Rule:
- Do not patch one file in isolation if dependent layers can be affected.

## 2) TV Performance Budget (Hard Limits)
- Home rails: capped by policy (never unbounded).
- Items per rail: capped by tier.
- Background enrichment: capped and timeout-bounded.
- Network calls on Home startup: bounded by policy scans.
- No full-catalog warmups on app start.

Red flags (must block release):
- Any loop that fetches all categories without cap.
- Any image retry loop without limit.
- Any UI path depending on long synchronous work.

## 3) Image Resilience Rules
- Always use centralized resolver logic for image URL selection.
- Validate URL format before load (`http/https`, parseable host).
- Use deterministic fallback order by content type.
- If all URLs fail, show static placeholder (never empty card/hero).
- Avoid repeated attempts for known-bad URLs during same session.

## 4) Rail Reliability Rules
Mandatory rails on Home (attempted first):
- `Live Channels`
- `Movies`
- `Series`

Additional rules:
- Supplemental rails must remain visible when data exists.
- Dedup strategy must not collapse Home to only mandatory rails.
- Final rail count capped by adaptive policy.

## 5) Cross-Provider Robustness
Assume provider data can be malformed:
- Missing IDs
- Duplicate IDs
- Broken/mixed image URLs
- Empty first category with populated later categories

Required behavior:
- Degrade gracefully per provider.
- Never freeze or stall Home rendering.
- Prefer partial content over blank screen.

## 6) Logging and Diagnostics
Use structured logs for critical decisions:
- Hero selection source and candidate count
- Enrichment status
- URL reject reason
- Rail policy chosen (tier + estimated catalog + cap)

Rule:
- Log enough for diagnosis, avoid noisy per-item spam.

## 7) Regression Checklist (Must Pass)
For each PR/change:
1. Build:
- `:app:compileDebugKotlin` passes.

2. Functional smoke:
- Login with at least one high-quality provider.
- Login with at least one messy provider.
- Home shows hero + mandatory 3 rails when data exists.

3. Performance smoke:
- Focus navigation remains responsive.
- No repeated network-error flood in logs.
- No obvious UI stalls during Home load.

4. Resilience smoke:
- Bad image URLs do not blank entire rail/hero.
- Fallbacks are visible.

## 8) Deployment Mode for Showcase
Default showcase mode:
- Conservative caps.
- Minimal enrichment concurrency.
- Stable deterministic hero/rails.
- No experimental background jobs.

Do not enable aggressive or unbounded data features in showcase builds.

## 9) Decision Protocol for Future Changes
Before implementation:
1. Define impacted modules.
2. Define failure modes.
3. Define fallback behavior.
4. Define performance budget impact.
5. Define rollback plan.

After implementation:
1. Validate checklist sections 2, 7.
2. Record any changed caps/policies in docs.

