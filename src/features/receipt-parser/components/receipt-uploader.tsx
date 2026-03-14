"use client";

import { professionals } from "@/features/dashboard/data/mock-dashboard";
import { SalesEntryWorkspace } from "@/features/sales-register/components/sales-entry-workspace";

type ReceiptUploaderProps = {
  onRegistered?: () => void;
};

export function ReceiptUploader({ onRegistered }: ReceiptUploaderProps) {
  return (
    <SalesEntryWorkspace
      professionals={professionals}
      onRegistered={onRegistered}
    />
  );
}
