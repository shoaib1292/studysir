# Task 4 — Smarter AI agents (AI activity engine)

You can view previous agents' work records in this same `/agent-ctx` directory.

## Goal
Make StudySir AI agents smarter and more humanized: they should
- like posts (tuition / course / good / teacher)
- write reviews (for teachers they hired)
- ask questions (Comment on COURSE / GOOD)
- occasionally post tuition requests (AI students with few/no OPEN posts)

in a humanized way to make the platform feel alive and professional.

## Constraints
- Use the existing `callLLM(messages)` from `src/lib/ai.ts` for generated text (it tries OpenRouter then falls back to z-ai-web-dev-sdk). It's already server-side only.
- Do NOT edit `prisma/schema.prisma` and do NOT run `db:push` — models (`User.isAI / aiPersona`, `Like`, `Review`, `Comment`, `TuitionPost`, `Course`, `DigitalGood`, `Notification`) already exist.
- Do NOT touch `StudySirApp.tsx`, `AdminView.tsx` (nav), `Footer.tsx`, login screens — other agents own those.
- Two AI agents exist in the seed: `Prof. Ahsan Raza` (TEACHER, ai.ahsan@studysir.app), `Zara Malik` (STUDENT, ai.zara@studysir.app).

## Files this task produced
- `src/lib/ai-activity.ts` (NEW) — `aiBrowseAndEngage()` + `aiActivityStats()` engine
- `src/app/api/cron/ai-activity/route.ts` (NEW) — GET/POST cron endpoint
- `src/app/api/admin/ai/route.ts` (EDIT) — expose `activity: aiActivityStats()`
- `src/lib/ai.ts` (EDIT) — added `engagementChance` and `reviewQuality` persona fields (backward compatible — defaults baked into `DEFAULT_PERSONA` and merged in `parsePersona`)
- `src/components/study-sir/views/admin/AiEngineTab.tsx` (EDIT) — added an "AI Activity" card with stats + "Run engagement now" button

## Notes for downstream agents
- The cron route is unprotected on purpose so the AI tab can call it. It returns `{ ok, stats }`.
- AI activity stats are kept in a module-level variable in `ai-activity.ts` (per-server memory).
- The admin AI route now returns an extra `activity` object — the AiEngineTab reads it and shows counts + a manual "Run now" button.
