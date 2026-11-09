# ATP2-BOOK — experimental openGym Engine v2 port

This branch is an experimental proof of concept based on integration/engine-v2.
It is not a change to upstream engine, production profiles, or Engine v2 staging PR.

## Non-negotiable requirement
Training decisions must match accepted Liftosaur implementation. Data model
and UI may differ; no algorithmic simplification or silent redesign.

Source of truth in elmakus/fitness:
- programs/adaptive_rep_engine_turbo_probe_candidate.liftoscript
- decisions/ATP_UPWARD_BOOK_TURBO.md
- decisions/ATP_DOWNWARD_AUTOREGULATION.md
- decisions/ATP2_BOOK_HARDENING.md
- tests/oracle/test_atp2_book_oracle.py

## Implemented
api/training-control/atp2.js is a pure reducer with TWO separate outputs:
remaining-set load (Liftosaur update semantics) and durable next-exposure
candidate/probe (Liftosaur progress semantics).

It covers native equipment ladders, chained Turbo, exact-MAX only for
the next exposure, first usable set downregulation, conservative manual
override, 1-rep UI sentinel, paired unilateral normalization, effective
native floor, and stale non-native candidate normalization.

## Verification
From api: npm test
From repository root: node --test api/training-control/*.test.mjs

Acceptance vectors in atp2-oracle.test.mjs were translated from the
original Python oracle. These tests do NOT execute the original Liftosaur
runtime and cannot alone prove full behavioural equivalence.

## Not yet implemented
- Active-workout completion and prescription integration.
- Per-occurrence opt-in and persistent controller state.
- Sync and historical replay.
- Disabling duplicate built-in progression for ATP2 tracks.
- Timed Load, HYBRID-2, RTT, and their priority/freeze interactions.
- Full application build and on-device training verification.

This experiment is not safe to deploy to live training profiles without
the integration and sync/replay safety checks.
