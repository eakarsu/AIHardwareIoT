# Apply Pass 5 — AIHardwareIoT

**Date:** 2026-05-08
**Stack:** Node-Express + React (Vite). Postgres. JWT bearer auth. `aiRateLimiter` middleware. `OpenRouterService` singleton with fallbacks.
**Source audit:** `/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 16.

## Verified present
- 5 audit-recommended AI counterparts implemented across passes 2-4: `anomaly-detection` (via dispatched `/api/ai-analyses`), `predictive-maintenance` (same), `device-cluster-analysis`, `firmware-recommendation`, `edge-inference-deployment`.
- FE wiring: `frontend/src/pages/AdvancedAITools.jsx` calls all three pass-2 endpoints.
- Service-level fallbacks for every method (no hard 503; service falls back if OpenRouter fails).

## Implemented this pass (3 advisory mechanical AI endpoints)
1. `POST /api/ai/smart-agent-orchestration` — generates a multi-agent ORCHESTRATION PLAN (advisory only). Includes explicit human-oversight guardrails. Pulls automations table when present.
2. `POST /api/ai/health-monitor-summary` — synthesizes devices + alerts + recent telemetry into prioritized action list.
3. `POST /api/ai/energy-efficiency-advisor` — tailored energy recommendations with savings projection; accepts optional tariff context.

All three:
- `auth` + `aiRateLimiter` (existing middleware).
- 503 explicit guard at endpoint level (`if (!process.env.OPENROUTER_API_KEY) return 503`) — distinct from the service-layer silent fallback used by older endpoints.
- Persist to `ai_analyses`.

### Service additions
`backend/src/services/openRouterService.js` got 3 new methods:
- `smartAgentOrchestrationWithTokens(devices, automations, goal)`
- `healthMonitorSummaryWithTokens(devices, alerts, telemetrySamples)`
- `energyEfficiencyAdvisorWithTokens(devices, telemetrySamples, tariffContext)`

Each has a deterministic fallback returning a JSON object so failures degrade gracefully (matches existing class style).

### FE
- New page `frontend/src/pages/FleetOpsAITools.jsx`.
- Routed at `/fleet-ops-ai` in `App.jsx`.
- Uses existing `services/api` axios instance (Bearer JWT in interceptor).

## Deferred / categorization
- TOO-RISKY mechanically: real autonomous device control loop, automatic ticket creation against external ITSM systems.
- NEEDS-PRODUCT-DECISION: federated learning architecture, multi-home arbitrage, video/audio anomaly pipelines.
- NEEDS-CREDS: utility tariff API for live demand-shifting.

## Smoke test
- `node --check backend/src/index.js` PASS.
- `node --check backend/src/services/openRouterService.js` PASS.
- Endpoints registered in same flat-app pattern as existing ones; no schema changes.

## Cap respected
3 of 5 allowed. Remaining backlog items are PRODUCT-DECISION or RISKY.
