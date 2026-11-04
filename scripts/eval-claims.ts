/**
 * Offline claim-checker eval: no vidIQ or model calls. Compares a naive exact-string checker with the
 * provenance checker on fixtures in eval/claims/cases.json and writes eval/results/claims-latest.{json,md}.
 *
 *   pnpm eval:claims
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReplayScenario } from "../src/lib/replay/replay-types";
import { REPLAY_SCENARIOS } from "../src/fixtures/replay";
import { checkReplayAnswer } from "./claim-eval/replay-answers";
import { type ClaimCase, scoreCase, totals } from "./claim-eval/score-claims";

const root = join(import.meta.dirname, "..");
const cases = JSON.parse(readFileSync(join(root, "eval/claims/cases.json"), "utf8")) as ClaimCase[];
const results = cases.map(scoreCase);
const naive = totals(results, "naive");
const ours = totals(results, "ours");
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const lines = [
  "# Claim checker eval",
  "",
  `${cases.length} cases, ${naive.ok} correct claims, ${naive.bad} wrong or unbacked claims. Offline; 0 credits.`,
  "",
  "| Checker | False positives | False negatives |",
  "|---|---|---|",
  `| Naive exact-string match | ${naive.fp} / ${naive.ok} (${pct(naive.fpRate)}) | ${naive.fn} / ${naive.bad} (${pct(naive.fnRate)}) |`,
  `| Provenance (this repo) | ${ours.fp} / ${ours.ok} (${pct(ours.fpRate)}) | ${ours.fn} / ${ours.bad} (${pct(ours.fnRate)}) |`,
  "",
  "| Case | Kind | Naive FP | Naive FN | Ours FP | Ours FN |",
  "|---|---|---|---|---|---|",
  ...results.map((r) => `| ${r.id} | ${r.kind} | ${r.naive.fp} | ${r.naive.fn} | ${r.ours.fp} | ${r.ours.fn} |`),
  "",
  "False positive: a correct claim flagged (or a non-claim flagged). False negative: a wrong or unbacked claim not flagged.",
  "",
];
const replay = (REPLAY_SCENARIOS as ReplayScenario[]).map(checkReplayAnswer);
const replayVerified = replay.reduce((n, r) => n + r.verified, 0);
const replayFlagged = replay.flatMap((r) => r.flagged.map((f) => ({ id: r.id, ...f })));
lines.push(
  "## Replay answers under the citation prompt",
  "",
  `${replay.length} recorded answers, ${replayVerified + replayFlagged.length} figures and labels: ${replayVerified} verified, ${replayFlagged.length} flagged.`,
  "",
  ...replayFlagged.map((f) => `- ${f.id}: “${f.display}” (${f.check}): ${f.reason}`),
  "",
);
writeFileSync(join(root, "eval/results/claims-latest.md"), lines.join("\n"));
writeFileSync(join(root, "eval/results/claims-latest.json"), `${JSON.stringify({ naive, ours, results, replay }, null, 2)}\n`);
console.log(lines.slice(4, 8).join("\n"));
console.log(`replay answers: ${replayVerified} verified, ${replayFlagged.length} flagged`);
for (const r of results) if (r.ours.fp || r.ours.fn || r.extraFlags.length) console.log(`  ours missed on ${r.id}:`, JSON.stringify(r.claims), r.extraFlags);
