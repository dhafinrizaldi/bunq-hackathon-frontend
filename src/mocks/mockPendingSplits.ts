import type { PendingSplit } from '../types/types';

export const mockPendingSplits: PendingSplit[] = [
  {
    id: 'split-1',
    merchantName: 'Café de Jaren',
    totalAmount: 4780,         // cents
    currency: 'EUR',
    createdAt: '2026-04-25T17:30:00Z',
    isFullyPaid: false,
    status: 'pending',
    participants: [
      { id: 'p-1', email: 'tom@example.com',   name: 'Tom',   avatarUrl: 'https://i.pravatar.cc/150?u=p-1',  amountOwed: 1195, status: 'paid' },
      { id: 'p-2', email: 'anna@example.com',  name: 'Anna',  avatarUrl: 'https://i.pravatar.cc/150?u=p-2',  amountOwed: 1195, status: 'paid' },
      { id: 'p-3', email: 'lars@example.com',  name: 'Lars',  avatarUrl: 'https://i.pravatar.cc/150?u=p-3',  amountOwed: 1195, status: 'pending' },
      { id: 'p-4', email: 'sofia@example.com', name: 'Sofia', avatarUrl: 'https://i.pravatar.cc/150?u=p-4',  amountOwed: 1195, status: 'pending' },
    ],
    userPrompt: 'Tom had the bitterballen and a heineken, Anna and I shared the apple pie, I had a cappuccino, and we all split the tosti',
    receiptImageUrl: null,
    items: [
      { id: 'item-1', name: 'Bitterballen',  price: 850,  quantity: 1 },
      { id: 'item-2', name: 'Tosti',         price: 900,  quantity: 1 },
      { id: 'item-3', name: 'Cappuccino',    price: 450,  quantity: 2 },
      { id: 'item-4', name: 'Heineken',      price: 600,  quantity: 3 },
      { id: 'item-5', name: 'Apple pie',     price: 650,  quantity: 1 },
    ],
  },
  {
    id: 'split-2',
    merchantName: 'Bar Botanique',
    totalAmount: 6200,         // cents
    currency: 'EUR',
    createdAt: '2026-04-25T19:15:00Z',
    isFullyPaid: false,
    status: 'pending',
    participants: [
      { id: 'p-5', email: 'daan@example.com', name: 'Daan', avatarUrl: 'https://i.pravatar.cc/150?u=p-5', amountOwed: 2067, status: 'pending' },
      { id: 'p-6', email: 'noor@example.com', name: 'Noor', avatarUrl: 'https://i.pravatar.cc/150?u=p-6', amountOwed: 2067, status: 'pending' },
      { id: 'p-7', email: 'finn@example.com', name: 'Finn', avatarUrl: 'https://i.pravatar.cc/150?u=p-7', amountOwed: 2066, status: 'pending' },
    ],
  },
  {
    id: 'split-3',
    merchantName: 'Albert Heijn',
    totalAmount: 2315,         // cents
    currency: 'EUR',
    createdAt: '2026-04-24T14:00:00Z',
    isFullyPaid: true,
    status: 'completed',
    participants: [
      { id: 'p-8',  email: 'emma@example.com', name: 'Emma', avatarUrl: 'https://i.pravatar.cc/150?u=p-8',  amountOwed: 772, status: 'paid' },
      { id: 'p-9',  email: 'ravi@example.com', name: 'Ravi', avatarUrl: 'https://i.pravatar.cc/150?u=p-9',  amountOwed: 772, status: 'paid' },
      { id: 'p-10', email: 'lena@example.com', name: 'Lena', avatarUrl: 'https://i.pravatar.cc/150?u=p-10', amountOwed: 771, status: 'paid' },
    ],
  },
];
