import type {
  ApiSessionDetail,
  ApiSessionSummary,
  ApiItem,
  ApiPaymentRequest,
  ApiCreateSessionPayload,
} from '../types/api';
import type {
  PendingSplit,
  ReceiptItem,
  Participant,
} from '../types/types';
import type { SplitRequest } from '../api/client';
import { decimalStringToCents, centsToDecimalString, splitCentsEvenly } from './money';

const SESSION_STATUS_MAP: Record<string, PendingSplit['status']> = {
  CO: 'completed',
  PE: 'pending',
  CA: 'cancelled',
};

const PAYMENT_STATUS_MAP: Record<string, Participant['status']> = {
  PA: 'paid',
  PE: 'pending',
  FA: 'declined',
};

export function adaptSessionSummaryToPendingSplit(
  api: ApiSessionSummary
): PendingSplit {
  return {
    id: String(api.id),
    merchantName: api.merchant_name,
    totalAmount: decimalStringToCents(api.total_amount),
    currency: 'EUR', // not in summary response — assumed EUR until detail is fetched
    createdAt: api.date,
    isFullyPaid: api.is_fully_paid,
    participants: [],  // not in summary — populated when detail is fetched
  };
}

export function adaptSessionDetailToPendingSplit(
  api: ApiSessionDetail,
  _currentUserEmail: string
): PendingSplit {
  const participants: Participant[] = api.payment_requests.map(
    adaptPaymentRequestToParticipant
  );

  return {
    id: String(api.id),
    merchantName: api.transaction.merchant_name,
    totalAmount: decimalStringToCents(api.transaction.total_amount),
    currency: api.transaction.currency,
    createdAt: api.created_at,
    isFullyPaid: api.is_fully_paid,
    status: SESSION_STATUS_MAP[api.status],
    participants,
    transactionId: String(api.transaction.id),
    userPrompt: api.user_prompt ?? undefined,
    receiptImageUrl: api.receipt_image,
    items: api.items.map(adaptApiItemToReceiptItem),
  };
}

function adaptPaymentRequestToParticipant(pr: ApiPaymentRequest): Participant {
  return {
    id: String(pr.payer),
    email: pr.payer_email,
    // TODO: CONFIRM-BACKEND Q7 — backend only provides email; using local part as display name until real names are available
    name: pr.payer_email.split('@')[0],
    avatarUrl: '',  // backend doesn't provide; UI falls back to initials
    amountOwed: decimalStringToCents(pr.amount),
    status: PAYMENT_STATUS_MAP[pr.status] ?? 'pending',
  };
}

export function adaptApiItemToReceiptItem(api: ApiItem): ReceiptItem {
  return {
    id: String(api.id),
    name: api.description,
    price: decimalStringToCents(api.total_price),
    quantity: api.quantity,
    // Allocations are returned separately via adaptApiItemsToAssignments
  };
}

// Build the assignments map (itemId → contactIds) from API items.
// Items with empty allocations arrays were had by the payee (current user).
export function adaptApiItemsToAssignments(
  apiItems: ApiItem[],
  currentUserId: string
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const item of apiItems) {
    const itemId = String(item.id);
    if (item.allocations.length === 0) {
      result[itemId] = [currentUserId];
    } else {
      result[itemId] = item.allocations.map(a => String(a.participant));
    }
  }
  return result;
}

// Build the POST /api/sessions/ payload from internal split state.
// participantEmails: contactId (or mockUser.id) → email
export function adaptSplitRequestToApiPayload(
  req: SplitRequest,
  participantEmails: Record<string, string>,
  items: ReceiptItem[],
  assignments: Record<string, string[]>
): ApiCreateSessionPayload {
  return {
    // TODO: CONFIRM-BACKEND Q5 — confirm transaction_id is an integer
    transaction_id: parseInt(req.transactionId, 10),
    participant_emails: req.participants
      .map(p => participantEmails[p.contactId])
      .filter((e): e is string => Boolean(e)),
    // TODO: CONFIRM-BACKEND Q5 — confirm user_prompt is the right field name
    user_prompt: req.note,
    items: items.map(item => {
      const assignedIds = assignments[item.id] ?? [];
      const totalCents = item.price * item.quantity;
      const shares = assignedIds.length > 0
        ? splitCentsEvenly(totalCents, assignedIds.length)
        : [];
      return {
        description: item.name,
        total_price: centsToDecimalString(totalCents),
        quantity: item.quantity,
        allocations: assignedIds.map((contactId, i) => ({
          participant_email: participantEmails[contactId] ?? '',
          // TODO: CONFIRM-BACKEND Q5 — does backend accept per-person shares, or does it compute them?
          allocated_amount: centsToDecimalString(shares[i] ?? 0),
        })),
      };
    }),
  };
}

