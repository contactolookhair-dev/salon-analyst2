import { catalogItems, type CatalogItem } from "@/features/configuration/data/business-rules";

export const CATALOG_STORAGE_KEY = "salon-analyst2-catalog-overrides";

function isValidCatalogOverride(item: CatalogItem) {
  return (
    typeof item?.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item?.nombre === "string" &&
    item.nombre.trim().length > 0 &&
    typeof item?.nombre_normalizado === "string" &&
    item.nombre_normalizado.trim().length > 0 &&
    (item.tipo === "service" || item.tipo === "product")
  );
}

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

    const validOverrides = storedItems.filter(isValidCatalogOverride);

    return Array.from(
      new Map([...catalogItems, ...validOverrides].map((item) => [item.id, item])).values()
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

export function resetEditableCatalog() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CATALOG_STORAGE_KEY);
}
