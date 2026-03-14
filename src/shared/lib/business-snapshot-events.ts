const BUSINESS_SNAPSHOT_REFRESH_EVENT = "business-snapshot:refresh";

export function notifyBusinessSnapshotUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(BUSINESS_SNAPSHOT_REFRESH_EVENT));
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
