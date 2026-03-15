"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type GroupMembersOpenContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const GroupMembersOpenContext = createContext<GroupMembersOpenContextValue | null>(null);

export function GroupMembersOpenProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <GroupMembersOpenContext.Provider value={{ open, setOpen }}>
      {children}
    </GroupMembersOpenContext.Provider>
  );
}

export function useGroupMembersOpen(): GroupMembersOpenContextValue | null {
  return useContext(GroupMembersOpenContext);
}
