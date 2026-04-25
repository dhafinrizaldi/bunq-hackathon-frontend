// Raw shapes returned by / sent to the Django REST backend.
// Nothing in here should leak into UI components — use adapters.ts.

export interface ApiSessionSummary {
  id: number;
  merchant_name: string;
  total_amount: string;    // decimal string, e.g. "47.80"
  date: string;            // ISO date string
  is_fully_paid: boolean;
}

export interface ApiTransaction {
  id: number;
  merchant_name: string;
  total_amount: string;    // decimal string
  currency: string;
}

export interface ApiAllocation {
  participant: number;         // participant user id
  participant_email: string;
  allocated_amount: string;    // decimal string
}

export interface ApiItem {
  id: number;
  description: string;
  total_price: string;         // decimal string — total for this line (unit × qty)
  quantity: number;
  allocations: ApiAllocation[];
  // Empty allocations → item belongs to the payee (current user)
}

export interface ApiPaymentRequest {
  payer: number;               // user id of the person who owes money
  payer_email: string;
  amount: string;              // decimal string
  // TODO: CONFIRM-BACKEND Q3 — are status codes definitively CO/PE/CA for sessions and PA/PE/FA for payments?
  status: string;              // 'PA' = paid, 'PE' = pending, 'FA' = failed/declined
}

export interface ApiSessionDetail {
  id: number;
  created_at: string;          // ISO datetime
  is_fully_paid: boolean;
  transaction: ApiTransaction;
  payment_requests: ApiPaymentRequest[];
  // TODO: CONFIRM-BACKEND Q5 — is user_prompt the right field name for the note/voice transcript?
  user_prompt: string | null;
  receipt_image: string | null;
  items: ApiItem[];
  // ai_raw_response intentionally omitted — debugging artifact only
}

// ─── POST /api/sessions/ payload ──────────────────────────────────

export interface ApiCreateAllocation {
  participant_email: string;
  allocated_amount: string;    // decimal string
}

export interface ApiCreateItem {
  description: string;
  total_price: string;         // decimal string
  quantity: number;
  allocations: ApiCreateAllocation[];
}

export interface ApiCreateParticipant {
  email: string;
  amount: string;  // decimal string, cents converted to euros
}

export interface ApiCreateSessionPayload {
  transaction_id: string;
  merchant_name: string;
  total_amount: string;    // decimal string
  currency: string;
  participant_emails: string[];
  participants: ApiCreateParticipant[];
  user_prompt?: string;
  items: ApiCreateItem[];
}
