# onboarding-wizard-exercise

A B2B platform lets partner companies onboard themselves, connect an external system, validate that the connection works, and go live, with little to no manual back-office involvement. Today that process is slow and human-driven; the goal is to make it self-service.

This repo is a 3-step onboarding wizard (**Details → Validate → Review**, then **Go Live**) with no auth, fully resumable across reloads/restarts, idempotent against duplicate submissions, and backed by a mock external Provider for the Validate step.

- `backend/`, Node.js, TypeScript, Express, PostgreSQL via Prisma 7
- `frontend/`, React, TypeScript, Vite, MUI, TanStack Query, React Router

See [AI_LOG.md](./AI_LOG.md) for the full prompt-by-prompt build log, including every plan Claude Code proposed and every correction made to it.

## Running it locally

These steps assume a completely fresh computer, nothing pre-installed, no prior Node/Postgres setup. Pick the section for your OS and follow it top to bottom; the two are independent, so there's no need to cross-reference between them. Nothing needs a GUI database tool or a separately-installed Postgres either way, the one command in Step 2 (`npx prisma dev`) provides a real Postgres-compatible database on its own.

### Get the code

Everything below refers to "the repo root", get a local copy of it first. This uses the repo's public HTTPS URL, so no SSH key or login is needed.

1. Confirm Git is installed:
   ```bash
   git --version
   ```
   If that fails: on macOS, running any `git` command for the first time usually prompts you to install Apple's Command Line Tools, just follow that prompt; on Windows, download and run the installer from [git-scm.com/downloads](https://git-scm.com/downloads).
2. Clone the repo and move into it:
   ```bash
   git clone https://github.com/KevinR777/onboarding-wizard-exercise.git
   cd onboarding-wizard-exercise
   ```

Now pick the section below for your OS:

- [macOS / Linux](#macos--linux)
- [Windows](#windows)

---

### macOS / Linux

Every command below is meant to be copy-pasted in order into a terminal (Terminal.app, iTerm, or similar).

#### Step 1, Install Node.js

This project needs Node **24.18.0** exactly (checked into `.nvmrc`/`package.json` in both `backend/` and `frontend/`). The easiest way to install and manage that is `nvm` (Node Version Manager), which lets you install a specific Node version without touching your system's Node install, if any.

1. Open a terminal and install `nvm` by pasting this in (this downloads and runs the official installer, see [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm) if this specific command ever stops working, for the current one-liner on that page):
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

#### Step 2, Start the local database

From the repo root, move into the backend folder and install its dependencies (this also installs the Prisma CLI used in every step below, via `npx`):

```bash
cd backend
npm install
```

Start Prisma's built-in local Postgres-compatible server, giving it an explicit, memorable name (`--name`) so it doesn't share the generic `default` slot with any other Prisma-based project you might have on this machine. **Leave this running**, open a new terminal tab/window for every step after this one, and don't close this one while you're working on the project:

```bash
npx prisma dev --name onboarding-wizard
```

It prints a line like `postgres://postgres:postgres@localhost:PORT/template1?sslmode=disable` — note the port number. It's assigned automatically the first time this named server is created and is **not guaranteed to be the same on every machine**, so the exact value matters for the next few steps (a second, lightweight instance one port higher is used internally as a migration "shadow" database, see `prisma.config.ts`, no action needed for that one).

#### Step 3, Create the two databases

In a **new terminal tab/window**, `cd` back into `backend/`. Save the port Step 2 printed as a variable — replace `51214` below with whatever you actually saw (or run `npx prisma dev ls` in this terminal if you need to look it up again):

```bash
cd backend
export DB_PORT=51214   # replace with the port from Step 2
```

Then create the two databases this project uses, one for normal use, one dedicated to the test suite, kept separate so running tests never touches your real data:

```bash
echo "CREATE DATABASE onboarding_wizard;" | DATABASE_URL="postgres://postgres:postgres@localhost:${DB_PORT}/template1?sslmode=disable" npx prisma db execute --stdin
echo "CREATE DATABASE onboarding_wizard_test;" | DATABASE_URL="postgres://postgres:postgres@localhost:${DB_PORT}/template1?sslmode=disable" npx prisma db execute --stdin
```

Each should print `Script executed successfully.` (These two commands connect to Postgres's own always-present `template1` database just long enough to create the two new ones, this is what avoids needing a separate database client like `psql` installed.)

#### Step 4, Configure environment variables

Create two small text files that tell the app where to find those databases. Run these exactly as shown (still inside `backend/`, same terminal, so `$DB_PORT` is still set) — they create the files directly from the terminal, no text editor needed. Note this uses an unquoted `<<EOF` (not `<<'EOF'`), so `$DB_PORT` gets substituted with its actual value in the file:

```bash
cat > .env <<EOF
DATABASE_URL="postgres://postgres:postgres@localhost:${DB_PORT}/onboarding_wizard?sslmode=disable"
EOF
```

```bash
cat > .env.test <<EOF
DATABASE_URL="postgres://postgres:postgres@localhost:${DB_PORT}/onboarding_wizard_test?sslmode=disable"
EOF
```

(These two files are intentionally excluded from version control, `.env*` in `backend/.gitignore`, since env files are where secrets/credentials normally go, even though these particular values are just local dev defaults.)

#### Step 5, Create the database tables

Apply the schema, including one hand-written partial unique index (`ValidationAttempt_sessionId_pending_key`, `WHERE status = 'PENDING'`) that Prisma's own schema language can't express, so it's written directly as SQL in the migration file in the repo instead of `schema.prisma`, to **both** databases:

```bash
npx prisma migrate deploy
DATABASE_URL="postgres://postgres:postgres@localhost:${DB_PORT}/onboarding_wizard_test?sslmode=disable" \
  npx prisma migrate deploy
```

(The first command uses `.env`'s `DATABASE_URL` automatically; the second overrides it inline to target the test database instead. `migrate deploy` applies whatever's in `prisma/migrations/` — including the hand-written partial index, since it's part of that migration file — and records it in a `_prisma_migrations` table, so this is genuinely tracked migration history rather than a one-off raw SQL run. `prisma migrate dev` still doesn't work cleanly against this particular bundled local server, since it needs to diff against a shadow database; `migrate deploy` doesn't need that step, so it works fine here.)

Then generate the Prisma database client (the typed code the backend actually imports):

```bash
npx prisma generate
```

#### Step 6, Run the backend

Still inside `backend/`:

```bash
npm run dev
```

Leave this running too. It should print that it's listening on `http://localhost:4000`. You can sanity-check it's alive by opening that URL's `/health` route in a browser, or in a new terminal:

```bash
curl http://localhost:4000/health
```

#### Step 7, Run the frontend

In a **new terminal tab/window**, from the repo root:

```bash
cd frontend
npm install
npm run dev
```

This prints a local URL, open it in a browser (defaults to `http://localhost:5173`). No environment variables are needed here, the frontend talks to `http://localhost:4000` directly (hardcoded in `frontend/src/api/sessions.ts`), since this is a local exercise, not a deployed app.

At this point you should have three terminals running at once: `npx prisma dev` (Step 2), the backend (`npm run dev` in `backend/`), and the frontend (`npm run dev` in `frontend/`), plus the browser tab open to the frontend's URL.

**Optional: inspect the database.** From `backend/`, in another terminal:

```bash
npx prisma studio
```

This opens a browser-based table viewer against whatever `DATABASE_URL` is currently set to (the dev database, `onboarding_wizard`, if run without an override). It picks its own available port and prints the URL to open, so watch the terminal output rather than assuming a fixed address. Useful for watching `OnboardingSession`/`ValidationAttempt` rows change as you go through the wizard, without writing any SQL by hand.

Studio isn't fully reliable against this project's bundled local `prisma dev` server on every machine (it's a lightweight reimplementation of Postgres, not the real thing, and Studio's schema introspection can fail against it even when the data itself is fine). If Studio shows an error or "No tables found" instead of your data, use these instead — they query the same database directly and print every column for every row, e.g. to visually confirm a duplicate/double-click didn't create an extra row:

```bash
npm run db:sessions   # all OnboardingSession rows, every column
npm run db:attempts   # all ValidationAttempt rows, every column
```

#### Running the tests (macOS / Linux)

In two more terminal tabs (or one at a time, these don't need to stay running):

```bash
cd backend && npm run test    # uses the onboarding_wizard_test database from Step 3
cd frontend && npm run test
```

---

### Windows

Every command below is meant to be copy-pasted in order into **PowerShell** (search "PowerShell" in the Start menu, the version that ships with Windows 10/11 is enough, nothing extra to install for the shell itself).

#### Step 1, Install Node.js

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

#### Step 2, Start the local database

From the repo root, move into the backend folder and install its dependencies (this also installs the Prisma CLI used in every step below, via `npx`):

```powershell
cd backend
npm install
```

Start Prisma's built-in local Postgres-compatible server, giving it an explicit, memorable name (`--name`) so it doesn't share the generic `default` slot with any other Prisma-based project you might have on this machine. **Leave this running**, open a new PowerShell window for every step after this one, and don't close this one while you're working on the project:

```powershell
npx prisma dev --name onboarding-wizard
```

It prints a line like `postgres://postgres:postgres@localhost:PORT/template1?sslmode=disable` — note the port number. It's assigned automatically the first time this named server is created and is **not guaranteed to be the same on every machine**, so the exact value matters for the next few steps (a second, lightweight instance one port higher is used internally as a migration "shadow" database, see `prisma.config.ts`, no action needed for that one).

#### Step 3, Create the two databases

In a **new PowerShell window**, `cd` back into `backend/`. Save the port Step 2 printed as a variable — replace `51214` below with whatever you actually saw (or run `npx prisma dev ls` in this window if you need to look it up again):

```powershell
cd backend
$env:DB_PORT = "51214"   # replace with the port from Step 2
```

Then create the two databases this project uses, one for normal use, one dedicated to the test suite, kept separate so running tests never touches your real data:

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:$env:DB_PORT/template1?sslmode=disable"
"CREATE DATABASE onboarding_wizard;" | npx prisma db execute --stdin
"CREATE DATABASE onboarding_wizard_test;" | npx prisma db execute --stdin
```

Each should print `Script executed successfully.` (These commands connect to Postgres's own always-present `template1` database just long enough to create the two new ones, this is what avoids needing a separate database client like `psql` installed. `$env:DATABASE_URL` stays set for the rest of *this* PowerShell window, which Step 5 below accounts for; `$env:DB_PORT` stays set too, so later steps in this same window can keep reusing it.)

#### Step 4, Configure environment variables

Create two small text files that tell the app where to find those databases (still inside `backend/`, same window, so `$env:DB_PORT` is still set), no text editor needed:

```powershell
Set-Content -Path .env -Value "DATABASE_URL=`"postgres://postgres:postgres@localhost:$env:DB_PORT/onboarding_wizard?sslmode=disable`""
Set-Content -Path .env.test -Value "DATABASE_URL=`"postgres://postgres:postgres@localhost:$env:DB_PORT/onboarding_wizard_test?sslmode=disable`""
```

(These two files are intentionally excluded from version control, `.env*` in `backend/.gitignore`, since env files are where secrets/credentials normally go, even though these particular values are just local dev defaults.)

#### Step 5, Create the database tables

Apply the schema, including one hand-written partial unique index (`ValidationAttempt_sessionId_pending_key`, `WHERE status = 'PENDING'`) that Prisma's own schema language can't express, so it's written directly as SQL in the migration file in the repo instead of `schema.prisma`, to **both** databases. Set `$env:DATABASE_URL` explicitly before each call rather than relying on `.env` here, since PowerShell keeps environment variables set for the rest of the window (unlike a one-off prefix in bash), Step 3 already left it pointed at `template1`:

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:$env:DB_PORT/onboarding_wizard?sslmode=disable"
npx prisma migrate deploy

$env:DATABASE_URL = "postgres://postgres:postgres@localhost:$env:DB_PORT/onboarding_wizard_test?sslmode=disable"
npx prisma migrate deploy
```

(`migrate deploy` applies whatever's in `prisma/migrations/`, including the hand-written partial index since it's part of that migration file, and records it in a `_prisma_migrations` table, so this is genuinely tracked migration history rather than a one-off raw SQL run. `prisma migrate dev` still doesn't work cleanly against this particular bundled local server, since it needs to diff against a shadow database; `migrate deploy` doesn't need that step, so it works fine here.)

Then clear the override (important, otherwise it would leak into the backend's own `.env` loading in Step 6 and point it at the test database instead) and generate the Prisma database client:

```powershell
Remove-Item Env:DATABASE_URL
npx prisma generate
```

#### Step 6, Run the backend

Still inside `backend/`, in the same window is fine now that `DATABASE_URL` has been cleared:

```powershell
npm run dev
```

Leave this running too. It should print that it's listening on `http://localhost:4000`. You can sanity-check it's alive by opening that URL's `/health` route in a browser, or in a new PowerShell window:

```powershell
curl http://localhost:4000/health
```

#### Step 7, Run the frontend

In a **new PowerShell window**, from the repo root:

```powershell
cd frontend
npm install
npm run dev
```

This prints a local URL, open it in a browser (defaults to `http://localhost:5173`). No environment variables are needed here, the frontend talks to `http://localhost:4000` directly (hardcoded in `frontend/src/api/sessions.ts`), since this is a local exercise, not a deployed app.

At this point you should have three PowerShell windows running at once: `npx prisma dev` (Step 2), the backend (`npm run dev` in `backend/`), and the frontend (`npm run dev` in `frontend/`), plus the browser tab open to the frontend's URL.

**Optional: inspect the database.** From `backend/`, in another PowerShell window:

```powershell
npx prisma studio
```

This opens a browser-based table viewer against whatever `DATABASE_URL` is currently set to (the dev database, `onboarding_wizard`, if run without an override). It picks its own available port and prints the URL to open, so watch the terminal output rather than assuming a fixed address. Useful for watching `OnboardingSession`/`ValidationAttempt` rows change as you go through the wizard, without writing any SQL by hand.

**Studio does not reliably work on Windows against this project's bundled local `prisma dev` server** — it's a lightweight reimplementation of Postgres, not the real thing, and Studio's schema introspection can fail (`Could not load schema metadata`, or a false "No tables found") even when the data itself is completely fine. If that happens, use these instead — they query the same database directly and print every column for every row, e.g. to visually confirm a duplicate/double-click didn't create an extra row:

```powershell
npm run db:sessions   # all OnboardingSession rows, every column
npm run db:attempts   # all ValidationAttempt rows, every column
```

#### Running the tests (Windows)

In two more PowerShell windows (or one at a time, these don't need to stay running):

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

## Triggering each validation outcome

There's no real external Provider — the "Api Key" field entered on Step 1 (Details) is read by a mock Provider (`backend/src/services/mockProvider.ts`) that decides what Step 2 (Validate) resolves to, based on the exact value entered. Use one of these to see each outcome:

| Api Key you enter | Resulting status | What you'll see on Step 2 |
| --- | --- | --- |
| `key_valid` | VALID | Green success banner, listing the items found |
| `key_partial` | PARTIAL | Yellow warning banner, items found plus a warning |
| `key_invalid` | INVALID | Red error banner, with a rejection reason |
| `key_unavailable` | UNAVAILABLE | Grey/neutral banner, noting it's transient and safe to retry |
| anything else | VALID | Same as `key_valid` — a convenience default so you don't have to remember an exact key just to click through the wizard |

The outcome isn't instant — landing on Step 2 (or clicking Retry) shows a "Validating..." pending banner for about 5 simulated seconds before resolving, the same as it would waiting on a real external call.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/sessions` | Create a new session |
| GET | `/sessions/:id` | Fetch a session (404 if not found) |
| POST | `/sessions/:id/details` | Submit Step 1, advances to VALIDATE |
| POST | `/sessions/:id/validate` | Trigger/retry validation |
| GET | `/sessions/:id/validation` | Poll the latest validation attempt |
| POST | `/sessions/:id/advance-to-review` | Advance to REVIEW (requires VALID/PARTIAL) |
| POST | `/sessions/:id/go-live` | Go live (requires REVIEW) |

## Key decisions & design decisions

The full back-and-forth on these — including where I first tried one
approach and changed it is in AI_LOG.md. Short version of the ones
that mattered most:

- **Two models, not one, and a session can have many validation attempts** 
OnboardingSession holds the wizard's current state
  (fields, current step, isLive). ValidationAttempt is its own table,
  one row per attempt, linked back by sessionId. Went with many
  attempts per session instead of one field that gets overwritten
  each time, mainly because each retry genuinely is a separate attempt,
  that's literally what it is, and keeping the history matters: if a
  partner tries invalid credentials, then retries and succeeds, both
  of those are real, distinct things that happened, not just one
  final answer. Overwriting a single field would lose that entirely.
  It also keeps each retry as its own independent row.  Didn't need a separate partner/user model since there's no
  auth, and didn't need a join table since it's a simple one-to-many.

 - **currentStep is a state machine, not just a status label or a Front End only state.**
  It only ever moves forward, DETAILS → VALIDATE → REVIEW, one
  direction, no way to jump ahead or skip a step. Every endpoint that
  advances it checks the session is actually in the expected prior
  state before moving it forward (the same guarded atomic update pattern used
  everywhere else), so the current step always reflects exactly how
  far the partner/user has actually gotten, not just what the frontend
  thinks happened. This is also what makes resuming after a reload
  work correctly, whatever's persisted in currentStep is the actual
  truth, so the wizard just reads it and picks up exactly where it
  left off.

- **currentStep and isLive are separate fields.** I could've added a   4th "COMPLETE" value to the step enum instead of a separate isLive boolean, but that means two different ways to represent "done" that could get out of sync with each other. Keeping them independent means that can't happen.

- **Idempotency comes from atomic guarded updates, not idempotency
  keys or locking rows.** Something like updateMany({ where: { id,
  currentStep: 'DETAILS' } }) already gives you a safe "only one of
  these calls wins" guarantee for free, since Postgres processes the
  check and the write as one atomic step. Idempotency keys are more
  for things like payments, where a client might retry the exact same
  logical action and you need to remember you've already seen it. Row
  locking is more for heavy write contention. Neither of those
  problems actually exists here — every step is just one conditional
  write so I went with the simplest tool that actually solves it.

- **Every step-advancing endpoint follows the same shape:** check the
  session exists, check any other requirement for that step, do the
  guarded update, read back the result. I didn't build them all
  identically from the start until I noticed the pattern once I had a
  couple of these built and went back to make the earlier one match.

- **POST instead of PATCH/PUT for step endpoints**, even though a lot
  of them are really just field updates underneath. These represent
  the partner submitting a step and moving the wizard forward, which
  felt more like an action than a plain resource edit and staying
  consistent across all of them mattered more to me than being
  technically precise about REST verbs for any one of them.

- **The validation result is stored as one JSON payload column**,
  not four separate typed columns. The four outcomes genuinely have
  different shapes (items vs. warnings vs. a rejection reason) so instead of creating extra fields for each and filling them based on the validation results, just decided to save the payload as a JSON that will then be verified and typed in both BE and FE.

- **Both the frontend and backend check the same rules** (like "can't
  advance past Validate unless it's VALID or PARTIAL"). The frontend
  check is just for a fast, responsive UI then the backend check is the
  one that actually matters, since someone could always call the API
  directly and skip the UI entirely. So the validations are done both in the FE and BE.

- **The buttons are deliberately never disabled while a request is in
  flight.** Step 1's Next, Step 2's Retry, Step 3's Go Live, none of
  them block a second click. That was on purpose, so a real double-
  click actually could reach the backend and prove the idempotency logic
  works, instead of the frontend quietly preventing the exact scenario
  I built the backend to handle.

- **Used a real test database instead of mocking Prisma.** A lot of
  what actually makes this correct lives in the database itself (a
  partial unique index, column defaults, unique updates), a mocked
  Prisma client wouldn't catch any of that, so testing against a mock
  would have given false confidence on exactly the stuff most worth
  testing.

- **Review fetches its own data instead of receiving it from Step 2
  as a prop.** Props don't survive a page reload, so if someone landed
  directly on Review after a refresh, there would be nothing to show even though the real data exists. Fetching it independently means it
  works no matter how they got there.

- **The API key on Step 1 is stored as plain text.** Fine here since
  it's a mock provider, flagging it rather than pretending that would be
  okay in a real system.

## What was deliberately deferred, and why

- **No stale-PENDING reconciliation.** The mock Provider resolves via
  an in-process 5-second setTimeout, not a real job/queue. If the
  server restarted mid-timer, that attempt would just stay PENDING
  forever, it wouldn't fix itself. Retry is always available though,
  so it's not a dead end, just not self healing. Didn't build the
  proper fix (a job queue, or a check that says "if it's been pending
  too long, mark it unavailable") since the simple timer already
  proves the real requirement, surviving a page reload or server restart.

- **No back-navigation.** Nothing in the requirements asked for going back to
  edit an earlier step. Not because it couldn't be made idempotent too
  it's more that going back opens up real questions, like what happens
  to an already-completed validation if someone changes their API key
  afterward, so it felt better to leave out entirely than answer
  halfway.

- **DetailsStep still pre-fills from saved data**, even though there's
  currently no way to actually see it since back-navigation doesn't
  exist. Left it in since it's harmless and it's the same pattern
  needed for other steps anyway.

- **No attempt numbering.** Every retry is just a new row, ordered by
  when it was created. Had this in an early schema draft and cut it,
  didn't add anything a created-at order doesn't already give.

- **No shared types between frontend and backend.** The frontend has
  its own types that just mirror the backend's. Fine at this size,
  would get annoying on a bigger project.

- **No auth or rate limiting.** The exercise said
  single trusted partner, no auth needed, so left them out, but
  worth naming since a real version of this couldn't go live without
  them.

- **No CI, deploy setup, or Docker.** Built and run entirely locally.

- **Barely any error handling in the UI for real failures.** If
  fetching a session fails for a real reason (not just a 404), the
  wizard just sits on its loading spinner. 

- **No real logging.** Just console.error and a plain error message,
  nothing structured.

## What I'd do with another day

- Fix the stuck-pending issue, if the server restarts while something's
  still pending, add a check so it doesn't just sit there forever, mark
  it unavailable after too long instead.
- Set up a shared types package so the frontend isn't manually copying
  the backend's response shapes by hand.
- Add CI so typechecking and tests run automatically on every push,
  instead of only when I remember to run them locally.
- Improve the error states in the UI, right now a failed session fetch
  doesn't show the user anything useful or a way to retry.
- Add real logging instead of just console.error, something actually
  useful in production.
- If this were a real product, back-navigation and real auth would
  need proper thought instead of just being added in quickly. Auth
  especially, right now anyone with a session ID can call any endpoint
  for it, there's no logged in user/token concept at all. Adding it means
  figuring out how a user relates to a session and adding an role/permission
  check to every endpoint, on top of the state-machine work already
  there.
- Spend time on the actual look of the UI, it's functional but pretty
  simple right now, spacing, layout, and general polish could all use
  another pass.
- Overall, go back through both sides looking for general improvements
  and clean up anything unused left over from earlier iterations.

## Why this stack

React and Node are the stack I feel most comfortable with, and they provided everything I needed for this exercise.

- **Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma
- **Frontend:** React, TypeScript, Vite, MUI, TanStack Query, React Router
- **Testing:** Vitest, React Testing Library, Supertest
