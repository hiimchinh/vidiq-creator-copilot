# Claim checker eval

9 cases, 29 correct claims, 9 wrong or unbacked claims. Offline; 0 credits.

| Checker | False positives | False negatives |
|---|---|---|
| Naive exact-string match | 9 / 29 (31.0%) | 5 / 9 (55.6%) |
| Provenance (this repo) | 0 / 29 (0.0%) | 0 / 9 (0.0%) |

| Case | Kind | Naive FP | Naive FN | Ours FP | Ours FN |
|---|---|---|---|---|---|
| real-espresso-yours | real false positive | 1 | 0 | 0 | 0 |
| real-marathon-your-current | real false positive | 1 | 0 | 0 | 0 |
| decoration-variants | constructed | 6 | 0 | 0 | 0 |
| fabricated-numbers | constructed | 0 | 0 | 0 | 0 |
| wrong-numbers | constructed | 0 | 1 | 0 | 0 |
| unit-mixups | constructed | 1 | 2 | 0 | 0 |
| label-consistency | real inconsistency, rebuilt | 0 | 1 | 0 | 0 |
| own-replay-espresso | our own grounding gap | 0 | 1 | 0 | 0 |
| non-claim-numbers | constructed | 0 | 0 | 0 | 0 |

False positive: a correct claim flagged (or a non-claim flagged). False negative: a wrong or unbacked claim not flagged.

## Replay answers under the citation prompt

7 recorded answers, 36 figures and labels: 33 verified, 3 flagged.

- keyword-home-espresso: “high competition” (no-source): No cited number backs “high competition”.
- longtail-budget-travel: “high search volume” (mismatch): 8.3K is medium search volume by the threshold table.
- channel-veritasium: “high volume” (no-source): No cited number backs “high volume”.
