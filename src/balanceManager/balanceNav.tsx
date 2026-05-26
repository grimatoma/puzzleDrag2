// Tab + entity focus navigation for the Dev Panel (`/b/`).

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

export interface BalanceNavTarget {
  tab: string;
  focus?: string | null;
}

export type BalanceNavigate = (target: BalanceNavTarget) => void;

export interface BalanceNavValue {
  focus: string | null;
  navigate: BalanceNavigate;
}

const BalanceNavContext = createContext<BalanceNavValue>({
  focus: null,
  navigate: () => {},
});

export function BalanceNavProvider({
  focus,
  navigate,
  children,
}: {
  focus: string | null;
  navigate: BalanceNavigate;
  children: ReactNode;
}) {
  const value = useMemo<BalanceNavValue>(() => ({ focus, navigate }), [focus, navigate]);
  return (
    <BalanceNavContext.Provider value={value}>
      {children}
    </BalanceNavContext.Provider>
  );
}

export function useBalanceNav(): BalanceNavValue {
  return useContext(BalanceNavContext);
}
