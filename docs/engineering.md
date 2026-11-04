# Engineering notes

The [README](../README.md) covers the claim checker. This file covers the rest: how the job
description maps to the code, the architecture, credit protection, the other evals, spend and the
development commands.

## How the job description maps to the code

| JD point | Where it is proven |
|---|---|
| TypeScript | Strict mode with `noUncheckedIndexedAccess`; `pnpm typecheck` is clean. Discriminated unions for claim segments (`src/lib/claims/verify-answer.ts`), results (`src/lib/schemas/view-types.ts`) and errors (`src/lib/mcp/mcp-errors.ts`). |
| React | Function components with no UI library. `ClaimChip` (`src/components/claim-chip.tsx`) is a focusable button with an `aria-describedby` tooltip that opens on hover or focus and closes on Escape. Accessible table (`aria-sort`, row headers), meters, live regions. |
| Next.js | App Router 16. Static home page; route handlers in `src/app/api/*` (plan, tool, answer, balance, telemetry); security headers in `next.config.ts`. |
| Tailwind | Tailwind 4 with CSS-variable design tokens for light and dark (`src/app/globals.css`). One typeface, Figtree, self-hosted at build time through `next/font`. |
| Zustand | `src/store/copilot-store.ts` (conversation, settings persisted to localStorage) and `src/store/key-store.ts` (vidIQ key in sessionStorage). Orchestration is outside React in `src/lib/copilot/turn-runner.ts`. |
| LLM features, streaming | OpenRouter SSE parsed by `src/lib/stream/read-lines.ts`, re-streamed as NDJSON by `src/app/api/answer/route.ts`. The answer is verified while it streams: a half-written citation is hidden until it closes. |
| Unpredictable model output | The claim checker (`src/lib/claims/`): provenance binding, unit-aware value match, unbacked-figure and label detection, markdown sanitizer. Also `parseStructured()` (ok → local repair → one model repair → typed fallback) and the argument grounding check in `src/lib/llm/grounding.ts`. |
| MCP | Hand-written Streamable HTTP client, protocol 2025-06-18: initialize → `Mcp-Session-Id` → `notifications/initialized` → `tools/call`, JSON or SSE responses, timeouts, error mapping. `src/lib/mcp/mcp-client.ts`. |
| Performance | Budget in `perf/budget.json`, enforced by `pnpm perf`. The checker runs in the browser; initial JS is 155.9 KB of a 170 KB budget. |
| Tests | 152 unit tests (Vitest), written red first at the seams: provenance binding, verifier, label thresholds, markdown sanitizer, access gate. Playwright tests cover citation hover, keyboard focus and Escape, a no-raw-markdown check, the check toggle, the chat shell on desktop and mobile, and the Replay-only build. |
| Monitoring | `track()` beacons to `/api/telemetry` (tool calls, plan, answer TTFT, schema fallback, web vitals, client errors). No prompts or keys are logged. |

## Architecture

```
browser (Zustand)                         Next.js route handlers                 external
─────────────────                         ──────────────────────                 ────────
prompt ──► /api/plan ───────────────────► planner (OpenRouter, tool calling) ──► OpenRouter
for each call: cost card or cache
Run ─────► /api/tool ───────────────────► allowlist → MCP client ──────────────► mcp.vidiq.com
           ◄─ { result, view }             vidIQ text/JSON → zod → typed view
answer ──► /api/answer (NDJSON stream) ─► evidence numbered c1, c2 … ─────────► OpenRouter
           ◄─ text with [[c1.score=99]]
verifyAnswer(text, sources c1, c2 …) → chips: verified · ≠ source · unverified
```

The browser builds sources from the same steps, in the same order, with the same skip rule as the
server (`src/lib/copilot/answer-sources.ts`, `src/lib/llm/answer.ts`). Replay mode swaps only the
external boxes for recordings in `src/fixtures/replay/`.

## Credit protection (secondary)

The copilot still guards credits, but AI Coach already shows a per-message price, so this part is
not new. A compact cost card shows the tool, the credits and the balance after, then waits for
*Run* or *Skip* (auto-run under a session cap is optional). Identical calls come from cache
("0 credits, cached"). Paid calls are never retried on their own. A server-side read-only allowlist
refuses generation, upload, media, bookmark and competitor tools. Quoted titles in the planner's
arguments must be copied verbatim, so a paraphrased title is not scored for 5 credits.

## Other evals and performance

`pnpm eval` runs the planner eval offline; `pnpm eval --live` uses the real planner. Latest live run,
made before the citation prompt (`eval/results/latest-live.json`, model `google/gemini-3.1-flash-lite`): tool choice 14 / 14, schema-valid
arguments 100%, answer TTFT median 793 ms, malformed-output suite 3 ok, 4 repaired, 3 typed fallback,
0 crashes.

`pnpm perf` (production build, median of 3 runs, `perf/latest.json`):

| Profile | LCP | CLS | Initial JS (compressed) | Budget |
|---|---|---|---|---|
| Desktop | 120 ms | 0 | 155.9 KB | LCP ≤ 1000 ms, JS ≤ 170 KB |
| Mobile, 375 px, 4× CPU, Slow-4G-like network | 652 ms | 0 | 155.9 KB | LCP ≤ 2500 ms |

## Credits and spend

Recording the vidIQ fixtures cost 40 credits (170 → 130). The claim checker work spent 0 vidIQ
credits: the eval is offline, and the Replay answers were re-recorded from the stored tool results
through OpenRouter for $0.0040 in total.

## Full list of limits

- No real users. The flows are tested, but nobody has used them to grow a channel.
- The claim eval has 9 cases and 38 claims, written by the same person who wrote the checker. 0% is
  "handles these cases", not a production rate.
- The naive checker is a reconstruction from three AI Coach answers, not vidIQ's code.
- Citation compliance is measured on 7 answers from one model. Another model may cite less reliably.
- The checker covers figures and low/medium/high labels. It does not judge advice or reasoning, and
  bare numbers are found with word and column-header cues, so an unusual phrasing can slip past.
- The label bands are this demo's choice; vidIQ would use its own.
- The markdown parsers depend on vidIQ's current text format for `keyword_research` and `outliers`.
- Perf numbers are from localhost with simulated throttling, not from a CDN in front of real users.
- The hosted demo needs an access link, and Cloudflare's edge limits each IP to 20 requests per 10 s.
  In Live mode the LLM spend cap lives in one process.

## Development

```bash
corepack pnpm check            # typecheck + 152 unit tests
corepack pnpm e2e              # builds, starts on :3077, runs Playwright (Chromium)
corepack pnpm eval:claims      # offline claim-checker eval → eval/results/claims-latest.md
corepack pnpm eval             # offline planner eval on recordings
corepack pnpm perf             # needs the production server on :3077
corepack pnpm rerecord:answers # re-records Replay answers via OpenRouter only, 0 vidIQ credits
corepack pnpm record           # re-record vidIQ fixtures: spends real credits, hard budget, allowlist only
```

Chinh set the seams before writing code and built each one test-first (red, then green); AI coding
tools helped with parts of the implementation under his review. The citation e2e tests were checked by
breaking the chip on purpose and watching all three fail. Files stay under 200 lines.

```
src/lib/claims/     provenance, verifier, unbacked-claim finder, label table, number match, markdown sanitizer
src/components/     UI: answer-text, claim-chip, claim-check-panel, cost-card, results/
src/lib/llm/        planner, answer prompt with citations, grounding, OpenRouter client, spend guard
src/lib/mcp/        MCP client, JSON-RPC/SSE reader, error mapping
src/lib/schemas/    vidIQ output → typed views
scripts/            claim-eval/, eval-claims, rerecord-answers, record-fixtures, eval, perf
eval/claims/        claim-checker fixtures
docs/findings/      cropped AI Coach screenshots for FINDINGS.md
```
