import {
  catalogItems,
  normalizeCatalogName,
  type CatalogItem,
} from "@/features/configuration/data/business-rules";

function normalizeCatalogSearchText(value: string) {
  return normalizeCatalogName(value)
    .replace(/\b(de|del|la|el|y|para)\b/g, " ")
    .replace(/\b(pequenas|pequena|pequeñas|pequeña)\b/g, " pequeno ")
    .replace(/\badhesivas\b/g, " adhesiva ")
    .replace(/\bextensiones\b/g, " extension ")
    .replace(/\bproductos\b/g, " producto ")
    .replace(/\bservicios\b/g, " servicio ")
    .replace(/\b([a-z0-9]+)es\b/g, "$1")
    .replace(/\b([a-z0-9]+)s\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreCatalogMatch(item: CatalogItem, query: string) {
  const normalizedQuery = normalizeCatalogSearchText(query);
  const candidates = [item.nombre, item.nombre_normalizado, ...(item.aliases ?? [])].map((value) =>
    normalizeCatalogSearchText(value)
  );

  if (candidates.some((candidate) => candidate === normalizedQuery)) {
    return 100;
  }

  if (candidates.some((candidate) => candidate.startsWith(normalizedQuery))) {
    return 75;
  }

  if (candidates.some((candidate) => candidate.includes(normalizedQuery))) {
    return 50;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const tokenMatches = candidates.reduce((best, candidate) => {
    const candidateTokens = candidate.split(" ");
    const matchCount = queryTokens.filter((token) =>
      candidateTokens.some((candidateToken) => candidateToken.includes(token))
    ).length;

    return Math.max(best, matchCount);
  }, 0);

  if (
    candidates.some((candidate) =>
      queryTokens.length > 1 &&
      queryTokens.every((token) => candidate.includes(token))
    )
  ) {
    return 65;
  }

  return tokenMatches > 0 ? tokenMatches * 10 : 0;
}

export function createCatalogId(name: string) {
  const baseId = normalizeCatalogSearchText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return baseId || `catalog-${Date.now()}`;
}

export function searchCatalogItems(
  query: string,
  limit = 6,
  items: CatalogItem[] = catalogItems
) {
  if (!query.trim()) {
    return items.filter((item) => item.active).slice(0, limit);
  }

  return items
    .filter((item) => item.active)
    .map((item) => ({
      item,
      score: scoreCatalogMatch(item, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function findExactCatalogMatch(
  query: string,
  items: CatalogItem[] = catalogItems
) {
  const rawQuery = query.trim();

  return (
    items.find((item) =>
      [item.nombre, ...(item.aliases ?? [])].some(
        (value) => value.trim().toLowerCase() === rawQuery.toLowerCase()
      )
    ) ?? null
  );
}

export function findNormalizedCatalogMatch(
  query: string,
  items: CatalogItem[] = catalogItems
) {
  const normalizedQuery = normalizeCatalogSearchText(query);

  return (
    items.find((item) =>
      [item.nombre_normalizado, item.nombre, ...(item.aliases ?? [])]
        .map((value) => normalizeCatalogSearchText(value))
        .includes(normalizedQuery)
    ) ?? null
  );
}

export function findCatalogMatch(
  query: string,
  items: CatalogItem[] = catalogItems
) {
  return findExactCatalogMatch(query, items) ?? findNormalizedCatalogMatch(query, items);
}

export function resolveCatalogMatch(
  query: string,
  items: CatalogItem[] = catalogItems
) {
  const exactMatch = findExactCatalogMatch(query, items);

  if (exactMatch) {
    return {
      item: exactMatch,
      matchType: "exact" as const,
    };
  }

  const normalizedMatch = findNormalizedCatalogMatch(query, items);

  if (normalizedMatch) {
    return {
      item: normalizedMatch,
      matchType: "normalized" as const,
    };
  }

  const suggestedMatch = searchCatalogItems(query, 1, items)[0] ?? null;

  if (suggestedMatch) {
    return {
      item: suggestedMatch,
      matchType: "suggested" as const,
    };
  }

  return {
    item: null,
    matchType: "unmatched" as const,
  };
}

export function findCatalogItemById(
  itemId: string,
  items: CatalogItem[] = catalogItems
) {
  return items.find((item) => item.id === itemId) ?? null;
}
