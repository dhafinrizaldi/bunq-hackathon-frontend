export interface Transaction {
  id: string;
  merchantName: string;
  amount: number;
  currency: string;
  timestamp: string;
  category?: string;
  location?: { lat: number; lng: number };
}

export interface Participant {
  id: string;
  email?: string;            // backend identifies users by email; absent on old mock data
  name: string;
  avatarUrl: string;
  amountOwed: number;        // cents
  status: 'pending' | 'paid' | 'declined';
}

export interface PendingSplit {
  id: string;
  merchantName: string;
  totalAmount: number;       // cents
  currency: string;
  createdAt: string;
  isFullyPaid: boolean;
  status?: 'pending' | 'completed' | 'cancelled';
  participants: Participant[];
  // Fields present only after detail is fetched:
  transactionId?: string;
  userPrompt?: string;
  receiptImageUrl?: string | null;
  items?: ReceiptItem[];
}

export interface Contact {
  id: string;
  email: string;             // required for backend participant_emails payload
  name: string;
  avatarUrl: string;
  distanceMeters?: number;
}

export type SplitMode = 'even' | 'specify_tap' | 'specify_voice';

export interface VoiceRecording {
  uri: string;
  durationMs: number;
  transcript?: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;    // per-unit, in cents
  quantity: number; // min 1
}

export interface ItemAssignment {
  itemId: string;
  contactIds: string[];
}

export interface ParsedReceipt {
  items: ReceiptItem[];
  total: number;    // in cents — sum of price*quantity across all items
  currency: string;
}

export type ParsedSplit =
  | { mode: 'even'; participantIds: string[]; rawResponse?: string; unparsedTranscript?: string }
  | { mode: 'specify'; assignments: Record<string, string[]>; unparsedItems?: string[]; rawResponse?: string; unparsedTranscript?: string };
