# Backend Integration Notes

**Date:** 2026-04-25  
**Investigation scope:** `/Users/meghanreilly/bunq-hackathon-backend/`  
**Purpose:** Understand the real backend before wiring up `src/api/client.ts`

---

## 1. The actual backend — not what we assumed

There are **two separate backends** in the repo. The Django backend (`django-backend/`) is
an earlier prototype — it has auth (login/register) and a monetary-accounts proxy, but no
sessions or split logic. **It is not the primary backend.**

The running backend is three separate processes:

| Process | Port | Purpose |
|---|---|---|
| `bunq-api` (FastAPI) | **8000** | Direct bunq SDK wrapper — payments, request inquiries, accounts, users |
| `mcp-client` (FastAPI) | **8001** | Natural-language query endpoint; spawns Claude + MCP tools |
| `mcp-server` (stdio) | — | MCP tool definitions; auto-started by mcp-client |

Started with `just all` from the repo root, or individually via `just bunq-api` / `just mcp-client`.

---

## 2. Auth scheme

### bunq-api (port 8000)
**No auth at all.** The server loads a `bunq_api_context.conf` file at startup (generated once via
`uv run src/bunq_api/main.py` using a `BUNQ_API_KEY` from `bunq-api/.env`). Every request
is authenticated as that single bunq API key holder. There are no user accounts, no tokens,
no cookies. Any client that can reach port 8000 is fully authorized.

### mcp-client (port 8001)
**No auth at all.** One endpoint: `POST /query` with `{ "query": string }`. CORS wide open
(`allow_origins=["*"]`). Requires an `ANTHROPIC_API_KEY` in `mcp-client/.env`.

### Django backend (port unknown)
Cookie-based JWT via custom `CookieJWTAuthentication`:
- Reads `request.COOKIES.get('access_token')` — NOT an Authorization header
- Cookie is HttpOnly, Secure=True, SameSite=None (requires HTTPS even locally)
- Login: `POST /api/auth/login/` with `{ email, password }` → sets `access_token` and
  `refresh_token` HttpOnly cookies → returns `{ message, username }`
- Register: `POST /api/auth/register/` with `{ email, password }` → creates bunq sandbox user
- CORS: `django-cors-headers` installed but **no `CORS_ALLOWED_ORIGINS`** in settings.py
  — all cross-origin requests will be blocked

**Action for `api/client.ts`:** Target the FastAPI servers, not Django. Remove the
`getAuthToken()` / Authorization header placeholder entirely. Use plain `fetch` with no
credentials; both servers are wide open.

---

## 3. API surface — endpoints that exist today

### bunq-api (port 8000)

```
GET  /payments               List payments (real + mock from mockdata/payments.json)
POST /payments               Create a payment
GET  /payments/{id}          Get single payment

GET  /request_inqs           List request inquiries (real only — mock commented out)
POST /request_inqs           Create a request inquiry
GET  /request_inqs/{id}      Get single request inquiry

GET  /monetary-accounts      List monetary accounts
GET  /monetary-accounts/{id} Get single account

GET  /users                  List users
GET  /users/me               Current user (person associated with the API key)
```

### mcp-client (port 8001)

```
POST /query    { "query": string } → { "response": string }
```

The response is plain prose from Claude — not structured JSON.

### What does NOT exist

- No sessions/split-history endpoint anywhere
- No receipt OCR endpoint
- No contacts/friends list endpoint
- No STT/voice transcription endpoint
- No structured split-creation endpoint (only exists via MCP natural-language path)

---

## 4. Data shapes

### Payment object (from bunq SDK, `_`-prefixed fields)

```ts
interface BunqPayment {
  _id_: number;
  _created: string;                // ISO datetime "2024-01-15 14:22:00.123456"
  _amount: { _value: string; _currency: string };  // e.g. { _value: "47.80", _currency: "EUR" }
  _description: string;
  _counterparty_alias: {
    label_monetary_account: {
      _display_name: string;
      _iban: string;
    };
  };
}
```

### Request inquiry object

```ts
interface BunqRequestInquiry {
  _id_: number;
  _created: string;
  _amount_inquired: { _value: string; _currency: string };
  _status: string;    // bunq status — likely "PENDING", "ACCEPTED", "REJECTED"
  _description: string;
  _counterparty_alias: {
    label_monetary_account: {
      _display_name: string;
    };
  };
}
```

### POST /request_inqs payload

```ts
{
  amount: string;             // "10.00" (decimal string)
  currency: string;           // "EUR"
  counterparty_alias: string; // IBAN, email, or phone number
  counterparty_type: string;  // "EMAIL" | "IBAN" | "PHONE_NUMBER"
  description: string;
}
```

### POST /query payload and response

```ts
// Request
{ query: string }

// Response — NOT structured JSON
{ response: string }  // prose paragraph(s) from Claude
```

---

## 5. The split flow — how it actually works

There is no dedicated split endpoint. The MCP server has a `split_receipt_by_names` tool
that Claude calls when asked. The full flow:

1. **Frontend** calls `POST http://localhost:8001/query` with a natural-language query
   like: `"Split €47.80 from Café de Jaren: Tom had bitterballen (€12.50) and a Heineken
   (€8.00), Anna had the burger (€14.50), we all split the tosti (€12.80)"`

2. **mcp-client** passes the query to Claude (Anthropic API, model not specified in code)

3. **Claude** calls the `split_receipt_by_names` MCP tool with:
   ```python
   recipient_names=["tom", "anna"]
   recipient_splits=[
     UserSplit(name="tom", total=20.50, currency="EUR", description="bitterballen, heineken, tosti/3"),
     UserSplit(name="anna", total=18.77, currency="EUR", description="burger, tosti/3"),
   ]
   receipt=Receipt(currency="EUR", items=[...])
   ```

4. **`split_receipt_by_names`** tool:
   - Fetches `GET /payments` to find each recipient's IBAN from payment history
   - If a name isn't in payment history, returns an error string for that person
   - Calls `create_request_inquiry` (not payment — a money-request) for each found person
   - Returns a string summary of what was created

5. **Frontend** receives `{ response: "I've sent payment requests to Tom (€20.50) and Anna (€18.77)..." }`
   — just a string, no IDs or structured data to display

**Critical implications:**
- Recipient resolution depends on payment history. If "Tom" has never sent/received money
  with this bunq account, the split will silently fail for that person.
- The response is prose. There's no way to extract created request IDs to display status.
- There is no split session stored — no history to query later.
- The even-split and specify-split flows in the frontend both map to the same MCP query path,
  just with different natural-language phrasing.

---

## 6. What the frontend currently assumes vs. reality

| Assumption in `api/client.ts` | Reality |
|---|---|
| `POST /api/sessions/` creates a split session | No sessions endpoint exists |
| `GET /api/sessions/` returns split history | No sessions endpoint exists |
| `GET /api/sessions/{id}/` returns session detail | No sessions endpoint exists |
| Backend has a contacts/friends endpoint | No contacts endpoint exists |
| Auth via JWT Bearer header | bunq-api has NO auth |
| Django backend is the target | Django backend has no split logic |
| `POST /api/voice/transcribe` for STT | No STT endpoint exists |
| `POST /api/voice/parse` for LLM parsing | No parsing endpoint exists |
| Request body uses `participant_emails` | MCP takes natural-language query string |
| Amounts in structured JSON | MCP takes decimal strings in prose |

---

## 7. What to wire up and what stays mock

### Wire up for the demo

**`GET /payments` → replaces `getSessions()` mock**  
Payments from bunq are the nearest equivalent to "split history". Filter for incoming
request inquiries using `/request_inqs` instead. These are the money-requests sent to others
— that's the split record we have.

```ts
// api/client.ts with USE_REAL_API
export async function getSessions(): Promise<PendingSplit[]> {
  const inqs = await apiFetch<BunqRequestInquiry[]>('http://localhost:8000/request_inqs');
  return inqs.map(adaptRequestInquiryToPendingSplit);
}
```

**`POST /query` → replaces `createSplitRequest()` mock**  
Build a natural-language query from the split parameters and POST to mcp-client.

```ts
export async function createSplitRequest(payload, participantEmails, items, assignments) {
  const query = buildSplitQuery(payload, participantEmails, items, assignments);
  const result = await apiFetch<{ response: string }>('http://localhost:8001/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  return { id: 'mcp-' + Date.now(), mcpResponse: result.response };
}
```

**`GET /users/me` → replaces `mockUser`**  
Returns the bunq UserPerson object — has name, email alias, IBAN. Use this to populate
the current user context instead of the hardcoded mock.

### Keep as mock

- `getContacts()` — no contacts endpoint. Keep mock. IBAN resolution happens inside MCP
  tool by name-matching against payment history; the frontend contact list is UI-only.
- `transcribeAudio()` — no STT endpoint. Keep mock.
- `parseSplitFromTranscript()` — this logic lives inside MCP. For voice path: compose
  the transcript directly into the `/query` payload instead of calling a separate parse step.
  Keep frontend mock for the demo, replace by routing voice transcript to `/query`.
- `getSessionDetail()` — no detail endpoint. Keep mock or derive from `/request_inqs/{id}`.
- `getCurrentTransaction()` — no transactions endpoint. Keep mock (this is from the bunq
  payment list displayed on HomeScreen; could wire to `GET /payments` later).

---

## 8. Summary of blockers and action items

### Blockers

1. **No sessions history API.** The only split record is in bunq request inquiries
   (`/request_inqs`). There is no merchant name, no items, no note in that data — just
   amount, status, counterparty name. The "Activity" tab split history will be sparse.

2. **MCP response is unstructured prose.** After a split is created, there's no structured
   confirmation (no IDs, no per-person status). The confirm screen can show the prose
   response but can't link to a detail view.

3. **Recipient resolution requires payment history.** Demo contacts must have prior
   payment history with the bunq account used for the API key. If demoing with fresh mock
   contacts, the MCP tool will fail to find their IBANs and silently skip them.

4. **No STT / receipt OCR backends.** Voice and photo flows are entirely mock.

### Quick wins for demo

- Wire `GET /users/me` to show real user name in the header (one-line change in mockUser)
- Wire `GET /payments` to HomeScreen transactions (minimal adapter needed)
- Wire `POST /query` to the confirm screen — at minimum, send the query and show `response`
  in a success state, even if structured data is unavailable
- On the even-split confirm screen, build the query as:
  `"Split €{amount} from {merchant} between {names list} evenly"` and POST to `/query`
- On the specify-split confirm screen, build itemized query and POST to `/query`

### Env vars to add to `.env` (frontend)

```
EXPO_PUBLIC_USE_REAL_API=true
EXPO_PUBLIC_API_BASE=http://localhost:8000
EXPO_PUBLIC_MCP_BASE=http://localhost:8001
```

The `API_BASE` in `api/client.ts` points at Django (`/api/...`) — split this into two
base URLs since bunq-api and mcp-client are separate servers.
