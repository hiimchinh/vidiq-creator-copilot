import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** The visitor's vidIQ key: sessionStorage only, cleared when the tab closes, sent only to our own API. */
export const useKeyStore = create<{ vidiqKey: string; setKey: (key: string) => void }>()(
  persist((set) => ({ vidiqKey: "", setKey: (vidiqKey) => set({ vidiqKey: vidiqKey.trim() }) }), {
    name: "vidiq-key",
    storage: createJSONStorage(() => sessionStorage),
    skipHydration: true,
  }),
);
