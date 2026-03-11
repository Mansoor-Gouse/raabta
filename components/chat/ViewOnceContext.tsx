"use client";

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";

type ViewOnceContextValue = {
  viewOnce: boolean;
  setViewOnce: Dispatch<SetStateAction<boolean>>;
};

const ViewOnceContext = createContext<ViewOnceContextValue | null>(null);

export function ViewOnceProvider({ children }: { children: ReactNode }) {
  const [viewOnce, setViewOnce] = useState(false);
  return (
    <ViewOnceContext.Provider value={{ viewOnce, setViewOnce }}>
      {children}
    </ViewOnceContext.Provider>
  );
}

export function useViewOnce() {
  const ctx = useContext(ViewOnceContext);
  return ctx ?? { viewOnce: false, setViewOnce: () => {} };
}
