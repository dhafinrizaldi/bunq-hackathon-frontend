import type { Transaction, Contact, SplitMode, ParsedReceipt, ParsedSplit, ReceiptItem, PendingSplit } from '../types/types';
import { transcribeAudio as realTranscribe } from '../services/stt';
import type { ApiSessionSummary, ApiSessionDetail } from '../types/api';
import { mockTransactions } from '../mocks/mockTransactions';
import { mockContacts } from '../mocks/mockContacts';
import { mockReceipts } from '../mocks/mockReceipts';
import { mockPendingSplits } from '../mocks/mockPendingSplits';
import { mockVoiceShouldFail, mockVoiceTranscripts } from '../mocks/mockVoiceData';
import { mockUser } from '../mocks/mockUser';
import {
  adaptSessionSummaryToPendingSplit,
  adaptSessionDetailToPendingSplit,
  adaptSplitRequestToApiPayload,
} from "../lib/adapters";
import axios from "axios";
import { api } from ".";

// ─── Feature flags ─────────────────────────────────────────────────
const USE_REAL_API = process.env.EXPO_PUBLIC_USE_REAL_API === 'true';
const USE_REAL_STT = process.env.EXPO_PUBLIC_USE_REAL_STT === 'true';
const USE_REAL_MCP = process.env.EXPO_PUBLIC_USE_REAL_MCP === 'true';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000';
const MCP_BASE = process.env.EXPO_PUBLIC_MCP_BASE ?? 'http://localhost:8001';

// ─── Auth ──────────────────────────────────────────────────────────
// TODO: CONFIRM-BACKEND Q1 — what's the auth scheme? Bearer token? Cookie?

type UserAuth = {
  email: string;
  password: string;
};



async function getAuthToken(): Promise<string | null> {
  return null;
}

export const loginUser = async (data: UserAuth) => {
  const resp = await api.post("auth/login/", data);
  return resp.data;
};

export const registerUser = async (data: UserAuth) => {
  const resp = await api.post("auth/register/", data);
  return resp.data;
};

// ─── Core fetch helper ─────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Exported request shape ────────────────────────────────────────
export interface SplitRequest {
  transactionId: string;
  mode: "even" | "specify";
  participants: Array<{
    contactId: string;
    amount: number;
    itemBreakdown?: Array<{ itemId: string; share: number }>;
  }>;
  note?: string;
  receiptImageUri?: string;
}

// ─── Sessions ─────────────────────────────────────────────────────

export async function getSessions(): Promise<PendingSplit[]> {
  if (!USE_REAL_API) return mockGetSessions();
  const data = await apiFetch<ApiSessionSummary[]>("/sessions/");
  return data.map(adaptSessionSummaryToPendingSplit);
}

export async function getSessionDetail(
  id: string,
  currentUserEmail: string = mockUser.email,
): Promise<PendingSplit> {
  if (!USE_REAL_API) return mockGetSessionDetail(id);
  const data = await apiFetch<ApiSessionDetail>(`/sessions/${id}/`);
  return adaptSessionDetailToPendingSplit(data, currentUserEmail);
}

// ─── Transactions ─────────────────────────────────────────────────

// TODO: CONFIRM-BACKEND — GET /api/transactions/:id
export async function getCurrentTransaction(id: string): Promise<Transaction> {
  await delay(300);
  const txn = mockTransactions.find((t) => t.id === id);
  if (!txn) throw new Error(`Transaction ${id} not found`);
  return txn;
}

// ─── Contacts ─────────────────────────────────────────────────────

// TODO: CONFIRM-BACKEND — GET /api/contacts
export async function getContacts(): Promise<Contact[]> {
  await delay(300);
  return [...mockContacts].sort((a, b) => a.name.localeCompare(b.name));
}

// TODO: CONFIRM-BACKEND — GET /api/contacts/nearby?lat=X&lng=Y
export async function getNearbyContacts(
  _lat: number,
  _lng: number,
): Promise<Contact[]> {
  await delay(300);
  return mockContacts.filter(
    (c) => c.distanceMeters !== undefined && c.distanceMeters < 500,
  );
}

// ─── Receipt OCR ─────────────────────────────────────────────────

// TODO: CONFIRM-BACKEND — POST /api/receipts/parse
// Backend will call OCR service (Veryfi, Mindee, or Google Vision).
export async function parseReceipt(_imageUri: string): Promise<ParsedReceipt> {
  await delay(300);
  return mockReceipts["Café de Jaren"] ?? mockReceipts["Default"];
}

// ─── Split creation ───────────────────────────────────────────────

// TODO: CONFIRM-BACKEND Q5 — confirm POST payload structure before wiring
// participantEmails: contactId (and mockUser.id for current user) → email
// items/assignments only needed for 'specify' mode (pass [] and {} for 'even')
export async function createSplitRequest(
  payload: SplitRequest,
  participantEmails: Record<string, string>,
  items: ReceiptItem[],
  assignments: Record<string, string[]>,
): Promise<{ id: string }> {
  if (!USE_REAL_API) return mockCreateSplitRequest(payload);
  const apiPayload = adaptSplitRequestToApiPayload(
    payload,
    participantEmails,
    items,
    assignments,
  );
  const data = await apiFetch<ApiSessionDetail>("/sessions/", {
    method: "POST",
    body: JSON.stringify(apiPayload),
  });
  return { id: String(data.id) };
}

// ─── Voice ────────────────────────────────────────────────────────

export interface ParseContext {
  mode: 'even' | 'specify';
  contacts: Contact[];
  items?: ReceiptItem[];
  currentUserId: string;
  merchantName?: string;
  totalAmount?: number; // cents
}

export async function transcribeAudio(uri: string): Promise<{ transcript: string }> {
  if (!USE_REAL_STT) {
    await delay(1200);
    return { transcript: mockVoiceTranscripts.specifyDefault };
  }
  const result = await realTranscribe(uri);
  return { transcript: result.transcript };
}

export async function parseSplitFromTranscript(
  transcript: string,
  context: ParseContext
): Promise<ParsedSplit | null> {
  if (!USE_REAL_MCP) return mockParseSplit(transcript, context);

  const query = buildMcpQuery(transcript, context);

  if (__DEV__) {
    console.log('[mcp] Sending query:', query);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  let res: Response;
  try {
    res = await fetch(`${MCP_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new Error('MCP query timed out after 45s — is the MCP server running?');
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`MCP query failed: ${res.status}`);
  }

  const data: { response: string } = await res.json();

  if (__DEV__) {
    console.log('[mcp] Response received:', data.response);
  }

  // MCP returns prose, not structured JSON. Return a ParsedSplit with empty assignments
  // so the review screen loads and the user can assign manually. rawResponse is preserved
  // for display in the "What the AI said" card.
  if (context.mode === 'even') {
    return {
      mode: 'even',
      participantIds: [context.currentUserId, ...context.contacts.map(c => c.id)],
      rawResponse: data.response,
      unparsedTranscript: transcript,
    };
  }
  return {
    mode: 'specify',
    assignments: {},
    rawResponse: data.response,
    unparsedTranscript: transcript,
  };
}

function buildMcpQuery(transcript: string, context: ParseContext): string {
  const merchant = context.merchantName ?? 'this transaction';
  const totalEur = context.totalAmount != null
    ? (context.totalAmount / 100).toFixed(2)
    : null;
  const names = context.contacts.map(c => c.name).join(', ');

  if (context.mode === 'even') {
    const amountPart = totalEur ? `€${totalEur} from ${merchant}` : merchant;
    return `Split ${amountPart} evenly between ${names}. ${transcript}`.trim();
  }

  const itemsList = context.items
    ?.map(i => `${i.name} (€${(i.price / 100).toFixed(2)})`)
    .join(', ') ?? '';
  const amountPart = totalEur ? `€${totalEur} from ${merchant}` : merchant;
  return [
    `Split ${amountPart}.`,
    itemsList ? `The receipt has: ${itemsList}.` : '',
    `The participants are: ${names}.`,
    `The user said: "${transcript}"`,
  ].filter(Boolean).join(' ');
}

// ─── Mock voice implementations ───────────────────────────────────

async function mockParseSplit(
  _transcript: string,
  context: ParseContext
): Promise<ParsedSplit | null> {
  await delay(800);
  if (mockVoiceShouldFail) return null;

  if (context.mode === "even") {
    const tom = context.contacts.find((c) =>
      c.name.toLowerCase().includes("tom"),
    );
    const anna = context.contacts.find((c) =>
      c.name.toLowerCase().includes("anna"),
    );
    const participantIds = [context.currentUserId];
    if (tom) participantIds.push(tom.id);
    if (anna) participantIds.push(anna.id);
    return { mode: "even", participantIds };
  }

  const items = context.items ?? [];
  const tom = context.contacts.find((c) =>
    c.name.toLowerCase().includes("tom"),
  );
  const anna = context.contacts.find((c) =>
    c.name.toLowerCase().includes("anna"),
  );
  const self = context.currentUserId;
  const assignments: Record<string, string[]> = {};

  for (const item of items) {
    const name = item.name.toLowerCase();
    const ids: string[] = [];
    if (name.includes('bitterballen')) {
      if (tom) ids.push(tom.id);
    } else if (name.includes("heineken") || name.includes("beer")) {
      if (tom) ids.push(tom.id);
    } else if (name.includes("apple pie") || name.includes("pie")) {
      if (anna) ids.push(anna.id);
      ids.push(self);
    } else if (
      name.includes("cappuccino") ||
      name.includes("coffee") ||
      name.includes("espresso")
    ) {
      ids.push(self);
    } else if (name.includes("tosti") || name.includes("toast")) {
      if (tom) ids.push(tom.id);
      if (anna) ids.push(anna.id);
      ids.push(self);
    } else if (name.includes("negroni")) {
      ids.push(self);
    } else if (name.includes("aperol")) {
      if (anna) ids.push(anna.id);
    } else if (name.includes("tonic")) {
      if (tom) ids.push(tom.id);
    } else if (name.includes("olive") || name.includes("bread")) {
      if (tom) ids.push(tom.id);
      if (anna) ids.push(anna.id);
      ids.push(self);
    }
    assignments[item.id] = ids;
  }

  return { mode: "specify", assignments };
}

// ─── Mock implementations ─────────────────────────────────────────

async function mockGetSessions(): Promise<PendingSplit[]> {
  await delay(300);
  return [...mockPendingSplits];
}

async function mockGetSessionDetail(id: string): Promise<PendingSplit> {
  await delay(300);
  const split = mockPendingSplits.find((s) => s.id === id);
  if (!split) throw new Error(`Session ${id} not found`);
  return split;
}

async function mockCreateSplitRequest(
  payload: SplitRequest,
): Promise<{ id: string }> {
  await delay(300);
  console.log("[mock] createSplitRequest:", payload);
  return { id: `split-${Date.now()}` };
}

// Re-export for convenience
export type { SplitMode };
