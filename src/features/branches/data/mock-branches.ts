import type { Branch } from "@/shared/types/business";

export const branches: Branch[] = [
  {
    id: "house-of-hair",
    name: "House Of Hair",
    city: "Santiago",
    logoUrl: "",
    primaryColor: "#C6A96A",
    secondaryColor: "#EDE5D8",
    monthlyTarget: 16120000,
    openDays: [1, 2, 3, 4, 5, 6],
    operatesOnSundays: false,
    fixedExpenseProrationMode: "calendar_days",
    fixedMonthlyExpenses: 1800000,
    active: true,
  },
  {
    id: "look-hair-extensions",
    name: "Look Hair Extensions",
    city: "Santiago",
    logoUrl: "",
    primaryColor: "#C6A96A",
    secondaryColor: "#1A1A1A",
    monthlyTarget: 14880000,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    operatesOnSundays: true,
    fixedExpenseProrationMode: "calendar_days",
    fixedMonthlyExpenses: 1400000,
    active: true,
  },
];
