"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { BranchFilter } from "@/shared/types/business";

type BranchContextValue = {
  branch: BranchFilter;
  setBranch: (branch: BranchFilter) => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: PropsWithChildren) {
  const [branch, setBranch] = useState<BranchFilter>("all");

  const value = useMemo(
    () => ({
      branch,
      setBranch,
    }),
    [branch]
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);

  if (!context) {
    throw new Error("useBranch must be used within BranchProvider");
  }

  return context;
}

