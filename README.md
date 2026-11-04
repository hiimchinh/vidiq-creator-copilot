# Creator Copilot: a provenance-based claim checker for LLM answers on vidIQ data

An independent demo built on the public [vidIQ MCP](https://support.vidiq.com/en/articles/15082430-vidiq-mcp).
It is not made or endorsed by vidIQ and uses no vidIQ brand assets.

**Demo:** a Replay-only build runs at https://vidiq-demo.hiimchinh.com. It is private: ask Chinh Hoang
for an access link. It answers recorded example questions from stored tool results and spends no
credits.

## The problem

AI Coach's claim check calls the creator's own correct title score "unverified". In three of three
title-scoring answers Chinh Hoang ran on 4 Nov 2026, the flagged number was the creator's own score
(99/100, 86/100, 99/100). The model had written "(yours)" or "Your current:" next to the title, and
the check seems to match the exact title text, so the decoration broke the match.

That score is the baseline for every suggestion. When it is the number marked untrustworthy, the
creator learns to ignore the warning, and the check stops protecting them from a real fabricated
number. Screenshots and details: [FINDINGS.md](FINDINGS.md).

## The fix

Bind each number to the tool call that produced it, not to the text around it.

1. **The model cites, the client verifies.** Tool results are numbered `c1`, `c2`, … and the model
   writes each figure as a citation, for example `[[c1.score=99]]`. The browser resolves `c1.score`
   against the stored tool result and compares the values.
2. **Decoration has no effect.** "(yours)", "Your current:", quotes and markdown around the title do
   not matter, because the title is not the key.
3. **Only real problems are flagged:** a figure with no source, a figure that disagrees with its
   source at the precision shown, and a low/medium/high label with no cited number behind it.
4. **Every figure is a chip.** Hover or keyboard focus shows the tool, args, field and raw value.

The demo opens on the espresso answer in AI Coach's Title Scorecard layout, with a toggle under the
table. The exact-text check flags the creator's own 99; the provenance check verifies all 8 scores.

| Verified figures, details on focus | A model-written label with nothing behind it |
|---|---|
| ![Citation chip with its source details](docs/screenshots/answer-citations-light.png) | ![Flagged label "high competition"](docs/screenshots/answer-flagged-light.png) |

## Eval: exact-text check vs provenance

`pnpm eval:claims` runs offline on `eval/claims/cases.json` (0 credits, $0). The cases include the
two real false positives rebuilt from the screenshots, decoration variants, fabricated and wrong
numbers, unit mix-ups and this repo's own earlier ungrounded answer.

| Checker | Correct claims flagged | Bad claims missed |
|---|---|---|
| Exact-text match, a reconstruction of the observed behaviour | 9 / 29 (31.0%) | 5 / 9 (55.6%) |
| Provenance binding (this repo) | 0 / 29 (0%) | 0 / 9 (0%) |

The cases were written by the same person who wrote the checker. Read 0% as "handles these cases",
not as a production rate.

## How it would roll out at vidIQ

1. **Baseline.** Log, per answer, how many figures the current check marks unverified and how often
   the marked figure is the creator's own title. Label a sample by hand to get the current
   false-positive rate.
2. **Shadow.** Ask the model for citations and run the provenance checker on real traffic without
   changing the UI. Go on only if citation compliance is ≥ 98% and false positives fall with no rise
   in missed fabrications.
3. **Gate.** Show chips and the new warning behind a flag for 5%, then 25% and 100% of creators.
   Thumbs-down rate must not rise; answer length and TTFT stay within 5%.
4. **Kill switch.** Remote flags for the chips and the warning. An unreadable citation is shown as
   its value marked unverified, never as raw brackets; the checker never blocks an answer.

## Run it locally (one command, no keys)

```bash
corepack pnpm install && corepack pnpm demo
```

Open http://localhost:3000. Replay mode is the default: it plays real vidIQ MCP responses recorded on
4 Nov 2026, so it costs 0 credits and $0. Node ≥ 22.18; pnpm is pinned through `packageManager`.

Live mode: set `OPENROUTER_API_KEY` on the server (see `.env.example`), switch to **Live**, and paste
your own vidIQ API key. The key stays in `sessionStorage` (this tab only) and is sent only to this
app's `/api/*` routes, which forward it to `https://mcp.vidiq.com/mcp` as a Bearer token.

## Limits

- The naive checker is a reconstruction from AI Coach's output, not vidIQ's code.
- Citation compliance is measured on 7 answers from one model; another model may cite less reliably.
- The checker covers figures and low/medium/high labels. It does not judge advice or reasoning.

## More

[docs/engineering.md](docs/engineering.md): how the job description maps to the code, architecture,
credit protection, other evals and performance, spend, the full list of limits and the development
commands.

## License

MIT. See [LICENSE](LICENSE).
