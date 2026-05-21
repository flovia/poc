"use client";

import { createContext, useContext } from "react";

type MobileNavContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export const MobileNavProvider = MobileNavContext.Provider;

export function useMobileNav() {
  return useContext(MobileNavContext);
}
