# Audit Findings — bunq Hackathon Frontend

> Pass 1 complete. Do NOT make code changes until the user approves findings.

---

## BLOCKER

### B1 — `ReceiptUploadScreen.processImage` has no try/catch → infinite spinner
**File:** `src/screens/ReceiptUploadScreen.tsx:55–67`

`processImage` sets `scanning = true` + `scanPhase = 'scanning'` before calling
`api.parseReceipt(uri)`, but has no try/catch around it. If `parseReceipt` throws
(network error, real API enabled), `setScanning(false)` and `setScanPhase('assign_mode_chooser')`
are never called. The spinner runs forever with no recovery path.

Secondary issue on the same screen: `processImage(result.assets[0].uri)` is called without
`await` at lines 83 and 99, so the unhandled promise rejection is silently discarded by React
Native. Both issues together make failure invisible and unrecoverable.

**Fix:** wrap `processImage` body in `try/catch`, call `setScanning(false)` + show error in catch.
Add `await` at both call sites (or keep them fire-and-forget but add internal error handling).

---

### B2 — `ActivityScreen` is a placeholder — judge sees a blank tab
**File:** `src/screens/ActivityScreen.tsx`

The entire file renders only `<Text>Activity</Text>`. Tapping the "Activity" tab shows a white
screen with a single word. There is no loading state, empty state, or "coming soon" copy.

**Fix:** Add meaningful content or at minimum a styled empty-state card so the screen looks
intentional.

---

### B3 — `EvenSplitConfirmScreen.handleSubmit` silently swallows errors
**File:** `src/screens/EvenSplitConfirmScreen.tsx:107–132`

```ts
try {
  await api.createSplitRequest(...)
  setSuccess(true);
} finally {          // ← no catch
  setSubmitting(false);
}
```

If `createSplitRequest` throws, the spinner stops and nothing else happens — no alert, no error
state. The user is left on the confirm screen with no indication that the request failed.

**Fix:** Add a `catch` block that shows an Alert or sets an error state.

---

### B4 — "Connected" status dot is always green regardless of reality
**File:** `src/screens/HomeScreen.tsx:66–69`

The status indicator is hardcoded:
```tsx
<View style={styles.statusDot} />   {/* always green */}
<Text style={styles.statusText}>Connected</Text>
```

No health check is performed. If the backend is down on demo day, the app will still display
"Connected" to judges.

**Fix:** Remove the indicator entirely, or replace with a real health-check ping (e.g., `GET /`
on mount with a 3s timeout that flips state to "Offline").

---

## HIGH

### H1 — Login/register env var mismatch — auth always hits `undefined` as base URL
**Files:** `src/api/index.ts:2`, `.env`

`api/index.ts` reads `process.env.EXPO_PUBLIC_API_BASE_URL`, but `.env` only defines
`EXPO_PUBLIC_API_BASE`. The axios instance gets `baseURL: undefined`. Every login and
register request targets `undefined/auth/login/` — a guaranteed network error on a physical
device.

**Fix:** Rename to `EXPO_PUBLIC_API_BASE_URL` in `.env` and `.env.example`, or change
`api/index.ts` to read `EXPO_PUBLIC_API_BASE`.

---

### H2 — `loginUser` / `registerUser` are not gated by `USE_REAL_API`
**File:** `src/api/client.ts:39–47`

Every other data operation (`getSessions`, `getContacts`, etc.) checks `USE_REAL_API` and falls
back to mocks. `loginUser` and `registerUser` unconditionally call the live axios instance.
With `USE_REAL_API=false` in `.env`, all data flows use mocks except auth, which fails.

**Fix:** Add mock login/register paths behind the flag, or move the auth functions out of `client.ts`
and document them as always-live.

---

### H3 — `stt.ts` logs Groq API key details at module level, not in `__DEV__`
**File:** `src/services/stt.ts:4–5`

```ts
console.log('[stt] api key present:', !!process.env.EXPO_PUBLIC_GROQ_API_KEY);
console.log('[stt] api key length:', process.env.EXPO_PUBLIC_GROQ_API_KEY?.length);
```

These fire on every import in every build, including production. The key length is not the key
itself, but confirming presence + length is a minor signal to anyone reading device logs.

**Fix:** Wrap in `if (__DEV__)`.

---

### H4 — `HomeScreen` `getSessions()` failure is silent
**File:** `src/screens/HomeScreen.tsx:31–35`

```ts
api.getSessions()
  .then(setPendingSplits)
  .finally(() => setSplitsLoading(false));
```

No `.catch()`. If `getSessions` rejects, `pendingSplits` stays `[]` and `splitsLoading` becomes
`false`, rendering an empty list with no error message. The user (or judge) can't tell whether
there are genuinely no pending splits or whether a fetch failed.

**Fix:** Add `.catch(() => { /* set error state or show toast */ })`.

---

### H5 — Token refresh endpoint doesn't exist on the real backend
**File:** `src/api/index.ts:55`

The 401 refresh interceptor calls `accounts/token/refresh/` — a Django URL. The real backend
is FastAPI and has no such endpoint. Any 401 from the real API triggers a refresh call that
will 404, then re-rejects, leaving the user stuck.

**Fix:** Remove the refresh interceptor until the backend exposes a compatible refresh endpoint,
or confirm the actual refresh path with the backend team.

---

## MEDIUM

### M1 — Nine unguarded `console.log` calls in `api/index.ts` interceptors
**File:** `src/api/index.ts:4, 12–15, 19–36`

Every request logs method + full URL + serialized request body. Every response logs status.
Every error logs status, headers, full response body as JSON, and the complete error object.
None of these are wrapped in `__DEV__`. In a production build, sensitive payload data and
response bodies are emitted to the system log.

**Fix:** Wrap all interceptor log calls in `if (__DEV__)`.

---

### M2 — `processImage` called without `await` — async errors are silently discarded
**File:** `src/screens/ReceiptUploadScreen.tsx:83, 99`

```ts
processImage(result.assets[0].uri);   // no await, no .catch()
```

`processImage` is `async`, so a thrown error becomes an unhandled promise rejection that React
Native silently discards. Combined with B1 (no internal try/catch), no error surface exists at all.

**Fix:** Either `await processImage(...)` inside the caller and add a try/catch, or handle the
error internally in `processImage` (preferred since the callers are event handlers).

---

### M3 — `decimalStringToCents` returns `NaN` for invalid strings
**File:** `src/lib/adapters.ts` (inside `adaptSessionDetailToPendingSplit`)

The parser converts `"47.80"` → `4780` correctly but has no guard for empty strings, `null`,
or non-numeric values. `parseFloat("") * 100` → `NaN`, which flows silently into amount fields
and renders as `"€NaN"` if the backend ever returns an unexpected format.

**Fix:** Add `|| 0` fallback: `Math.round((parseFloat(str) || 0) * 100)`.

---

## LOW

### L1 — Unguarded `console.log` in `HomeScreen.handleLongPressTransaction`
**File:** `src/screens/HomeScreen.tsx:44–46`

```ts
console.log('Voice split triggered for transaction:', transaction.id);
```

Not in `__DEV__`. Minor, but leftover debug call.

---

### L2 — Unguarded `console.log("Registration error:", err)` in RegisterPage
**File:** `src/screens/RegisterPage.tsx:41`

Logs the full error object on every registration failure. Not in `__DEV__`.

---

### L3 — `ImagePicker.MediaTypeOptions.Images` deprecated in SDK 54
**Files:** `src/screens/ReceiptUploadScreen.tsx:79, 95`

`ImagePicker.MediaTypeOptions` is deprecated in Expo SDK 54. Produces a console warning on
every photo picker invocation. Harmless today but will break in a future SDK.

**Fix (low urgency):** Replace with `ImagePicker.MediaType.Images`.

---

### L4 — `localhost` fallback in `client.ts` — physical device will miss if `.env` not loaded
**File:** `src/api/client.ts:22`

```ts
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000';
```

If `.env` is not present at build time (e.g., fresh checkout, CI), all API calls on a physical
device silently target `localhost`, which is unreachable. No warning is shown.

**Fix (informational):** Add a startup assertion `if (!process.env.EXPO_PUBLIC_API_BASE) console.warn(...)`, or document the `.env` requirement prominently.

---

### L5 — Multiple `// TODO: CONFIRM-BACKEND` comments still in production code
**File:** `src/api/client.ts:98, 108, 114, 127, 136`

Five TODOs noting unconfirmed backend contract. These are fine during development but should
be resolved or removed before a public demo.

---

## Summary table

| ID | Severity | Area | One-line description |
|----|----------|------|----------------------|
| B1 | BLOCKER | ReceiptUpload | No try/catch → infinite scanner spinner on parse error |
| B2 | BLOCKER | ActivityScreen | Placeholder renders blank tab for judges |
| B3 | BLOCKER | EvenSplitConfirm | Submit error silently swallowed — no user feedback |
| B4 | BLOCKER | HomeScreen | "Connected" always green regardless of backend state |
| H1 | HIGH | Auth | Env var mismatch → login/register hit `undefined` base URL |
| H2 | HIGH | Auth | loginUser/registerUser ignore `USE_REAL_API` flag |
| H3 | HIGH | STT | Groq key metadata logged at module level, not in `__DEV__` |
| H4 | HIGH | HomeScreen | getSessions failure silent → empty list, no error copy |
| H5 | HIGH | Auth | Token refresh targets Django URL that doesn't exist on FastAPI |
| M1 | MEDIUM | Networking | 9 unguarded console.logs in api/index.ts interceptors |
| M2 | MEDIUM | ReceiptUpload | processImage called without await → errors discarded |
| M3 | MEDIUM | Adapters | decimalStringToCents returns NaN for invalid strings |
| L1 | LOW | HomeScreen | Stray console.log in handleLongPressTransaction |
| L2 | LOW | RegisterPage | Unguarded console.log("Registration error:", err) |
| L3 | LOW | ImagePicker | Deprecated MediaTypeOptions.Images in SDK 54 |
| L4 | LOW | Config | localhost fallback silently breaks physical device on missing .env |
| L5 | LOW | Code hygiene | 5 unresolved TODO: CONFIRM-BACKEND comments in client.ts |
