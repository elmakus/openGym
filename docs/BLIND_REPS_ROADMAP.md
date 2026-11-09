# Blind Reps Mode — planned, waiting for Engine V2

> **Status: ON HOLD / NOT IMPLEMENTED**
>
> **Decision date:** 2026-11-09
>
> **Dependency:** Wait until the upstream Engine V2 work is merged and integrated into this fork, then revisit and implement Blind Reps Mode as a separate feature. Engine V2 has been discussed for v1.4.7, but the version and timing are not guaranteed.
>
> **Do not start implementation on the V1 session/progression architecture.**

## Goal

Add an optional **Settings → Workout → Blind reps** toggle (**OFF by default**). When enabled, the user should perform working sets without seeing target, previous-session, or progression-derived repetition numbers, and should enter the repetitions actually completed instead.

For example, the training prescription remains **3 × 8–12 reps, 150 seconds rest**, while the working-set rep fields appear blank. If the user does 11, 10, and 9 reps, these exact values are stored as performance.

## Intended behavior

- Hide rep-count hints for **working sets** across **Cards, List, Compact, and Focus** workout presentations.
- Initialize work-set actual-rep inputs **empty**; never prefill them with planned reps, previous reps, or progression values.
- Preserve full prescriptions, targets, history, audits, and all progression calculations. The mode changes **what is exposed and entered**, not the underlying training plan.
- Keep warm-up repetition instructions visible and editable.
- Do not silently record zero or prescribed reps when a user marks a set complete without entering the actual result.
- Account for unilateral exercises, supersets, AMRAP/failure sets, dropsets, rest-pause clusters, added exercises, interruptions/resume, device synchronization, watch/Garmin integration, and audio cues. Avoid accidental exposure of hidden rep targets.
- Prefer capturing the mode choice in the active workout so switching the global setting mid-session does not retroactively change that workout.
- Historical backfill/edit flows should remain unaffected unless deliberately specified in the feature implementation.

## Proposed integration with Engine V2

The in-progress V2 branch has a useful separation between an **immutable prescription** and **recorded performance**. The file `frontend/src/lib/session-ui-adapter.js` builds UI rows from the prescription and converts completed UI rows into performance observations.

After V2 is merged, investigate implementing Blind Reps at **that session/UI adapter boundary**, together with input validation and display masking. Leave the engine's prescription generation, progression operators, progression groups, and evaluation logic unchanged.

This is an **architectural suggestion, not a binding design**. The implementing agent should review the final merged V2 code and may select a better approach.

### Technical checks before implementation

- Ensure unentered reps remain `null` / empty, distinct from `0`, planned reps, and actual entered reps.
- Validate set-completion flows rather than trusting prefilled UI numbers.
- Check unilateral-side aggregation, rest-pause burst totals, dropset segments, AMRAP/failure, and completion without rep entry.
- Check every display path, accessibility/voice cues, persistence, sync/resume, and watch/Garmin payloads.
- Test mode OFF (unchanged legacy behavior) and mode ON in all major workout layouts.

## Resume when

1. Upstream Engine V2 changes have **actually merged** and the fork has adopted them; a v1.4.7 label alone is not sufficient.
2. Review the final implementation of prescriptions, session UI adapters, performance, and progression.
3. Open a **separate feature branch and PR** for Blind Reps with unit/integration/UI coverage.
4. Keep the Engine V2 migration itself, progression groups, and Unraid deployment out of the feature scope.

## Upstream Engine V2 tracking

- [PR #823 — Engine V2](https://github.com/DuarteSantos8/openGym/pull/823)
- [PR #824 — V2 activation/migration](https://github.com/DuarteSantos8/openGym/pull/824)
- [PR #825 — V2 editor/failure templates](https://github.com/DuarteSantos8/openGym/pull/825)

**Current action:** Documentation only. No implementation, no change to any existing workout logic, and no modification to the Engine V2 integration branch.
