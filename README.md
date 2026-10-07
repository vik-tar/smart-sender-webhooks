# Smart Sender — Webhooks

Test assignment: sign in, webhooks list with search and paging, webhook editing. React 19 + TypeScript (strict), Vite, TanStack Query, React Router, react-hook-form + zod, API mocked with MSW. The mock *is* the backend, so it runs in every mode, including `preview`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # all tests
npx vitest run src/api/client.test.ts -t "two parallel"   # the required test only
```

Also: `npm run typecheck`, `npm run lint`, `npm run build && npm run preview`.

**Test credentials:** `demo@smartsender.dev` / `password123`

## Key decisions

- **Layers: UI → state → `api/`.** Pages and components use TanStack Query and `SessionProvider`, which call `api/`. `api/` knows nothing about React; `pages/` holds the routes, `features/webhooks/` their building blocks.
- **All transport logic lives in `createApiClient`.** It handles headers, CSRF, 419 and 401. Endpoint functions stay a thin typed map of the contract. Its tests run in Node against the real mock handlers.
- **401 → one shared rotate.** Concurrent 401s await the same rotate promise, and a request started during a rotate waits for it. A *generation counter* covers a 401 that arrives after the rotate already finished: that request just retries. A failed rotate or a second 401 sets an `expired` flag, so `onSessionExpired` fires once and late 401s fail fast without new rotates.
- **URL is the source of truth for the list.** Page and search are parsed tolerantly: garbage means page 1. Search commits after a 300 ms pause, on Enter or on blur. One typing session is one history entry (the first commit pushes, later ones replace), so Back goes to the previous search, not to half a word. After re-login, `state.from` returns the user to the same URL.
- **Responses are checked against zod schemas** in `api/schemas.ts`, and the contract types are inferred from the same schemas. A body that breaks the contract fails right in the client with `InvalidResponseError`, not somewhere deep in the UI.
- **TanStack Query never retries `ApiError`:** 401/404/422 are answers, not glitches. The list keeps the previous page on screen while the next one loads, and a save updates the detail cache and invalidates the lists.
- **Forms: react-hook-form + zod, the server has the final say.** The schemas mirror the server's rules and messages, so obvious mistakes are caught without a request. A 422 still lands under its field through `setError`, and focus moves to the first invalid field.
- **zod and react-hook-form are more than this app needs.** Two forms with two fields each would be fine on `useState`. They are here because they are the standard choice once the app grows: more forms, a bigger contract.

## Known limitations

- A reload requires signing in again, because the mock's state lives in memory (the spec allows this). URL params still apply after login.
- Only the API layer and pure helpers are tested; the UI flows were checked manually.
- The mock follows the contract literally: the CSRF token is fixed and rotate has no refresh window. The client already handles the real-world cases: it refetches the CSRF token on 419, and a failed rotate sends the user to the login screen.
