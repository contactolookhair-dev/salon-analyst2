import type { BranchFilter } from "@/shared/types/business";

export type BranchTheme = {
  id: BranchFilter;
  label: string;
  description: string;
  dotColor: string;
};

export const branchThemes: Record<BranchFilter, BranchTheme> = {
  all: {
    id: "all",
    label: "Tema neutral",
    description: "Panel general del sistema",
    dotColor: "#667d56",
  },
  "house-of-hair": {
    id: "house-of-hair",
    label: "House Of Hair",
    description: "Beige / Dorado",
    dotColor: "#C6A96A",
  },
  "look-hair-extensions": {
    id: "look-hair-extensions",
    label: "Look Hair Extensions",
    description: "Negro / Dorado",
    dotColor: "#C6A96A",
  },
};

export function getBranchTheme(branch: BranchFilter) {
  return branchThemes[branch];
}
