import type { ParsedReceipt } from '../types/types';

let _counter = 0;
const nextId = () => `item-${++_counter}`;

export const mockReceipts: Record<string, ParsedReceipt> = {
  'Café de Jaren': {
    items: [
      { id: nextId(), name: 'Bitterballen', price: 850, quantity: 1 },
      { id: nextId(), name: 'Tosti Ham/Kaas', price: 900, quantity: 1 },
      { id: nextId(), name: 'Cappuccino', price: 450, quantity: 2 },
      { id: nextId(), name: 'Heineken', price: 600, quantity: 3 },
      { id: nextId(), name: 'Apple pie', price: 650, quantity: 1 },
    ],
    total: 5100,
    currency: 'EUR',
  },
  'Bar Botanique': {
    items: [
      { id: nextId(), name: 'Negroni', price: 1100, quantity: 2 },
      { id: nextId(), name: 'Aperol Spritz', price: 1100, quantity: 1 },
      { id: nextId(), name: 'Tonic', price: 500, quantity: 1 },
      { id: nextId(), name: 'Olives', price: 600, quantity: 1 },
      { id: nextId(), name: 'Bread plate', price: 800, quantity: 1 },
      { id: nextId(), name: 'Espresso', price: 300, quantity: 2 },
    ],
    total: 5800,
    currency: 'EUR',
  },
  'Default': {
    items: [
      { id: nextId(), name: 'Item 1', price: 1000, quantity: 1 },
      { id: nextId(), name: 'Item 2', price: 750, quantity: 2 },
      { id: nextId(), name: 'Item 3', price: 1200, quantity: 1 },
      { id: nextId(), name: 'Item 4', price: 500, quantity: 3 },
    ],
    total: 5200,
    currency: 'EUR',
  },
};
