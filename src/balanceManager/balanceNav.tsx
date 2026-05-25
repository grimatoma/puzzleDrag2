// Tab + entity focus navigation for the Dev Panel (`/b/`).

import { createContext, useContext, useMemo } from "react";

const BalanceNavContext = createContext({
  focus: null,
  navigate: () => {},
});

export function BalanceNavProvider({ focus: any, navigate: any, children: any }) {
  const value = useMemo(() => ({ focus, navigate }), [focus, navigate]);
  return (
    <BalanceNavContext.Provider value={value}>
      {children}
    </BalanceNavContext.Provider>
  );
}

export function useBalanceNav() {
  return useContext(BalanceNavContext);
}
