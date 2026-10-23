# RiverRoo final independent checkpoint — 2026-10-23, 11:56 EDT

## Decision
**Do not enable the range-conditioned RuVector case policy for play.** It retrieves the intended strategic cases perfectly in the tested corpus, but the first final holdout shows it performs **worse** than the simpler uniform-equity expert baseline. The stronger engineering foundation is useful; the claimed adaptive advantage is NOT established.

## Experiment scope
Heads-up Texas Hold'em, 10 big-blind stacks, no antes or rake, preflop shove/fold only. Small blind can fold or shove; big blind facing shove can fold or call. Every hand resets stacks. Four SYNTHETIC opponent policies: always-call, always-fold, random, and hand-strength rule. Not full no-limit poker; not game-theoretic optimality; not proof of human-level strength. Public scouting was collected independently and modeled with **zero information-collection cost**.

## Verified implementation and tests
- 11 automated checks PASSED, 0 failed on 2026-10-23: card uniqueness, 169 class coverage, fixtures, malformed-input rejection, differential hand ranks (6,000 comparisons against pokersolver), equity repeatability, blockers, legal actions, zero-sum accounting, observation boundaries, and pot odds.
- 169 starting-hand classes, 2,366 offline range-conditioned cases and 14 synthetic range profiles; training data checksum: a3d84540717717ceeba9bc5f1fcd1f3c450dfdd7dfa41634d5db9c88cdc9df24.
- RuVector retrieval from the repaired 3-dimensional case embedding: **1,352/1,352** matched direct exact-case retrieval; **0** decision mismatches with direct lookup. This establishes lookup correctness, not strategic intelligence or the incremental value of vectors.
- Development benchmark was rerun bit-for-bit (node checkpoint-benchmark.js). Its apparent +0.0447 bb/hand case improvement versus the rule opponent had a CI crossing zero. Importantly, development had used opponent profile.rate rather than case-specific blocker-conditioned acceptance, so it was NOT a reliable claim about the corrected case policy.

## Frozen-seed final holdout results
Seeds 440301 through 440304. For each opponent, 4,000 shuffled deals, each with both seats played (8,000 hand-side evaluations); total 16,000 paired deal clusters / 32,000 hand-side evaluations. Opponent randomness is held fixed across candidate strategies. Reward is big blinds per hand, with no rake; 95% CI uses paired deal clusters and normal approximation. Final policy used blocker-aware accept estimates for direct and RuVector case variants. A first attempt was stopped before any results were shown because the offline training corpus contained accept=1.0000000000000102 from floating-point summation in 169 cases. The final evaluation clamps acceptance estimates to [0,1], then runs; no outcome-driven parameter tuning followed.

| Synthetic opponent | Uniform expert | Direct case | RuVector case | RuVector minus uniform, 95% paired CI |
| --- | ---: | ---: | ---: | --- |
| Always-call | +0.38600 | +0.38600 | +0.38600 | 0 |
| Always-fold | +0.75000 | +0.75000 | +0.75000 | 0 |
| Random | +0.51381 | +0.51381 | +0.51381 | 0 |
| Strength-rule | +0.22844 | +0.10919 | +0.10919 | **-0.11925** [-0.19798, -0.04052] |
| **Equal-weight pooled** | **+0.46956** | **+0.43975** | **+0.43975** | **-0.02981** [-0.04951, -0.01012] |

All four independent rule-opponent holdout seeds showed a negative effect: -0.13650, -0.04525, -0.10425 and -0.19100 bb/hand. RuVector matched direct case perfectly. Thus the regression is in case estimates/policy, NOT vector search. The uniform expert also outperformed the always-aggressive (+0.31123 pooled) and simple-strength (+0.06255 pooled) benchmarks in this limited setup. That does not demonstrate full poker competence. Conditional cases changed 2,438 of 23,521 meaningful action choices (10.365%).

An independent Python recomputation from raw paired-deal outcomes confirmed the pooled difference of -0.029812 bb/hand and paired 95% CI [-0.049508, -0.010117].

## Files and reproducible commands
All artifacts persist at `/home/ruv/poker-lab/nextgen`:
- `SPEC.md` — written before the final evaluation.
- `cards.js`, `game.js`, `ranges.js`, `policy.js`, `train.js`, `memory.js` — engine, cases and retrieval.
- `cards.test.js`, `game.test.js`, `verify-memory.js` — software and memory tests.
- `artifacts/cases.json` — fixed training corpus; `artifacts/vector-lowdim-1535.db` — repaired persistent RuVector index.
- `checkpoint-benchmark.js/json` — development benchmark; `final-holdout.js`, `final-holdout.json`, `artifacts/final-holdout-raw.ndjson`, `final-holdout-run.log` — final benchmark and per-deal evidence.

Run:
```bash
cd /home/ruv/poker-lab/nextgen
node --test cards.test.js game.test.js
node verify-memory.js
node checkpoint-benchmark.js
node final-holdout.js
```
Do not tune to these holdout seeds. New strategy versions require fresh preregistered evaluation seeds.

Artifact SHA-256 checksums:
- `final-holdout.js`: 91ac8487bf0b4ba4412c11be2cff65fa0762c34ff75e670eb55eda24562f04f8
- `final-holdout.json`: b4b0a5f958ea3627b40dad841c1a3e4313d99bc6384095a227648abd1e4fe279
- `artifacts/final-holdout-raw.ndjson`: f6ad3615801d8f2ed1842adf0a0b65ec83291cded33e0c1e24c2fd1a0bc34aee

## Root-cause hypotheses, not yet verified
Candidate explanations: miscalibrated range-conditioned equity / acceptance, representative hand/suit bias, sparse effective sample counts in tight ranges, and nearest-case profile approximation. Because direct and vector implementations agree exactly, changing vector dimensions again is not the priority.

## Next decisions
1. Freeze and retain the functioning uniform-equity expert as the **research baseline**; reject the case-memory strategy pending a new independent benchmark.
2. Audit each differing action against a substantially higher-precision independently implemented equity calculation, conditioned on the actual opponent rule and hero blockers. Diagnose by hand class and position.
3. Separate opponent inference, Monte Carlo estimation variance and action threshold sensitivity. Benchmark each independently, then preregister fresh unseen seeds. No reuse of the 440301-440304 holdout to tune a claimed generalization gain.
4. If the desired deliverable is an expert-grade poker competitor, replace this restricted shove/fold simulator with a validated full-rule poker environment and solver-based baseline before spending more time on memory/agents.
5. Add real hand-history ingestion and out-of-sample opponents before making any claims of transferable skill. No online learning system or human/GTO benchmark has been demonstrated.

**Bottom line:** verified tests and retrieval improved. The decisive claim that richer memory improves poker performance **failed** the final holdout. Do not market or deploy it as stronger than the simpler baseline.
