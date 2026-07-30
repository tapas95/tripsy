# Tripsy — Agent Instructions

## Expo version note
This project uses Expo SDK 57. Before using any Expo API, check the exact
versioned docs at https://docs.expo.dev/versions/v57.0.0/ rather than
relying on general knowledge — Expo APIs change between SDK versions and
training data can be stale.

## What this project is
A React Native (Expo, managed workflow) travel expense tracker. Group trips,
shared expenses, split calculation (equal/custom/percentage), receipts, and
"who owes whom" settlement — synced live via Supabase.

Full product spec, screen list, and data model: see `SPEC.md`.
Database schema (source of truth): see `supabase/schema.sql`.

## Stack
- Expo (managed workflow) + TypeScript, strict mode
- NativeWind (Tailwind for RN)
- Supabase: Postgres + Auth + Storage + Realtime
- React Query for server state — do not hand-roll fetch/cache logic

## Conventions
- Functional components with hooks only. No class components.
- TypeScript strict mode.
- Components stay under ~150 lines. Split into smaller pieces if larger.
- All currency amounts render in the numeric font (IBM Plex Mono),
  right-aligned, tabular-nums. This is a signature visual element — don't
  drop it when building money-related UI.
- Folder structure: src/{api,components,screens,navigation,hooks,store,types,theme,utils}
  — put new code in the matching folder, don't invent new top-level folders
  without asking.
- Env vars are read via EXPO_PUBLIC_* prefix (Expo convention).

## Working rules
- Explain what changed after every file edit — plain language, not just a diff dump.
- Ask before adding any new npm dependency. Don't silently install things.
- Small, working, reviewable changes. Commit after each working step —
  small diffs over large ones.
- I'm learning React Native as you build this with me — briefly explain the
  *why* behind non-obvious choices (e.g. why a hook is memoized), not just
  the *what*.

## Out of scope for v1 — do not build these
- Multi-currency conversion within a single trip
- Cross-trip expense splitting
- Custom offline conflict resolution beyond Supabase Realtime defaults