Updated: 2026-10-23 13:50:00 EDT | Version 1.0.0
Created: 2026-10-23 13:50:00 EDT

# Full-street feedback experiment

Actual RuOS execution on 2026-10-23 ran 640 training hands (five parameter settings on 64 separate seeds, both seats) followed by 1,024 holdout hands (256 preregistered unseen seeds, both seats, two policies). Every hand began with fresh 100bb stacks. Equity sampling: 60 rollouts per expert decision. All four betting streets executed. Runtime: 14.004 seconds.

Default heuristic: aggressionThreshold .67, callMargin .02, potFraction .65. Feedback-selected policy: .60, .12, .90. Selection maximized mean training profit, with earliest-index tie break. Defaults yielded 4.6474609375 bb/hand on holdout; selected policy yielded 7.4677734375. Paired improvement 2.8203125 bb/hand; normal-approximation 95% interval [1.1440025581744697, 4.49662244182553], using the 256 seed clusters as observations.

This establishes an improvement for this one seeded novice opponent and this bounded experiment. It does not establish strong poker play, GTO, superiority to humans, or improvement over other opponents. It compares a frozen default Monte Carlo heuristic to a feedback-selected tuning of that same heuristic; it is not a comparison to a separate historical dumb bot.

The learner is explicit parameter search with outcome feedback. Native @ruvector/rvf accepted 641 vectors: 640 numeric training experiences and one selected-policy record. Closing and reopening the actual binary retrieved selected-policy-3 at distance zero; the ID selected the configuration used in one real engine decision. Store: new-learning-proof-experience.rvf, 18,550 bytes, SHA-256 7248cd37cd31e08d88b59faeda7c804f9d33644cfb0cf0efa08a2a84fdfb9fe5. Its .idmap.json companion must be preserved. The SDK's metadata fields are explicitly unsupported; policy config remains human-readable in the preregistration/selection files.

Retrieval uses the already-selected tuning as the query and demonstrates persistence/replay, not a causal memory benefit or novel-state generalization. The same selected configuration could be supplied directly. No claim that RVF intrinsically adjusts parameters follows. Existing engine.mjs and strategy.mjs contain no training loop, RVF imports or persistence; the experiment is a separate executable and is not connected to the existing browser UI.

RuvNet source grounding returned ruvector/npm/packages/rvf/README.md (receipt 45ed9fdb1e76, source SHA 81bbb195539541f6d26e0d20b59a1aa0164033b30186aa24b4aee777a8de1916). Native create/ingest/close/reopen/query behavior was then tested against the installed package, not inferred from that documentation.

Files: new-learning-proof.mjs; new-learning-proof-preregister.json; new-learning-proof-selection.json; new-learning-proof-receipt.json (all raw paired outcomes and training experiences); new-learning-proof-run.log; RVF binary and id map. Original code/public site were not modified. The script uses exclusive-create receipts and will refuse to overwrite this run; preserve it before any rerun.
