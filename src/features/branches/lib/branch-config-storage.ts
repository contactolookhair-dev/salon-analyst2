import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import type { Branch } from "@/shared/types/business";

const BRANCH_STORAGE_KEY = "salon-analyst2-branch-config";
export const BRANCH_CONFIG_UPDATED_EVENT = "salon-analyst2-branch-config-updated";

export function loadEditableBranches() {
  if (typeof window === "undefined") {
    return baseBranches;
  }

  try {
    const storedValue = window.localStorage.getItem(BRANCH_STORAGE_KEY);

    if (!storedValue) {
      return baseBranches;
    }

    const storedBranches = JSON.parse(storedValue) as Branch[];

    if (!Array.isArray(storedBranches)) {
      return baseBranches;
    }

    return Array.from(
      new Map([...baseBranches, ...storedBranches].map((branch) => [branch.id, branch])).values()
    );
  } catch {
    return baseBranches;
  }
}

export function saveEditableBranches(branches: Branch[]) {
  if (typeof window === "undefined") {
    return;
  }

  const overrides = branches.filter((branch) => {
    const baseBranch = baseBranches.find((candidate) => candidate.id === branch.id);

    return JSON.stringify(baseBranch) !== JSON.stringify(branch);
  });

  window.localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new CustomEvent(BRANCH_CONFIG_UPDATED_EVENT));
}
