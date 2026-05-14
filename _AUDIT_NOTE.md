# Audit Apply Notes — AIHardwareIoT

## Source
`/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 16.

Note: audit reported "0 routes / 0 AI endpoints" but a substantial Express server already exists with auth, devices, telemetry, alerts, alert-rules, ai-analyses, firmware, firmware-updates, edge-inferences, smart-agents, device shadow, fleet shadow summary, and a dispatched ai-analyses endpoint covering predictive_maintenance / anomaly_detection / fleet_analysis / energy_optimization. Audit appears stale.

## Original Recommendations (AI Counterparts)
- `/anomaly-detection` — already covered via `POST /api/ai-analyses` with `analysis_type=anomaly_detection`
- `/predictive-maintenance` — already covered via `POST /api/ai-analyses` with `analysis_type=predictive_maintenance`
- `/device-cluster-analysis` — MISSING (added)
- `/firmware-recommendation` — MISSING (added)
- `/edge-inference-deployment` — MISSING (added)

## Implemented (this pass)
- `POST /api/ai/device-cluster-analysis` — clusters fleet devices by behavior; uses recent telemetry; persists to `ai_analyses`.
- `POST /api/ai/firmware-recommendation` — recommends update/defer/skip per device using telemetry and latest firmware (auto-pulled from `firmware` table by device type when not provided).
- `POST /api/ai/edge-inference-deployment` — produces deployment plan (feasibility, optimizations, quantization, fallback) for a model on a target device.
- Added matching service methods on `OpenRouterService`: `deviceClusterAnalysisWithTokens`, `firmwareRecommendationWithTokens`, `edgeInferenceDeploymentWithTokens`, with safe fallbacks when the API is unavailable.

Syntax: `node --check` passes for both modified files.

## Backlog
- Agentic device health monitor (continuous prediction + auto-ticket).
- Federated learning for edge devices (privacy-preserving aggregation).
- Smart agent orchestration across devices.
- Device marketplace integration.
- Energy efficiency optimizer (already covered by analysis_type=energy_optimization; could be extended).
- Video/audio anomaly detection (requires media ingestion stack).

## Categorization
- MECHANICAL: 3 endpoints (done).
- NEEDS-PRODUCT-DECISION: federated learning, marketplace integration.
- TOO-RISKY for mechanical pass: real-time multi-agent orchestration, video/audio pipelines.

## Apply pass 3 (frontend)

Verified existing FE wiring; **LEFT-AS-IS**.

- `frontend/src/pages/AdvancedAITools.jsx` already calls all three pass-2 endpoints (`/ai/device-cluster-analysis`, `/ai/firmware-recommendation`, `/ai/edge-inference-deployment`) via the shared `submit` helper.
- Route registered in `App.jsx` at `/advanced-ai`; sidebar entry present in `components/Sidebar.jsx` (Brain icon, "Advanced AI").
- Auth (Bearer token from localStorage) handled by shared axios instance in `services/api.js`.
- No code changes; idempotence rule applied. Log: `_AUDIT/apply3_logs/ab3_59.md`.

## Apply pass 4 (mechanical backlog)

SKIPPED — no MECHANICAL items remain in backlog.

Backlog categorisation (from prior section):
- NEEDS-PRODUCT-DECISION: federated learning, smart agent orchestration, marketplace integration.
- TOO-RISKY: real-time multi-agent orchestration, video/audio anomaly detection (media ingestion stack).
- Already covered: energy efficiency optimizer (existing `analysis_type=energy_optimization`).

No code changes. Log: `_AUDIT/apply4_logs/ab3_59.md`.
