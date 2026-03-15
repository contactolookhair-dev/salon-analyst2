const BUSINESS_SNAPSHOT_REFRESH_EVENT = "business-snapshot:refresh";
const SALE_MUTATION_EVENT = "business-snapshot:sale-mutation";

export type SaleMutationPayload = {
  action: "created" | "updated" | "deleted";
  professionalName?: string;
  clientName?: string;
  grossAmount?: number;
};

export function notifyBusinessSnapshotUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(BUSINESS_SNAPSHOT_REFRESH_EVENT));
}

export function notifySaleMutation(payload: SaleMutationPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(SALE_MUTATION_EVENT, { detail: payload }));
}

export function subscribeBusinessSnapshotRefresh(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = () => callback();
  window.addEventListener(BUSINESS_SNAPSHOT_REFRESH_EVENT, listener);

  return () => {
    window.removeEventListener(BUSINESS_SNAPSHOT_REFRESH_EVENT, listener);
  };
}

export function subscribeSaleMutation(
  callback: (payload: SaleMutationPayload) => void
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<SaleMutationPayload>;
    callback(customEvent.detail);
  };

  window.addEventListener(SALE_MUTATION_EVENT, listener);

  return () => {
    window.removeEventListener(SALE_MUTATION_EVENT, listener);
  };
}
