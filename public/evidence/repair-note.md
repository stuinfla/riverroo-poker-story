Updated: 2026-10-23 13:05:00 EDT | Version 1.0.1
Created: 2026-10-23 13:05:00 EDT

# RiverRoo correction and fresh holdout

The original negative holdout used the hero position to select scouting statistics about the opponent. Heads-up positions are opposite: hero small blind faces opponent big blind, and hero big blind faces opponent small blind. Both vector prefetch and decision profile selection now use the opponent position. The original source, report and results are preserved.

The isolated repair passed all 13 tests, including two new regression tests showing that asymmetric opponent call frequencies can flip the hero action when positions are reversed. Fresh seeds 550301 through 550304 and 1,000 paired deals per opponent per seed were registered at 2026-10-23T16:59:21Z before evaluation. The run evaluated 16,000 paired deals / 32,000 hand-side evaluations across four synthetic opponents.

The uniform-equity baseline earned +0.48450 bb/hand. Direct range-conditioned cases and RuVector cases both earned +0.50825 bb/hand. The paired difference was +0.02375 bb/hand, with a 95% confidence interval of [+0.00960, +0.03790]. Against the strength-rule opponent the difference was +0.09500, with an interval of [+0.03845, +0.15155]; the other three opponents produced identical results across the three policies. Retrieval matched 1,352 of 1,352 exact cases, with zero direct/vector decision mismatches. The conditional policy changed 570 of 23,483 meaningful actions (2.4273%). Runtime was 39.361 seconds. Independent Python recomputation from all raw paired outcomes confirmed the pooled difference and interval.

This supports the added conditional case information in this restricted experiment. Vector search matched direct lookup and has no demonstrated extra strategic benefit. The game remains 10bb heads-up preflop shove/fold with synthetic opponents and free scouting. These results do not establish full no-limit poker, human strength, GTO strength or continual learning. Old and new scores use different seeds and cannot be subtracted as a controlled effect of the repair.

Local artifacts are in source/nextgen-repair: final-holdout.json, PREREGISTRATION-stage-repair.json, final-holdout.js, AUDIT-RECEIPTS.json, and artifacts/final-holdout-raw.ndjson. The isolated remote run is /home/ruv/poker-lab/nextgen-stage-repair-1792774600. The original remains /home/ruv/poker-lab/nextgen. A full working trained poker bot remains the objective after presentation delivery.
