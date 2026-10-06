import { create } from 'zustand';

export const useUI = create()((set) => ({
  authOpen: false,
  checkout: null,
  pay: null,
  openAuth: () => set({ authOpen: true }),
  closeAuth: () => set({ authOpen: false }),
  openCheckout: (t) => set({ checkout: t }),
  closeCheckout: () => set({ checkout: null }),
}));
