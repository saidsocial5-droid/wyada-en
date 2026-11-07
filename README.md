# WYADA EN

A gamified, bite-sized English learning app for Android. It is an original
product: its own name, brand, characters and course content. The feature set
is planned from a clean-room study of how leading language apps work
(see `replica/recon.md`). No code, assets or content from any other app are used.

Status: **M1 vertical slice done.** A guest picks Arabic → English, plays real lessons (multiple choice, word bank, typed translation), earns XP, starts a streak, and the path unlocks.

Run it (demo mode, no server needed):
```bash
cd app && npm install && npx expo start --web
```
Tests: `cd app && npm test` (answer checking and rules), `supabase/tests/run-local.sh` (server), `app/tests/e2e-demo.cjs` (full loop in a browser).
Connect Supabase: see `supabase/README.md`. Next: M2 (see `replica/architecture.md`).