import { catalogItems, type CatalogItem } from "@/features/configuration/data/business-rules";

export const CATALOG_STORAGE_KEY = "salon-analyst2-catalog-overrides";

export function loadEditableCatalog() {
  if (typeof window === "undefined") {
    return catalogItems;
  }

  try {
    const storedValue = window.localStorage.getItem(CATALOG_STORAGE_KEY);

    if (!storedValue) {
      return catalogItems;
    }

    const storedItems = JSON.parse(storedValue) as CatalogItem[];

    if (!Array.isArray(storedItems)) {
      return catalogItems;
    }

    return Array.from(
      new Map([...catalogItems, ...storedItems].map((item) => [item.id, item])).values()
    );
  } catch {
    return catalogItems;
  }
}

export function saveEditableCatalog(items: CatalogItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const overrides = items.filter((item) => {
    const baseItem = catalogItems.find((candidate) => candidate.id === item.id);

    return JSON.stringify(baseItem) !== JSON.stringify(item);
  });

  window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(overrides));
}
