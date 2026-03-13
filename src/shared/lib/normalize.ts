export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLooseName(value: string) {
  return normalizeText(value).replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function buildSearchTokens(value: string) {
  return normalizeLooseName(value)
    .split(" ")
    .filter(Boolean);
}

export function namesProbablyMatch(left: string, right: string) {
  const normalizedLeft = normalizeLooseName(left);
  const normalizedRight = normalizeLooseName(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const leftTokens = buildSearchTokens(normalizedLeft);
  const rightTokens = buildSearchTokens(normalizedRight);

  return leftTokens.every((token) => rightTokens.includes(token));
}

