# onboarding-wizard-exercise

A B2B platform lets partner companies onboard themselves — connect an external system, validate that the connection works, and go live — with little to no manual back-office involvement. Today that process is slow and human-driven; the goal is to make it self-service.

This repo is a 3-step onboarding wizard (**Details → Validate → Review**, then **Go Live**) with no auth, fully resumable across reloads/restarts, idempotent against duplicate submissions, and backed by a mock external Provider for the Validate step.

- `backend/` — Node.js, TypeScript, Express, PostgreSQL via Prisma 7
- `frontend/` — React, TypeScript, Vite, MUI, TanStack Query, React Router

See [AI_LOG.md](./AI_LOG.md) for the full prompt-by-prompt build log, including every plan Claude Code proposed and every correction made to it.

## Running it locally

These steps assume a completely fresh computer — nothing pre-installed, no prior Node/Postgres setup. Pick the section for your OS and follow it top to bottom; the two are independent, so there's no need to cross-reference between them. Nothing needs a GUI database tool or a separately-installed Postgres either way — the one command in Step 2 (`npx prisma dev`) provides a real Postgres-compatible database on its own.

- [macOS / Linux](#macos--linux)
- [Windows](#windows)

---

### macOS / Linux

Every command below is meant to be copy-pasted in order into a terminal (Terminal.app, iTerm, or similar).

#### Step 1 — Install Node.js

This project needs Node **24.18.0** exactly (checked into `.nvmrc`/`package.json` in both `backend/` and `frontend/`). The easiest way to install and manage that is `nvm` (Node Version Manager), which lets you install a specific Node version without touching your system's Node install, if any.

1. Open a terminal and install `nvm` by pasting this in (this downloads and runs the official installer — see [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm) if this specific command ever stops working, for the current one-liner on that page):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```
2. Close and reopen your terminal (this makes the `nvm` command available), or run:
   ```bash
   source ~/.nvm/nvm.sh
   ```
3. Confirm it's installed:
   ```bash
   nvm --version
   ```
4. Install the exact Node version this project needs:
   ```bash
   nvm install 24.18.0
   nvm use 24.18.0
   ```
5. Confirm:
   ```bash
   node --version   # should print v24.18.0
   ```

#### Step 2 — Start the local database

From the repo root, move into the backend folder and install its dependencies (this also installs the Prisma CLI used in every step below, via `npx`):

```bash
cd backend
npm install
```

Start Prisma's built-in local Postgres-compatible server. **Leave this running** — open a new terminal tab/window for every step after this one, and don't close this one while you're working on the project:

```bash
npx prisma dev
```

You should see it report that it's listening (on `localhost:51214`; a second, lightweight instance on `51215` is used internally as a migration "shadow" database — see `prisma.config.ts`, no action needed for that one).

#### Step 3 — Create the two databases

In a **new terminal tab/window**, `cd` back into `backend/` and create the two databases this project uses — one for normal use, one dedicated to the test suite, kept separate so running tests never touches your real data:

```bash
cd backend
echo "CREATE DATABASE onboarding_wizard;" | DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" npx prisma db execute --stdin
echo "CREATE DATABASE onboarding_wizard_test;" | DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" npx prisma db execute --stdin
```

Each should print `Script executed successfully.` (These two commands connect to Postgres's own always-present `template1` database just long enough to create the two new ones — this is what avoids needing a separate database client like `psql` installed.)

#### Step 4 — Configure environment variables

Create two small text files that tell the app where to find those databases. Run these exactly as shown (still inside `backend/`) — they create the files directly from the terminal, no text editor needed:

```bash
cat > .env <<'EOF'
DATABASE_URL="postgres://postgres:postgres@localhost:51214/onboarding_wizard?sslmode=disable"
EOF
```

```bash
cat > .env.test <<'EOF'
DATABASE_URL="postgres://postgres:postgres@localhost:51214/onboarding_wizard_test?sslmode=disable"
EOF
```

(These two files are intentionally excluded from version control — `.env*` in `backend/.gitignore` — since env files are where secrets/credentials normally go, even though these particular values are just local dev defaults.)

#### Step 5 — Create the database tables

Apply the schema — including one hand-written partial unique index (`ValidationAttempt_sessionId_pending_key`, `WHERE status = 'PENDING'`) that Prisma's own schema language can't express, so it's written directly as SQL in this migration file instead of `schema.prisma` — to **both** databases using the migration file already in the repo:

```bash
npx prisma db execute --file prisma/migrations/00000000000000_init/migration.sql
DATABASE_URL="postgres://postgres:postgres@localhost:51214/onboarding_wizard_test?sslmode=disable" \
  npx prisma db execute --file prisma/migrations/00000000000000_init/migration.sql
```

(The first command uses `.env`'s `DATABASE_URL` automatically; the second overrides it inline to target the test database instead. `prisma migrate dev` doesn't work cleanly against this particular bundled local server, which is why `db execute` running the migration file directly is used here instead.)

Then generate the Prisma database client (the typed code the backend actually imports):

```bash
npx prisma generate
```

#### Step 6 — Run the backend

Still inside `backend/`:

```bash
npm run dev
```

Leave this running too. It should print that it's listening on `http://localhost:4000`. You can sanity-check it's alive by opening that URL's `/health` route in a browser, or in a new terminal:

```bash
curl http://localhost:4000/health
```

#### Step 7 — Run the frontend

In a **new terminal tab/window**, from the repo root:

```bash
cd frontend
npm install
npm run dev
```

This prints a local URL — open it in a browser (defaults to `http://localhost:5173`). No environment variables are needed here — the frontend talks to `http://localhost:4000` directly (hardcoded in `frontend/src/api/sessions.ts`), since this is a local exercise, not a deployed app.

At this point you should have three terminals running at once: `npx prisma dev` (Step 2), the backend (`npm run dev` in `backend/`), and the frontend (`npm run dev` in `frontend/`) — plus the browser tab open to the frontend's URL.

#### Running the tests (macOS / Linux)

In two more terminal tabs (or one at a time — these don't need to stay running):

```bash
cd backend && npm run test    # uses the onboarding_wizard_test database from Step 3
cd frontend && npm run test
```

---

### Windows

Every command below is meant to be copy-pasted in order into **PowerShell** (search "PowerShell" in the Start menu — the version that ships with Windows 10/11 is enough, nothing extra to install for the shell itself).

#### Step 1 — Install Node.js

This project needs Node **24.18.0** exactly (checked into `.nvmrc`/`package.json` in both `backend/` and `frontend/`). The easiest way to install and manage that is [nvm-windows](https://github.com/coreybutler/nvm-windows), which lets you install a specific Node version without touching your system's Node install, if any.

1. Go to [github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases), download `nvm-setup.exe` from the latest release's Assets, and run it (accept the defaults).
2. Open a **new** PowerShell window (the installer won't be picked up by ones already open).
3. Confirm it's installed:
   ```powershell
   nvm version
   ```
4. Install the exact Node version this project needs:
   ```powershell
   nvm install 24.18.0
   nvm use 24.18.0
   ```
5. Confirm:
   ```powershell
   node --version   # should print v24.18.0
   ```

#### Step 2 — Start the local database

From the repo root, move into the backend folder and install its dependencies (this also installs the Prisma CLI used in every step below, via `npx`):

```powershell
cd backend
npm install
```

Start Prisma's built-in local Postgres-compatible server. **Leave this running** — open a new PowerShell window for every step after this one, and don't close this one while you're working on the project:

```powershell
npx prisma dev
```

You should see it report that it's listening (on `localhost:51214`; a second, lightweight instance on `51215` is used internally as a migration "shadow" database — see `prisma.config.ts`, no action needed for that one).

#### Step 3 — Create the two databases

In a **new PowerShell window**, `cd` back into `backend/` and create the two databases this project uses — one for normal use, one dedicated to the test suite, kept separate so running tests never touches your real data:

```powershell
cd backend
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
"CREATE DATABASE onboarding_wizard;" | npx prisma db execute --stdin
"CREATE DATABASE onboarding_wizard_test;" | npx prisma db execute --stdin
```

Each should print `Script executed successfully.` (These commands connect to Postgres's own always-present `template1` database just long enough to create the two new ones — this is what avoids needing a separate database client like `psql` installed. `$env:DATABASE_URL` stays set for the rest of *this* PowerShell window, which Step 5 below accounts for.)

#### Step 4 — Configure environment variables

Create two small text files that tell the app where to find those databases (still inside `backend/`) — no text editor needed:

```powershell
Set-Content -Path .env -Value 'DATABASE_URL="postgres://postgres:postgres@localhost:51214/onboarding_wizard?sslmode=disable"'
Set-Content -Path .env.test -Value 'DATABASE_URL="postgres://postgres:postgres@localhost:51214/onboarding_wizard_test?sslmode=disable"'
```

(These two files are intentionally excluded from version control — `.env*` in `backend/.gitignore` — since env files are where secrets/credentials normally go, even though these particular values are just local dev defaults.)

#### Step 5 — Create the database tables

Apply the schema — including one hand-written partial unique index (`ValidationAttempt_sessionId_pending_key`, `WHERE status = 'PENDING'`) that Prisma's own schema language can't express, so it's written directly as SQL in this migration file instead of `schema.prisma` — to **both** databases using the migration file already in the repo. Set `$env:DATABASE_URL` explicitly before each call rather than relying on `.env` here, since PowerShell keeps environment variables set for the rest of the window (unlike a one-off prefix in bash) — Step 3 already left it pointed at `template1`:

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:51214/onboarding_wizard?sslmode=disable"
npx prisma db execute --file prisma/migrations/00000000000000_init/migration.sql

$env:DATABASE_URL = "postgres://postgres:postgres@localhost:51214/onboarding_wizard_test?sslmode=disable"
npx prisma db execute --file prisma/migrations/00000000000000_init/migration.sql
```

Then clear the override (important — otherwise it would leak into the backend's own `.env` loading in Step 6 and point it at the test database instead) and generate the Prisma database client:

```powershell
Remove-Item Env:DATABASE_URL
npx prisma generate
```

#### Step 6 — Run the backend

Still inside `backend/`, in the same window is fine now that `DATABASE_URL` has been cleared:

```powershell
npm run dev
```

Leave this running too. It should print that it's listening on `http://localhost:4000`. You can sanity-check it's alive by opening that URL's `/health` route in a browser, or in a new PowerShell window:

```powershell
curl http://localhost:4000/health
```

#### Step 7 — Run the frontend

In a **new PowerShell window**, from the repo root:

```powershell
cd frontend
npm install
npm run dev
```

This prints a local URL — open it in a browser (defaults to `http://localhost:5173`). No environment variables are needed here — the frontend talks to `http://localhost:4000` directly (hardcoded in `frontend/src/api/sessions.ts`), since this is a local exercise, not a deployed app.

At this point you should have three PowerShell windows running at once: `npx prisma dev` (Step 2), the backend (`npm run dev` in `backend/`), and the frontend (`npm run dev` in `frontend/`) — plus the browser tab open to the frontend's URL.

#### Running the tests (Windows)

In two more PowerShell windows (or one at a time — these don't need to stay running):

```powershell
cd backend
npm run test    # uses the onboarding_wizard_test database from Step 3
```

```powershell
cd frontend
npm run test
```

---

Both use Vitest. Backend tests hit the real test database (see [Key decisions](#key-assumptions--design-decisions) below for why) via Supertest for route tests and direct service-function calls for unit tests; frontend tests use React Testing Library with `userEvent`, split into hook tests (`renderHook`, isolated one dependency layer down) and component tests (mock only the network boundary).

## Key assumptions & design decisions

The full reasoning behind each of these — including the back-and-forth where things were proposed one way and changed — is in [AI_LOG.md](./AI_LOG.md). The short version of the ones that most shaped the app:

- **`currentStep` vs. `isLive` are two independent fields, not one state machine.** `WizardStep` stays 3-valued (`DETAILS`/`VALIDATE`/`REVIEW`) with no 4th "complete" value — completion is a separate `isLive: boolean`, checked first on every read. One enum value doing double duty as both "position" and "done" would create two ways to represent the same fact that could drift out of sync; two independent fields can't disagree with each other by construction.
- **Idempotency via atomic guarded updates (`updateMany({ where: { id, currentStep: 'DETAILS' } })`), not idempotency keys or row locks.** Postgres already gives this for free with a conditional `UPDATE ... WHERE` — the WHERE clause acts as the lock. Idempotency keys are the right tool when a client might retry the *same logical action* multiple times and you need to recognize "I've seen this exact request before" (e.g. payments); row locking is the right tool when there's real contention across many concurrent writers. Neither problem exists here — every step transition is a single conditional write, and the condition itself is what makes a duplicate call a safe no-op instead of requiring extra bookkeeping.
- **Every step-advancing endpoint follows the same shape**: check the session exists (404 if not) → check any other precondition (400 if unmet — e.g. `advance-to-review` requires the latest validation to be VALID/PARTIAL, `go-live` requires `currentStep === REVIEW`) → guarded `updateMany` → unconditional `findUniqueOrThrow` to read back the result. Existence is checked up front specifically so the final read-back never needs a nullable fallback — consistency across `submitDetails`/`advanceToReview`/`goLive` was a deliberate later refactor once the pattern was established with the third endpoint.
- **`POST`, not `PATCH`/`PUT`, for step-submission endpoints** (`/details`, `/validate`, `/advance-to-review`, `/go-live`), even though several are simple field updates underneath. These represent the partner *submitting a step* — a state-transition action — not a REST resource edit, and staying consistent across all of them mattered more than PATCH's marginal semantic accuracy for any one of them.
- **The mock Provider's outcome payload is a single `Json?` column**, not four sets of typed nullable columns. The four outcomes (`VALID`/`PARTIAL`/`INVALID`/`UNAVAILABLE`) have genuinely different shapes, Postgres can't enforce "warnings only when PARTIAL" either way, and a JSON payload keeps the table narrow and extensible if a 5th outcome ever shows up. The shape is still fully typed in application code via a discriminated union — the database just doesn't need to know about it.
- **Client-side and server-side gates both exist for the same rules** (e.g. "Next" on Validate checks status is VALID/PARTIAL locally *and* the backend rejects with 400 if it isn't). The frontend check is for fast feedback and normal UX; the backend check is the actual guarantee, since a direct API call can always skip the frontend.
- **"Deliberately not disabled" buttons.** Step 1's Next, Step 2's Retry/Next, and Step 3's Go Live are never disabled or blocked client-side while their request is in flight. This was intentional so a real double-click reaches the backend and exercises its idempotency guard for real, rather than the frontend silently preventing the exact scenario the backend was built to handle.
- **`mutateAsync` + `async`/`try`/`catch` everywhere**, not `mutate()` with `onSuccess`/`onError` callbacks — standardized mid-build for consistency and readability once the team got comfortable with the pattern.
- **Real test database over mocking Prisma.** Several correctness guarantees live in the database itself (the partial unique index, `onDelete: Cascade`, column defaults) — a mocked Prisma client can't validate any of that and would give false confidence on exactly the things most worth testing.
- **`ReviewStep` fetches its own data independently** (`useGetSession` + `useGetValidationAttempt`) rather than receiving it as props from `ValidateStep`. Props don't survive a remount, so a cold reload landing directly on Review would show nothing even though the real data exists — fetching independently means it's correct regardless of how the user got there.
- **`staleTime: 0` + `refetchOnMount: 'always'`** on the session and validation-attempt queries, and `invalidateQueries` after every mutation that changes what one of them would return. Both this app's resumability requirement and its "show the new state immediately after an action" requirement mean stale cached data is actively wrong here, not just slightly behind.
- **Provider API key stored as plaintext.** Fine against a mock provider in a take-home; flagged rather than silently accepted as production-appropriate.

## What was deliberately deferred, and why

- **No stale-`PENDING` reconciliation.** The mock Provider resolves via an in-process 5-second `setTimeout`, not a persisted job/queue. If the server restarts mid-timer, that specific attempt stays `PENDING` forever until the partner clicks Retry (which is always available) — it never self-heals. A real system would want a lazy, read-time staleness check (if `now() - createdAt` exceeds a timeout on read, reconcile to `UNAVAILABLE`) or a durable job queue; skipped here since the in-memory timer is sufficient to demonstrate the actual requirement (pending state surviving a *page reload*, which it does) without the added infrastructure a durable version would need.
- **No back-navigation.** Nothing in the spec asked for revisiting a prior step, and the atomic-guarded-update idempotency model is simplest when transitions are strictly one-directional. `DetailsStep` does still pre-fill from persisted data as a byproduct of the resume-on-reload work, even though that pre-fill path isn't currently reachable without back-navigation — noted as inert-but-harmless rather than removed.
- **No retry/attempt numbering.** Each `ValidationAttempt` retry is just a new row ordered by `createdAt`; there's no `attemptNumber` column. It was in an early schema draft and cut — "attempt #3" identity adds nothing a `createdAt`-ordered list doesn't already give for this app's actual needs.
- **No shared types package between frontend and backend.** The frontend hand-maintains its own `Session`/`ValidationAttempt` types mirroring the Prisma models. Fine at this size; would become a real liability on a larger or longer-lived project.
- **No auth, multi-tenancy, or rate limiting.** Out of scope per the exercise ("single trusted partner, no auth/user model needed"), but worth naming explicitly since a real B2B onboarding surface would need all three before being internet-facing.
- **No production build/deploy configuration**, CI, or containerization (no Dockerfile/Compose) — this was built and run entirely as a local dev exercise.
- **Minimal error-state UX.** A genuine network failure while fetching the session (as opposed to a confirmed 404) currently leaves the wizard on its loading spinner indefinitely rather than showing a retry affordance — the behavior for that case was never specified, so nothing was silently invented for it.
- **No structured logging/observability.** Backend errors go to `console.error` and a generic `{ error: "..." }` response; no request IDs, no log aggregation, no metrics.

## What I'd do with another day

- If the server restarts while a validation is still pending, right now it could get stuck in "pending" forever since nothing's watching it anymore. Could add a simple timeout check — if it's been pending too long, just mark it unavailable instead of leaving it stuck.
- Set up a shared types package so the frontend isn't just manually copying the backend's response shapes by hand — a shared types package so it can be reused in both.
- Add CI so typechecking and tests run automatically on every push, instead of only running them locally when I remember to.
- Improve the error states in the UI — right now a failed session fetch doesn't really show the user anything useful or a way to retry, it's mostly just handled internally.
- Add real logging instead of just `console.error`, something that'd actually be useful if this were running in production.
- If this were a real product, things like back-navigation or real auth would need proper thought, not just bolted on. Auth especially — right now anything with a session ID can call any endpoint for it, since there's no concept of a logged-in user at all. Adding real auth means deciding how a user relates to a session (one-to-one? can a user have several?) and adding an ownership check to every existing endpoint, on top of the state-machine/idempotency logic already there.
- Overall, go back through both the backend and frontend looking for general improvements, and clean up any unused code or logic left over from earlier iterations.

## Why this stack

React and Node are the stack I feel most comfortable with, and they provided everything I needed for this exercise.

- **Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma
- **Frontend:** React, TypeScript, Vite, MUI, TanStack Query, React Router
- **Testing:** Vitest, React Testing Library, Supertest
