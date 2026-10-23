# Frozen experiment specification

Written before implementation/evaluation, 2026-10-23. Deadline 15:45 UTC.

## Scope and falsifiable criteria
Build heads-up, 10bb, no-rake, no-ante, preflop shove/fold Hold'em. Each independent hand resets stacks. SB posts .5bb, BB 1bb. SB may fold or shove; BB may fold or call only after a shove. A called hand deals five board cards. No postflop decisions, other bet sizes, tournaments, multiway pots, or full-game strength claims.

Require legal-action rejection, card uniqueness, zero-sum whole-hand chip rewards, all 169 starting classes, known evaluator fixtures and randomized differential tests against pokersolver, seeded reproducibility, observation objects without hidden cards, and confidence intervals clustered by duplicate deal (two seats).

Expert decisions maximize estimated chip EV: BB calls if equity > .45; SB shoves if (1-pCall)+pCall*(20*equity-10) > -.5. Ties go to fold. The starting expert has Monte Carlo uniform-range equity and public observed call frequency. Strategic memory supplies separately constructed range-conditioned equity and blocker-conditioned acceptance probabilities. This is an information/estimation ablation, not evidence that vectors inherently improve poker. An exact nearest-case lookup control separates retrieval approximation from case knowledge.

Strategic cases cover all 169 classes crossed with uniform, random, never, and monotone strength ranges. Features: hero class, public opponent action frequency, mean strength of publicly revealed accepted hands. Independent scouting uses forced calls to reveal shoved cards and records called showdown cards; no test cards/outcomes enter scouting or case construction. Fixed synthetic opponents: always call/shove, always fold, independent random, and rank-based tight rule. Public scouting is free information and excludes its chip cost: disclose this limitation.

Training seed 110301; scouting seeds 220301 onward; development seed 330301; final holdout seeds 440301, 440302, 440303, 440304. RNG streams for cards, actions, and training are separate. Freeze policy/config before opening holdout results. Any correctness correction after inspection must be disclosed and use fresh final seeds.

Evidence: raw per-deal paired outcomes, per-opponent/per-seed and pooled means, paired 95% normal intervals over deal clusters, memory decision changes, direct-lookup agreement, runtime, source/data digests. Positive performance is not guaranteed. A lower interval bound >0 is the criterion for an advantage in the specified comparison; no full-poker/GTO claims. Preserve existing worker and files.
