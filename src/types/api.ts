// Raw shapes returned by / sent to the Django REST backend.
// Nothing in here should leak into UI components — use adapters.ts.

export interface ApiSessionSummary {
  id: number;
  merchant_name: string;
  total_amount: string;    // decimal string, e.g. "45.50"
  date: string;            // ISO datetime string
  is_fully_paid: boolean;
}

export interface ApiTransaction {
  id: number;
  initiator: number;       // user id of the session creator
  merchant_name: string;
  total_amount: string;    // decimal string
  currency: string;
  date: string;            // ISO datetime string
}

export interface ApiAllocation {
  id: number;
  item: number;            // item id
  participant: number;     // participant id (not user id)
  participant_email: string;
  allocated_amount: string; // decimal string
}

export interface ApiItem {
  id: number;
  description: string;
  total_price: string;     // decimal string — total for this line (unit × qty)
  quantity: number;
  allocations: ApiAllocation[];
  // Empty allocations → item belongs to the payee (current user)
}

export interface ApiParticipant {
  id: number;
  user: number;            // user id
  user_email: string;
}

export interface ApiPaymentRequest {
  id: number;
  payer: number;           // user id of the person who owes money
  payer_email: string;
  payee: number;           // user id of the person who is owed
  payee_email: string;
  amount: string;          // decimal string
  bunq_request_id: string;
  status: string;          // 'PA' = paid, 'PE' = pending, 'FA' = failed/declined
  created_at: string;      // ISO datetime string
}

export interface ApiSessionDetail {
  id: number;
  transaction: ApiTransaction;
  receipt_image: string | null;
  user_prompt: string | null;
  status: string;          // 'CO' = completed, 'PE' = pending, 'CA' = cancelled
  ai_raw_response: unknown; // debugging artifact — not used by the app
  participants: ApiParticipant[];
  items: ApiItem[];
  payment_requests: ApiPaymentRequest[];
  is_fully_paid: boolean;
  created_at: string;      // ISO datetime string
  updated_at: string;      // ISO datetime string
}

// ─── POST /api/sessions/ payload ──────────────────────────────────

export interface ApiCreateAllocation {
  participant_email: string;
  allocated_amount: string; // decimal string
}

export interface ApiCreateItem {
  description: string;
  total_price: string;     // decimal string
  quantity: number;
  allocations: ApiCreateAllocation[];
}

export interface ApiCreateSessionPayload {
  transaction_id: number;
  participant_emails: string[];
  user_prompt?: string;
  items: ApiCreateItem[];
  // TODO: CONFIRM-BACKEND — receipt image: base64 in body, multipart, or separate upload?
}
