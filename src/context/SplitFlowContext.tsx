import { createContext, useContext, useReducer } from 'react';
import type { Transaction, Contact, ReceiptItem } from '../types/types';

interface SplitFlowState {
  transaction: Transaction | null;
  selectedContacts: Contact[];
  receiptImageUri: string | null;
  items: ReceiptItem[];
  assignments: Record<string, string[]>; // itemId → contactIds (includes current user id)
  note: string;
  voiceWasUsed: boolean;
  lastTranscript: string | null;
}

type Action =
  | { type: 'INIT'; transaction: Transaction; selectedContacts: Contact[] }
  | { type: 'SET_RECEIPT_IMAGE'; uri: string | null }
  | { type: 'SET_ITEMS'; items: ReceiptItem[] }
  | { type: 'ASSIGN_ITEM'; itemId: string; contactIds: string[] }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<ReceiptItem> }
  | { type: 'ADD_ITEM'; item: ReceiptItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SET_NOTE'; note: string }
  | { type: 'SET_VOICE_DRAFT'; assignments: Record<string, string[]>; transcript: string };

const initialState: SplitFlowState = {
  transaction: null,
  selectedContacts: [],
  receiptImageUri: null,
  items: [],
  assignments: {},
  note: '',
  voiceWasUsed: false,
  lastTranscript: null,
};

function reducer(state: SplitFlowState, action: Action): SplitFlowState {
  switch (action.type) {
    case 'INIT':
      return { ...initialState, transaction: action.transaction, selectedContacts: action.selectedContacts, voiceWasUsed: false, lastTranscript: null };
    case 'SET_RECEIPT_IMAGE':
      return { ...state, receiptImageUri: action.uri };
    case 'SET_ITEMS':
      return { ...state, items: action.items, assignments: {} };
    case 'ASSIGN_ITEM':
      return { ...state, assignments: { ...state.assignments, [action.itemId]: action.contactIds } };
    case 'UPDATE_ITEM':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, ...action.patch } : i) };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };
    case 'REMOVE_ITEM': {
      const { [action.id]: _removed, ...restAssignments } = state.assignments;
      return { ...state, items: state.items.filter(i => i.id !== action.id), assignments: restAssignments };
    }
    case 'SET_NOTE':
      return { ...state, note: action.note };
    case 'SET_VOICE_DRAFT':
      return { ...state, assignments: action.assignments, voiceWasUsed: true, lastTranscript: action.transcript };
    default:
      return state;
  }
}

const SplitFlowContext = createContext<{
  state: SplitFlowState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function SplitFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <SplitFlowContext.Provider value={{ state, dispatch }}>
      {children}
    </SplitFlowContext.Provider>
  );
}

export function useSplitFlow() {
  const ctx = useContext(SplitFlowContext);
  if (!ctx) throw new Error('useSplitFlow must be used within SplitFlowProvider');
  return ctx;
}
