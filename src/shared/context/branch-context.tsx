"use client";

import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { BranchFilter } from "@/shared/types/business";
import { getBranchTheme, type BranchTheme } from "@/shared/lib/branch-theme";

const BRANCH_SELECTION_STORAGE_KEY = "salon-analyst2-selected-branch";

function isValidBranchFilter(value: string | null): value is BranchFilter {
  return (
    value === "all" ||
    value === "house-of-hair" ||
    value === "look-hair-extensions"
  );
}

type BranchContextValue = {
  branch: BranchFilter;
  setBranch: (branch: BranchFilter) => void;
  theme: BranchTheme;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: PropsWithChildren) {
  const [branch, setBranch] = useState<BranchFilter>("all");

  useEffect(() => {
    try {
      const storedBranch = window.localStorage.getItem(
        BRANCH_SELECTION_STORAGE_KEY
      );

      if (isValidBranchFilter(storedBranch)) {
        setBranch(storedBranch);
      }
    } catch {
      // Ignore local storage access failures and keep the default branch.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(BRANCH_SELECTION_STORAGE_KEY, branch);
    } catch {
      // Ignore local storage access failures and keep the in-memory branch.
    }
  }, [branch]);

  useEffect(() => {
    document.documentElement.dataset.branchTheme = branch;
    document.body.dataset.branchTheme = branch;
  }, [branch]);

  const value = useMemo(
    () => ({
      branch,
      setBranch,
      theme: getBranchTheme(branch),
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
