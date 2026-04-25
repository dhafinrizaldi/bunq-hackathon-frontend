import type { Transaction } from '../types/types';

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-1',
    merchantName: 'Café de Jaren',
    amount: 47.80,
    currency: 'EUR',
    timestamp: '2026-04-25T17:30:00Z',
    category: 'dining',
    location: { lat: 52.3702, lng: 4.8952 },
  },
  {
    id: 'txn-2',
    merchantName: 'Albert Heijn',
    amount: 23.15,
    currency: 'EUR',
    timestamp: '2026-04-24T14:15:00Z',
    category: 'groceries',
    location: { lat: 52.3676, lng: 4.9041 },
  },
  {
    id: 'txn-3',
    merchantName: 'Uber',
    amount: 14.20,
    currency: 'EUR',
    timestamp: '2026-04-24T11:45:00Z',
    category: 'transport',
  },
  {
    id: 'txn-4',
    merchantName: 'Bar Botanique',
    amount: 62.00,
    currency: 'EUR',
    timestamp: '2026-04-23T21:00:00Z',
    category: 'dining',
    location: { lat: 52.3681, lng: 4.9054 },
  },
  {
    id: 'txn-5',
    merchantName: 'Coffee & Coconuts',
    amount: 8.50,
    currency: 'EUR',
    timestamp: '2026-04-22T09:20:00Z',
    category: 'coffee',
    location: { lat: 52.3559, lng: 4.9009 },
  },
];
