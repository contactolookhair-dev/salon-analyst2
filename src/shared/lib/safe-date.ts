function buildUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function isValidDateInstance(value: Date) {
  return !Number.isNaN(value.getTime());
}

function parseHourMinute(input: string | null | undefined) {
  if (!input) {
    return { hour: 12, minute: 0, usedFallback: true };
  }

  const match = input.trim().match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return { hour: 12, minute: 0, usedFallback: true };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: 12, minute: 0, usedFallback: true };
  }

  return { hour, minute, usedFallback: false };
}

export function getTodayChileDateString() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

export function parseSafeSaleDate(input: string | Date | null | undefined) {
  const fallbackIso = getTodayChileDateString();
  const fallbackDate = parseSafeSaleDateFromIso(fallbackIso);

  if (input instanceof Date) {
    if (isValidDateInstance(input)) {
      return {
        value: buildUtcDate(
          input.getUTCFullYear(),
          input.getUTCMonth() + 1,
          input.getUTCDate()
        ),
        isoDate: input.toISOString().slice(0, 10),
        usedFallback: false,
      };
    }

    return {
      value: fallbackDate,
      isoDate: fallbackIso,
      usedFallback: true,
    };
  }

  if (typeof input === "string" && input.trim()) {
    const normalized = input.trim();
    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return {
        value: buildUtcDate(Number(year), Number(month), Number(day)),
        isoDate: `${year}-${month}-${day}`,
        usedFallback: false,
      };
    }

    const latinMatch = normalized.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);

    if (latinMatch) {
      const [, day, month, year] = latinMatch;
      return {
        value: buildUtcDate(Number(year), Number(month), Number(day)),
        isoDate: `${year}-${month}-${day}`,
        usedFallback: false,
      };
    }

    const parsed = new Date(normalized);

    if (isValidDateInstance(parsed)) {
      const isoDate = parsed.toISOString().slice(0, 10);
      return {
        value: buildUtcDate(
          Number(isoDate.slice(0, 4)),
          Number(isoDate.slice(5, 7)),
          Number(isoDate.slice(8, 10))
        ),
        isoDate,
        usedFallback: false,
      };
    }
  }

  return {
    value: fallbackDate,
    isoDate: fallbackIso,
    usedFallback: true,
  };
}

function parseSafeSaleDateFromIso(isoDate: string) {
  const [, year, month, day] = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  return buildUtcDate(Number(year), Number(month), Number(day));
}

export function parseSafeDateTime(
  dateInput: string | Date | null | undefined,
  timeInput?: string | null
) {
  const parsedDate = parseSafeSaleDate(dateInput);
  const parsedTime = parseHourMinute(timeInput);
  const value = new Date(
    Date.UTC(
      parsedDate.value.getUTCFullYear(),
      parsedDate.value.getUTCMonth(),
      parsedDate.value.getUTCDate(),
      parsedTime.hour,
      parsedTime.minute,
      0
    )
  );

  return {
    value,
    isoDate: parsedDate.isoDate,
    time: `${String(parsedTime.hour).padStart(2, "0")}:${String(parsedTime.minute).padStart(2, "0")}`,
    usedFallback: parsedDate.usedFallback || parsedTime.usedFallback,
  };
}

export function isSafeDateString(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return !parseSafeSaleDate(value).usedFallback || value === getTodayChileDateString();
}
