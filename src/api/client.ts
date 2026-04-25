import type { Transaction, Contact, SplitMode, ParsedReceipt, ParsedSplit, ReceiptItem, PendingSplit } from '../types/types';
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
} from '../lib/adapters';

// ─── Feature flag ──────────────────────────────────────────────────
// Set EXPO_PUBLIC_USE_REAL_API=true in .env to hit the real backend.
const USE_REAL_API = process.env.EXPO_PUBLIC_USE_REAL_API === 'true';
// TODO: CONFIRM-BACKEND Q2 — what is the exact API base URL in dev?
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

// ─── Auth ──────────────────────────────────────────────────────────
// TODO: CONFIRM-BACKEND Q1 — what's the auth scheme? Bearer token? Cookie?
async function getAuthToken(): Promise<string | null> {
  return null;
}

// ─── Core fetch helper ─────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Exported request shape ────────────────────────────────────────
export interface SplitRequest {
  transactionId: string;
  mode: 'even' | 'specify';
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
  const data = await apiFetch<ApiSessionSummary[]>('/sessions/');
  return data.map(adaptSessionSummaryToPendingSplit);
}

export async function getSessionDetail(
  id: string,
  currentUserEmail: string = mockUser.email
): Promise<PendingSplit> {
  if (!USE_REAL_API) return mockGetSessionDetail(id);
  const data = await apiFetch<ApiSessionDetail>(`/sessions/${id}/`);
  return adaptSessionDetailToPendingSplit(data, currentUserEmail);
}

// ─── Transactions ─────────────────────────────────────────────────

// TODO: CONFIRM-BACKEND — GET /api/transactions/:id
export async function getCurrentTransaction(id: string): Promise<Transaction> {
  await delay(300);
  const txn = mockTransactions.find(t => t.id === id);
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
export async function getNearbyContacts(_lat: number, _lng: number): Promise<Contact[]> {
  await delay(300);
  return mockContacts.filter(c => c.distanceMeters !== undefined && c.distanceMeters < 500);
}

// ─── Receipt OCR ─────────────────────────────────────────────────

// TODO: CONFIRM-BACKEND — POST /api/receipts/parse
// Backend will call OCR service (Veryfi, Mindee, or Google Vision).
export async function parseReceipt(_imageUri: string): Promise<ParsedReceipt> {
  await delay(300);
  return mockReceipts['Café de Jaren'] ?? mockReceipts['Default'];
}

// ─── Split creation ───────────────────────────────────────────────

// TODO: CONFIRM-BACKEND Q5 — confirm POST payload structure before wiring
// participantEmails: contactId (and mockUser.id for current user) → email
// items/assignments only needed for 'specify' mode (pass [] and {} for 'even')
export async function createSplitRequest(
  payload: SplitRequest,
  participantEmails: Record<string, string>,
  items: ReceiptItem[],
  assignments: Record<string, string[]>
): Promise<{ id: string }> {
  if (!USE_REAL_API) return mockCreateSplitRequest(payload);
  const apiPayload = adaptSplitRequestToApiPayload(payload, participantEmails, items, assignments);
  const data = await apiFetch<ApiSessionDetail>('/sessions/', {
    method: 'POST',
    body: JSON.stringify(apiPayload),
  });
  return { id: String(data.id) };
}

// ─── Voice ────────────────────────────────────────────────────────

// TODO: CONFIRM-BACKEND — POST /api/voice/transcribe
// Backend will call STT service (Whisper, Deepgram, or AssemblyAI).
export async function transcribeAudio(_uri: string): Promise<{ transcript: string }> {
  await delay(1200);
  return { transcript: mockVoiceTranscripts.specifyDefault };
}

// TODO: CONFIRM-BACKEND — POST /api/voice/parse
// Backend will call an LLM with a structured-output prompt.
export async function parseSplitFromTranscript(
  _transcript: string,
  context: {
    mode: 'even' | 'specify';
    contacts: Contact[];
    items?: ReceiptItem[];
    currentUserId: string;
  }
): Promise<ParsedSplit | null> {
  await delay(800);
  if (mockVoiceShouldFail) return null;

  if (context.mode === 'even') {
    const tom = context.contacts.find(c => c.name.toLowerCase().includes('tom'));
    const anna = context.contacts.find(c => c.name.toLowerCase().includes('anna'));
    const participantIds = [context.currentUserId];
    if (tom) participantIds.push(tom.id);
    if (anna) participantIds.push(anna.id);
    return { mode: 'even', participantIds };
  }

  const items = context.items ?? [];
  const tom = context.contacts.find(c => c.name.toLowerCase().includes('tom'));
  const anna = context.contacts.find(c => c.name.toLowerCase().includes('anna'));
  const self = context.currentUserId;
  const assignments: Record<string, string[]> = {};

  for (const item of items) {
    const name = item.name.toLowerCase();
    const ids: string[] = [];

    if (name.includes('bitterballen')) {
      if (tom) ids.push(tom.id);
    } else if (name.includes('heineken') || name.includes('beer')) {
      if (tom) ids.push(tom.id);
    } else if (name.includes('apple pie') || name.includes('pie')) {
      if (anna) ids.push(anna.id);
      ids.push(self);
    } else if (name.includes('cappuccino') || name.includes('coffee') || name.includes('espresso')) {
      ids.push(self);
    } else if (name.includes('tosti') || name.includes('toast')) {
      if (tom) ids.push(tom.id);
      if (anna) ids.push(anna.id);
      ids.push(self);
    } else if (name.includes('negroni')) {
      ids.push(self);
    } else if (name.includes('aperol')) {
      if (anna) ids.push(anna.id);
    } else if (name.includes('tonic')) {
      if (tom) ids.push(tom.id);
    } else if (name.includes('olive') || name.includes('bread')) {
      if (tom) ids.push(tom.id);
      if (anna) ids.push(anna.id);
      ids.push(self);
    }
    assignments[item.id] = ids;
  }

  return { mode: 'specify', assignments };
}

// ─── Mock implementations ─────────────────────────────────────────

async function mockGetSessions(): Promise<PendingSplit[]> {
  await delay(300);
  return [...mockPendingSplits];
}

async function mockGetSessionDetail(id: string): Promise<PendingSplit> {
  await delay(300);
  const split = mockPendingSplits.find(s => s.id === id);
  if (!split) throw new Error(`Session ${id} not found`);
  return split;
}

async function mockCreateSplitRequest(payload: SplitRequest): Promise<{ id: string }> {
  await delay(300);
  console.log('[mock] createSplitRequest:', payload);
  return { id: `split-${Date.now()}` };
}

// Re-export for convenience
export type { SplitMode };
