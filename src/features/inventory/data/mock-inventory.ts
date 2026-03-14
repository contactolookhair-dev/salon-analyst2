import type { BranchId } from "@/shared/types/business";

export type InventoryItem = {
  id: string;
  name: string;
  branchId: BranchId;
  currentStock: number;
  reorderPoint: number;
};

export const inventoryItems: InventoryItem[] = [
  {
    id: "stock-adhesiva-premium-1",
    name: "Adhesiva Invisible Premium Corta #1",
    branchId: "look-hair-extensions",
    currentStock: 18,
    reorderPoint: 8,
  },
  {
    id: "stock-protesis-premium-4k-1",
    name: "Protesis Premium 4k Tono #1",
    branchId: "house-of-hair",
    currentStock: 4,
    reorderPoint: 2,
  },
  {
    id: "stock-shampoo-essential",
    name: "Shampoo ESSENTIAL",
    branchId: "house-of-hair",
    currentStock: 9,
    reorderPoint: 4,
  },
];
