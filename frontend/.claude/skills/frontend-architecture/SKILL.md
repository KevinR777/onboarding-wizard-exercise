---
name: frontend-architecture
description: This project's React component/hook architecture conventions. Use whenever creating or editing a page/component (.tsx) file, or adding a new API call (query/mutation) under frontend/src — before writing the component, decide where state/logic and the API call each belong per the rules below.
---

# Frontend architecture conventions

Five rules, applied to every new component and API call in this project.

## Rule 1 — Components render only, logic lives in a hook

Every page/component file (`ComponentName.tsx`) contains only JSX and prop destructuring — no `useState`, `useEffect`, data fetching, or business logic. All of that lives in a co-located hook file (`useComponentName.ts`, same folder) that returns whatever the component needs to render (values, handlers, loading/error states).

**Exception:** skip the hook file for components with zero state, effects, or handlers — pure presentational components can stay as a single file.

**In this project**, each page gets its own directory:
```
pages/LandingPage/LandingPage.tsx     — renders, calls useLandingPage()
pages/LandingPage/useLandingPage.ts   — owns state, navigation, calls service hooks
```

## Rule 2 — One hook per API endpoint, in `services/`

Every API call (query or mutation) lives in its own dedicated hook in `frontend/src/services/`, separate from component logic hooks — never defined inline inside a `useComponentName` hook. Name each hook for what it does:
```
services/useCreateSession.ts    — wraps POST /sessions
services/useGetSession.ts       — wraps GET /sessions/:id
services/useValidateSession.ts  — wraps POST /sessions/:id/validate
```

Component logic hooks import and call these rather than calling `useQuery`/`useMutation` directly. This keeps each API call independently testable and reusable across components.

`services/` hooks themselves call a raw fetch function from `frontend/src/api/<resource>.ts` (e.g. `services/useCreateSession.ts` wraps `createSession` from `api/sessions.ts` in a `useMutation`). The `api/` layer has no React/TanStack code — just fetch calls and response types — so the `useMutation`/`useQuery` wrapper is the only thing that changes when switching data-fetching libraries.

## Rule 3 — Hooks return handlers, not raw setters

Never return a raw `useState` setter (e.g. `setCompanyName`) from a hook for the component to call directly. Wrap it in a named handler the hook defines (e.g. `handleCompanyNameChange`) and return that instead. A setter is React's own function — there's nothing of yours to test, and the component would have to know how to pull the value out of the event itself. A handler is your function: it's independently testable, it's the one place to add logic later (trimming, validation, formatting) without ever touching the component, and the component never needs to know state is built with `useState` at all — it just calls the handler.

The handler takes whatever raw event the input gives it and does the extraction internally, so the component's JSX has zero inline logic:
```ts
// useDetailsStep.ts
const handleCompanyNameChange = (event: ChangeEvent<HTMLInputElement>) => {
  setCompanyName(event.target.value)
}
// returned as `handleCompanyNameChange`, not `setCompanyName`
```
```tsx
// DetailsStep.tsx
<TextField value={companyName} onChange={handleCompanyNameChange} />
```

## Rule 4 — Add `data-testid` where necessary

Add `data-testid` to elements a test would need to target: interactive elements (inputs, buttons — e.g. `data-testid="details-next-button"`) and anything that identifies which state/step/view is currently rendered (e.g. `data-testid="validate-step"` on a step placeholder, `data-testid="toast-alert"` on the toast). Don't add it reflexively to every element — purely structural/layout wrappers with nothing to assert on don't need one.

## Rule 5 — Mutation hooks expose `mutateAsync`; callers use `async`/`await` + `try`/`catch`

`services/` mutation hooks destructure `mutateAsync` from `useMutation` (aliased to the domain verb, e.g. `createSession`, `submitDetails`), never `mutate`. Callers write an `async` handler and `await` the call directly inside a `try`/`catch` — not `mutate(variables, { onSuccess, onError })`.

`try`/`catch` is the default because `mutateAsync` rethrows on failure, so `catch` is the direct, synchronous-looking way to react to "this call failed" (show a toast, don't advance, etc.) without a `useEffect` watching `isError`. `isError`/`error` from the hook are still there for anything driven by render itself (a persistent banner, disabling something reactively) — just not needed for a one-off failure side effect.
```ts
// services/useSubmitDetails.ts
export const useSubmitDetails = () => {
  const { mutateAsync: submitDetails, isPending, isError } = useMutation({ mutationFn: /* ... */ })
  return { submitDetails, isPending, isError }
}
```
```ts
// useDetailsStep.ts
const handleNext = async () => {
  if (!isValid) {
    showToast('Please fill in all fields before continuing.')
    return
  }
  try {
    await submitDetails({ sessionId, companyName, providerAccountId, providerApiKey })
    onNext()
  } catch {
    showToast('Failed to save details. Please try again.')
  }
}
```

## Full chain

```
ComponentName.tsx → useComponentName.ts → useApiThing.ts (services/) → apiThing.ts (api/)
```

Concrete example from this codebase:
```
pages/LandingPage/LandingPage.tsx
pages/LandingPage/useLandingPage.ts
services/useCreateSession.ts
api/sessions.ts
```
