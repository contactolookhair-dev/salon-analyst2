"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, LoaderCircle, Plus, Search, Trash2 } from "lucide-react";

import { branches } from "@/features/branches/data/mock-branches";
import {
  catalogItems,
  normalizeCatalogName,
  type CatalogItem,
} from "@/features/configuration/data/business-rules";
import {
  loadEditableCatalog,
  saveEditableCatalog,
} from "@/features/configuration/lib/catalog-storage";
import {
  createCatalogId,
  findCatalogItemById,
  resolveCatalogMatch,
  searchCatalogItems,
} from "@/features/sales-register/lib/catalog-search";
import {
  recalculateSaleDraft,
  recalculateSaleLine,
} from "@/features/sales-register/lib/calculate-receipt-financials";
import { createEmptyManualSaleDraft } from "@/features/sales-register/lib/match-receipt-catalog";
import type {
  DuplicateSaleWarning,
  ParseReceiptApiResponse,
  PreferredProfessionalContext,
  SaleDraft,
  SaleDraftTotals,
  SaleLineDraft,
  SaveSaleApiResponse,
} from "@/features/sales-register/types";
import { getTodayChileDateString, parseSafeSaleDate } from "@/shared/lib/safe-date";
import type { QuantityUnit } from "@/shared/types/sales-processing";
import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type SalesEntryWorkspaceProps = {
  professionals: PreferredProfessionalContext[];
  onRegistered?: () => void;
  embeddedProfessional?: PreferredProfessionalContext | null;
  defaultMode?: "scan" | "manual";
  layout?: "standalone" | "embedded";
  onClose?: () => void;
};

const emptyDraft = createEmptyManualSaleDraft();

type QuickCatalogFormState = {
  name: string;
  tipo: CatalogItem["tipo"];
  categoria: string;
  price: number;
  cost: number;
  commissionValue: number;
  commissionType: CatalogItem["commission_type"];
};

function createQuickCatalogState(line: SaleLineDraft): QuickCatalogFormState {
  return {
    name: line.inputName || line.matchedCatalogName || "",
    tipo: line.itemType === "unknown" ? "product" : line.itemType,
    categoria: line.itemType === "service" ? "Peluqueria" : "Productos",
    price: line.unitPrice,
    cost: line.unitCost,
    commissionValue: line.commissionValue,
    commissionType: line.commissionType,
  };
}

function normalizeUnitLabel(value: string): QuantityUnit {
  return value === "pair" || value === "sheet" || value === "session"
    ? value
    : "unit";
}

function buildPayloadFromDraft(
  draft: SaleDraft,
  totals: SaleDraftTotals,
  professionalId: string | undefined,
  professionalName: string,
  confirmDuplicate = false
) {
  return {
    date: draft.date,
    branchName: draft.branchName,
    professionalId,
    professionalName,
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    clientPhone: draft.clientPhone,
    serviceLabel: draft.items
      .map((item) => item.matchedCatalogName ?? item.inputName)
      .filter(Boolean)
      .join(" + "),
    grossTotal: totals.grossTotal,
    subtotal: totals.subtotal,
    tax: totals.tax,
    netTotal: totals.netTotal,
    commissionTotal: totals.commissionTotal,
    costTotal: totals.costTotal,
    profitTotal: totals.profitTotal,
    receiptNumber: draft.receiptNumber,
    time: draft.time,
    issuerName: draft.issuerName,
    paymentMethod: draft.paymentMethod,
    balance: draft.balance,
    origin: draft.origin,
    items: draft.items.map((item) => ({
      originalPdfName: item.originalPdfName,
      catalogName: item.matchedCatalogName,
      type: item.itemType,
      category: item.category,
      quantity: item.quantity,
      unit: item.unitLabel,
      unitPriceCharged: item.unitPrice,
      unitPriceBase: item.baseUnitPrice,
      totalLineGross: item.grossLineTotal,
      netLine: item.netLineTotal,
      vatLine: item.vatAmount,
      unitCostBase: item.baseUnitCost,
      estimatedUnitCost: item.estimatedUnitCost,
      totalCost: item.totalCost,
      commissionType: item.commissionType,
      commissionValue: item.commissionValue,
      commissionTotal: item.commissionAmount,
      profit: item.profit,
      matchType: item.matchType,
      matchMethod: item.matchMethod,
    })),
    confirmDuplicate,
  };
}

function applyCatalogItem(
  line: SaleLineDraft,
  catalogItemId: string,
  availableCatalogItems: CatalogItem[],
  matchType: SaleLineDraft["matchType"] = "exact",
  matchMethod: SaleLineDraft["matchMethod"] = "manual"
) {
  const catalogItem = findCatalogItemById(catalogItemId, availableCatalogItems);

  if (!catalogItem) {
    return line;
  }

  return recalculateSaleLine({
    ...line,
    inputName: catalogItem.nombre,
    normalizedName: catalogItem.nombre_normalizado,
    matchedCatalogId: catalogItem.id,
    matchedCatalogName: catalogItem.nombre,
    category: catalogItem.categoria,
    itemType: catalogItem.tipo,
    quantity: line.quantity || catalogItem.default_quantity || 1,
    unitLabel: catalogItem.unit_label ?? "unit",
    priceMode: "unit",
    unitPrice: line.unitPrice || catalogItem.precio_venta_bruto || 0,
    baseUnitPrice: catalogItem.precio_venta_bruto || 0,
    commissionType: catalogItem.commission_type,
    commissionValue: catalogItem.commission_value,
    commissionBase: catalogItem.commission_base ?? "net",
    unitCost: catalogItem.costo,
    baseUnitCost: catalogItem.costo,
    estimatedUnitCost: catalogItem.costo,
    catalogItem,
    matchType,
    matchMethod,
    warnings:
      catalogItem.estado_configuracion === "incompleto"
        ? [
            catalogItem.tipo === "product"
              ? "Producto con configuración incompleta."
              : "Servicio con configuración incompleta.",
          ]
        : [],
  });
}

export function SalesEntryWorkspace({
  professionals,
  onRegistered,
  embeddedProfessional = null,
  defaultMode = "scan",
  layout = "standalone",
  onClose,
}: SalesEntryWorkspaceProps) {
  const [mode, setMode] = useState<"scan" | "manual">(defaultMode);
  const [file, setFile] = useState<File | null>(null);
  const [selectedProfessional, setSelectedProfessional] =
    useState<PreferredProfessionalContext | null>(embeddedProfessional);
  const [professionalQuery, setProfessionalQuery] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    embeddedProfessional?.branchIds.length === 1
      ? embeddedProfessional.branchIds[0]
      : ""
  );
  const [availableCatalogItems, setAvailableCatalogItems] =
    useState<CatalogItem[]>(catalogItems);
  const [catalogForms, setCatalogForms] = useState<Record<string, QuickCatalogFormState>>({});
  const [draft, setDraft] = useState<SaleDraft>(emptyDraft);
  const [{ grossTotal, commissionTotal, costTotal, profitTotal }, setTotals] =
    useState<SaleDraftTotals>(recalculateSaleDraft(emptyDraft).totals);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [receiptDateChoice, setReceiptDateChoice] =
    useState<"receipt" | "today">("today");
  const [detectedReceiptDate, setDetectedReceiptDate] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateSaleWarning | null>(null);
  const [detectedProfessionalConflict, setDetectedProfessionalConflict] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [partialError, setPartialError] = useState<string | null>(null);
  const [partialPreview, setPartialPreview] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const branchOptions = useMemo(() => branches.map((branch) => branch.name), []);
  const professionalOptions = useMemo(
    () => professionals.filter((professional) => professional.active),
    [professionals]
  );
  const filteredProfessionalOptions = useMemo(() => {
    const query = professionalQuery.trim().toLowerCase();

    if (!query) {
      return professionalOptions;
    }

    return professionalOptions.filter((professional) => {
      const haystack = [
        professional.name,
        professional.role,
        ...professional.branchIds.map(
          (branchId) => branches.find((branch) => branch.id === branchId)?.name ?? branchId
        ),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [professionalOptions, professionalQuery]);
  const today = useMemo(() => getTodayChileDateString(), []);
  const isEmbedded = layout === "embedded";
  const canStartStandaloneFlow = isEmbedded || Boolean(selectedProfessional);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    setAvailableCatalogItems(loadEditableCatalog());
  }, []);

  useEffect(() => {
    if (!embeddedProfessional) {
      return;
    }

    const nextBranchId =
      embeddedProfessional.branchIds.length === 1
        ? embeddedProfessional.branchIds[0]
        : embeddedProfessional.branchIds.includes(selectedBranchId as typeof embeddedProfessional.branchIds[number])
          ? selectedBranchId
          : embeddedProfessional.branchIds[0] ?? "";

    setSelectedProfessional(embeddedProfessional);
    setSelectedBranchId(nextBranchId);

    updateDraft({
      ...draft,
      professionalName: embeddedProfessional.name,
      branchName:
        nextBranchId && branches.find((branch) => branch.id === nextBranchId)?.name
          ? (branches.find((branch) => branch.id === nextBranchId)?.name ?? draft.branchName)
          : draft.branchName,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embeddedProfessional]);

  function updateDraft(nextDraft: SaleDraft) {
    const recalculated = recalculateSaleDraft(nextDraft);
    setDraft(recalculated.draft);
    setTotals(recalculated.totals);
  }

  function selectProfessional(nextProfessional: PreferredProfessionalContext | null) {
    const nextBranchId =
      nextProfessional?.branchIds.length === 1
        ? nextProfessional.branchIds[0]
        : "";

    setSelectedProfessional(nextProfessional);
    setSelectedBranchId(nextBranchId);

    if (nextProfessional) {
      const nextDraft = createEmptyManualSaleDraft();
      updateDraft({
        ...nextDraft,
        professionalName: nextProfessional.name,
        branchName: nextBranchId
          ? (branches.find((branch) => branch.id === nextBranchId)?.name ?? "")
          : "",
      });
      return;
    }

    updateDraft(createEmptyManualSaleDraft());
  }

  function resetEditorState() {
    setIsEditorOpen(false);
    setDetectedReceiptDate(null);
    setReceiptDateChoice("today");
    setDuplicateWarning(null);
    setDetectedProfessionalConflict(null);
  }

  function applyDraftDate(nextDate: string) {
    updateDraft({
      ...draft,
      date: nextDate,
    });
  }

  function saveCustomCatalogItem(item: CatalogItem) {
    setAvailableCatalogItems((currentItems) => {
      const nextItems = Array.from(
        new Map([...currentItems, item].map((entry) => [entry.id, entry])).values()
      );

      try {
        saveEditableCatalog(nextItems);
      } catch (error) {
        console.warn("[sales-entry-workspace] catalog_storage_save_failed", error);
      }

      return nextItems;
    });
  }

  async function handleScan(
    targetFile?: File | null,
    preferredProfessional?: PreferredProfessionalContext | null
  ) {
    const fileToProcess = targetFile ?? file;

    if (!fileToProcess) {
      setPartialError("Adjunta un PDF o imagen antes de procesar.");
      return;
    }

    try {
      setIsParsing(true);
      setPartialError(null);
      setPartialPreview("");
      if (preferredProfessional) {
        setSelectedProfessional(preferredProfessional);
      }
      if (targetFile) {
        setFile(targetFile);
      }

      const formData = new FormData();
      formData.append("file", fileToProcess);
      const professionalContext = preferredProfessional ?? selectedProfessional;

      if (professionalContext) {
        formData.append("preferredProfessionalId", professionalContext.id);
        formData.append("preferredProfessionalName", professionalContext.name);
      }

      if (selectedBranchId) {
        const preferredBranch = branches.find((branch) => branch.id === selectedBranchId);

        if (preferredBranch) {
          formData.append("preferredBranchId", preferredBranch.id);
          formData.append("preferredBranchName", preferredBranch.name);
        }
      }

      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ParseReceiptApiResponse;

      if (!payload.success) {
        setWarnings(payload.warnings);
        setPartialError(payload.error);
        setPartialPreview(payload.partial.extractedTextPreview);
        return;
      }

      const parsedReceiptDate = payload.data.extraction.date
        ? parseSafeSaleDate(payload.data.extraction.date)
        : null;
      const hasDetectedReceiptDate =
        parsedReceiptDate && !parsedReceiptDate.usedFallback;
      const nextDate =
        hasDetectedReceiptDate && parsedReceiptDate
          ? parsedReceiptDate.isoDate
          : getTodayChileDateString();

      setMode("scan");
      setWarnings(payload.warnings);
      setDuplicateWarning(null);
      setDetectedProfessionalConflict(
        embeddedProfessional &&
          payload.data.context?.originalDetectedProfessionalName &&
          payload.data.context.originalDetectedProfessionalName.trim() &&
          payload.data.context.originalDetectedProfessionalName.trim().toLowerCase() !==
            embeddedProfessional.name.trim().toLowerCase()
          ? payload.data.context.originalDetectedProfessionalName.trim()
          : null
      );
      setDetectedReceiptDate(hasDetectedReceiptDate ? nextDate : null);
      setReceiptDateChoice(hasDetectedReceiptDate ? "receipt" : "today");
      updateDraft({
        ...payload.data.draft,
        date: nextDate,
      });
      setIsEditorOpen(true);
    } catch (error) {
      setPartialError(
        error instanceof Error
          ? error.message
          : "No se pudo procesar el documento."
      );
    } finally {
      setIsParsing(false);
    }
  }

  function updateLine(lineId: string, updater: (line: SaleLineDraft) => SaleLineDraft) {
    updateDraft({
      ...draft,
      items: draft.items.map((line) =>
        line.id === lineId ? updater(line) : line
      ),
    });
  }

  async function handleSave(confirmDuplicate = false) {
    try {
      setIsSaving(true);
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildPayloadFromDraft(
            draft,
            {
              subtotal: draft.subtotal,
              tax: draft.tax,
              grossTotal,
              netTotal: draft.netTotal,
              totalPaid: draft.totalPaid,
              commissionTotal,
              costTotal,
              profitTotal,
            },
            selectedProfessional?.id,
            selectedProfessional?.name ?? draft.professionalName,
            confirmDuplicate
          )
        ),
      });

      const payload = (await response.json()) as SaveSaleApiResponse;

      if (response.status === 409 && !payload.success) {
        setDuplicateWarning(payload.duplicate ?? null);
        setPartialError(payload.error);
        return;
      }

      if (!response.ok) {
        throw new Error(
          !payload.success ? payload.error : "No se pudo guardar la venta."
        );
      }

      if (!payload.success) {
        throw new Error(payload.error);
      }

      setWarnings([payload.message]);
      onRegistered?.();
      const resetDraft = createEmptyManualSaleDraft();
      const preservedProfessional = embeddedProfessional ?? selectedProfessional;
      const preservedBranchId =
        selectedBranchId ||
        (preservedProfessional?.branchIds.length === 1
          ? preservedProfessional.branchIds[0]
          : "");
      updateDraft(
        preservedProfessional
          ? {
              ...resetDraft,
              professionalName: preservedProfessional.name,
              branchName:
                preservedBranchId &&
                branches.find((branch) => branch.id === preservedBranchId)?.name
                  ? (branches.find((branch) => branch.id === preservedBranchId)?.name ?? "")
                  : "",
            }
          : resetDraft
      );
      setFile(null);
      setSelectedProfessional(preservedProfessional ?? null);
      setSelectedBranchId(preservedBranchId);
      resetEditorState();
      setPartialError(null);
      setPartialPreview("");
      if (isEmbedded) {
        onClose?.();
      }
    } catch (error) {
      setPartialError(
        error instanceof Error ? error.message : "No se pudo guardar la venta."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={isEmbedded ? "space-y-4" : "space-y-6"}>
      <Card className={`space-y-5 ${isEmbedded ? "border border-olive-950/10 bg-[#fdfbf6]" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-olive-700">
              {isEmbedded ? "Registro contextual" : "Registro de ventas"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-olive-950">
              Escaneo con rescate asistido y carga manual
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {embeddedProfessional
                ? `Todo lo que registres aquí quedará asociado automáticamente a ${embeddedProfessional.name}.`
                : "Puedes partir desde boleta o registrar a mano. En ambos casos el catálogo completa costo, comisión y cálculo financiero."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEmbedded ? (
              <div className="min-w-[320px] flex-1 space-y-3 lg:max-w-2xl">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-olive-950">
                    Selecciona primero al trabajador
                  </p>
                  <p className="text-xs text-muted-foreground">
                    El registro se asociará al trabajador que elijas aquí.
                  </p>
                </div>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-olive-700" />
                  <input
                    value={professionalQuery}
                    onChange={(event) => setProfessionalQuery(event.target.value)}
                    placeholder="Buscar trabajador por nombre, cargo o sucursal"
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-11 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredProfessionalOptions.map((professional) => {
                    const isSelected = selectedProfessional?.id === professional.id;

                    return (
                      <button
                        key={professional.id}
                        type="button"
                        onClick={() => selectProfessional(professional)}
                        className={`rounded-[20px] border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-olive-950 bg-olive-950 text-white shadow-[0_14px_24px_rgba(24,30,20,0.16)]"
                            : "border-olive-950/10 bg-white text-olive-950 hover:border-olive-950/25 hover:bg-[#f7f4ea]"
                        }`}
                      >
                        <p className="text-sm font-semibold leading-tight">
                          {professional.name}
                        </p>
                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            isSelected ? "text-white/75" : "text-muted-foreground"
                          }`}
                        >
                          {professional.role}
                        </p>
                        <p
                          className={`mt-2 text-[11px] uppercase tracking-[0.14em] ${
                            isSelected ? "text-white/65" : "text-olive-700"
                          }`}
                        >
                          {professional.branchIds
                            .map(
                              (branchId) =>
                                branches.find((branch) => branch.id === branchId)?.name ?? branchId
                            )
                            .join(" · ")}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {!filteredProfessionalOptions.length ? (
                  <div className="rounded-2xl border border-dashed border-olive-950/10 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
                    No encontré trabajadores con ese criterio.
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="inline-flex rounded-full border border-olive-950/10 bg-[#f4f1e7] p-1">
              {(["scan", "manual"] as const).map((entryMode) => (
                <button
                  key={entryMode}
                  type="button"
                  onClick={() => {
                    setMode(entryMode);
                    if (entryMode === "manual") {
                      const nextDraft = createEmptyManualSaleDraft();
                      updateDraft(
                        selectedProfessional
                          ? {
                              ...nextDraft,
                              professionalName: selectedProfessional.name,
                              branchName:
                                selectedBranchId
                                  ? (branches.find((branch) => branch.id === selectedBranchId)?.name ?? "")
                                  : nextDraft.branchName,
                            }
                          : nextDraft
                      );
                      setDetectedReceiptDate(null);
                      setReceiptDateChoice("today");
                      setDuplicateWarning(null);
                      setIsEditorOpen(true);
                    }
                  }}
                  disabled={!canStartStandaloneFlow}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    mode === entryMode
                      ? "bg-olive-950 text-white"
                      : "text-olive-950"
                  } ${!canStartStandaloneFlow ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {entryMode === "scan" ? "Escanear boleta" : "Registro manual"}
                </button>
              ))}
            </div>
            {isEmbedded && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-olive-950/10 bg-white px-4 py-2 text-sm font-semibold text-olive-950"
              >
                Cerrar
              </button>
            ) : null}
          </div>
        </div>

        {mode === "scan" ? (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-olive-950/8 bg-white/70 p-4 text-sm text-muted-foreground">
              {embeddedProfessional
                ? `Esta boleta se asociará automáticamente a ${embeddedProfessional.name}.`
                : selectedProfessional
                  ? `La próxima boleta se asociará al profesional ${selectedProfessional.name}. Si el PDF trae otro nombre, se priorizará el del bloque.`
                  : "Primero selecciona el trabajador y luego elige si quieres escanear boleta o registrar manualmente."}
            </div>

            {embeddedProfessional && embeddedProfessional.branchIds.length > 1 ? (
              <label className="space-y-2 text-sm">
                <span className="font-medium text-olive-950">Sucursal de registro</span>
                <select
                  value={selectedBranchId}
                  onChange={(event) => {
                    const nextBranchId = event.target.value;
                    setSelectedBranchId(nextBranchId);
                    const nextBranchName =
                      branches.find((branch) => branch.id === nextBranchId)?.name ?? "";
                    updateDraft({
                      ...draft,
                      branchName: nextBranchName,
                    });
                  }}
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                >
                  <option value="">Seleccionar sucursal</option>
                  {embeddedProfessional.branchIds.map((branchId) => (
                    <option key={`${embeddedProfessional.id}-${branchId}`} value={branchId}>
                      {branches.find((branch) => branch.id === branchId)?.name ?? branchId}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="flex cursor-pointer items-center gap-3 rounded-[24px] border border-dashed border-olive-950/15 bg-[#fbfaf6] px-5 py-6">
                <FileUp className="size-5 text-olive-700" />
                <div>
                  <p className="font-medium text-olive-950">
                    {file ? file.name : "Seleccionar PDF o imagen"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Si la lectura estructurada falla, el sistema rescata datos parciales.
                  </p>
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf,image/*"
                  className="hidden"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => void handleScan()}
                disabled={
                  !canStartStandaloneFlow ||
                  isParsing ||
                  Boolean(embeddedProfessional && embeddedProfessional.branchIds.length > 1 && !selectedBranchId)
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isParsing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Procesar documento
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] px-5 py-4 text-sm text-muted-foreground">
            Empieza escribiendo cliente, profesional y líneas. El catálogo sugerirá
            servicios y productos al escribir.
          </div>
        )}

        {partialError ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">{partialError}</p>
            {partialPreview ? <p className="mt-2">{partialPreview}</p> : null}
          </div>
        ) : null}

        {warnings.length ? (
          <div className="rounded-[24px] border border-olive-950/8 bg-white/80 p-4 text-sm">
            <p className="font-semibold text-olive-950">Warnings</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 md:items-center">
          <Card className="max-h-[92vh] w-full max-w-6xl overflow-y-auto border border-olive-950/10 bg-[#fcfaf5] shadow-[0_30px_80px_rgba(25,29,20,0.28)]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-olive-700">
                    Registrar venta
                  </p>
                  <h4 className="mt-2 text-2xl font-semibold text-olive-950">
                    {selectedProfessional
                      ? `Venta para ${selectedProfessional.name}`
                      : "Revisión y confirmación de venta"}
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Revisa los datos detectados, corrige lo necesario y guarda la venta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetEditorState();
                    setPartialError(null);
                    if (isEmbedded) {
                      onClose?.();
                    }
                  }}
                  className="rounded-full border border-olive-950/10 bg-white px-4 py-2 text-sm font-semibold text-olive-950"
                >
                  Cerrar
                </button>
              </div>

              {detectedReceiptDate ? (
                <div className="rounded-[24px] border border-olive-950/8 bg-white/80 p-4">
                  <p className="text-sm font-semibold text-olive-950">
                    Fecha detectada en la boleta
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    ¿Quieres registrar la venta en la fecha que indica la boleta o en el día de hoy?
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptDateChoice("receipt");
                        applyDraftDate(detectedReceiptDate);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        receiptDateChoice === "receipt"
                          ? "bg-olive-950 text-white"
                          : "border border-olive-950/10 bg-white text-olive-950"
                      }`}
                    >
                      Usar fecha de la boleta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptDateChoice("today");
                        applyDraftDate(today);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        receiptDateChoice === "today"
                          ? "bg-olive-950 text-white"
                          : "border border-olive-950/10 bg-white text-olive-950"
                      }`}
                    >
                      Usar fecha de hoy
                    </button>
                  </div>
                </div>
              ) : null}

              {duplicateWarning ? (
                <div
                  className={`rounded-[24px] border p-4 text-sm ${
                    duplicateWarning.severity === "high"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <p className="font-semibold">{duplicateWarning.message}</p>
                  <p className="mt-2">
                    Registro existente: {duplicateWarning.existingSale.date} ·{" "}
                    {duplicateWarning.existingSale.professional} ·{" "}
                    {duplicateWarning.existingSale.clientName} ·{" "}
                    {duplicateWarning.existingSale.service} ·{" "}
                    {formatCurrency(duplicateWarning.existingSale.total)}
                  </p>
                  {duplicateWarning.allowOverride ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => void handleSave(true)}
                        disabled={isSaving}
                        className="rounded-full bg-olive-950 px-4 py-2 font-semibold text-white disabled:opacity-60"
                      >
                        Guardar de todas formas
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {detectedProfessionalConflict ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Posible conflicto de profesional</p>
                  <p className="mt-2">
                    La boleta parece mencionar a <strong>{detectedProfessionalConflict}</strong>.
                    Puedes mantener el trabajador de esta tarjeta o usar el profesional detectado.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!embeddedProfessional) {
                          return;
                        }

                        setSelectedProfessional(embeddedProfessional);
                        updateDraft({
                          ...draft,
                          professionalName: embeddedProfessional.name,
                        });
                      }}
                      className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Mantener trabajador de la tarjeta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const matchedProfessional =
                          professionalOptions.find(
                            (professional) =>
                              professional.name.trim().toLowerCase() ===
                              detectedProfessionalConflict.trim().toLowerCase()
                          ) ?? null;

                        setSelectedProfessional(matchedProfessional);
                        updateDraft({
                          ...draft,
                          professionalName:
                            matchedProfessional?.name ?? detectedProfessionalConflict,
                        });
                        setDetectedProfessionalConflict(null);
                      }}
                      className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
                    >
                      Usar profesional detectado
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Cliente</span>
                  <input
                    value={draft.clientName}
                    onChange={(event) =>
                      updateDraft({ ...draft, clientName: event.target.value })
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Profesional</span>
                  <input
                    list="professional-suggestions"
                    value={selectedProfessional?.name ?? draft.professionalName}
                    onChange={(event) =>
                      updateDraft({ ...draft, professionalName: event.target.value })
                    }
                    disabled={Boolean(embeddedProfessional && selectedProfessional)}
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                  <datalist id="professional-suggestions">
                    {professionalOptions.map((professional) => (
                      <option key={professional.id} value={professional.name} />
                    ))}
                  </datalist>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Sucursal</span>
                  {embeddedProfessional ? (
                    <select
                      value={selectedBranchId}
                      onChange={(event) => {
                        const nextBranchId = event.target.value;
                        setSelectedBranchId(nextBranchId);
                        updateDraft({
                          ...draft,
                          branchName:
                            branches.find((branch) => branch.id === nextBranchId)?.name ?? "",
                        });
                      }}
                      className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                    >
                      <option value="">Seleccionar sucursal</option>
                      {embeddedProfessional.branchIds.map((branchId) => (
                        <option key={`editor-${embeddedProfessional.id}-${branchId}`} value={branchId}>
                          {branches.find((branch) => branch.id === branchId)?.name ?? branchId}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        list="branch-suggestions"
                        value={draft.branchName}
                        onChange={(event) =>
                          updateDraft({ ...draft, branchName: event.target.value })
                        }
                        className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                      />
                      <datalist id="branch-suggestions">
                        {branchOptions.map((branchName) => (
                          <option key={branchName} value={branchName} />
                        ))}
                      </datalist>
                    </>
                  )}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Fecha</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => applyDraftDate(event.target.value)}
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">N° documento</span>
                  <input
                    value={draft.receiptNumber}
                    onChange={(event) =>
                      updateDraft({ ...draft, receiptNumber: event.target.value })
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Medio de pago</span>
                  <input
                    value={draft.paymentMethod}
                    onChange={(event) =>
                      updateDraft({ ...draft, paymentMethod: event.target.value })
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Email cliente</span>
                  <input
                    value={draft.clientEmail}
                    onChange={(event) =>
                      updateDraft({ ...draft, clientEmail: event.target.value })
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Teléfono cliente</span>
                  <input
                    value={draft.clientPhone}
                    onChange={(event) =>
                      updateDraft({ ...draft, clientPhone: event.target.value })
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Hora</span>
                  <input
                    value={draft.time}
                    onChange={(event) =>
                      updateDraft({ ...draft, time: event.target.value })
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
              </div>

              <div className="space-y-4">
                {draft.items.map((line) => {
                  const suggestions = searchCatalogItems(
                    line.inputName,
                    6,
                    availableCatalogItems
                  );
                  const catalogForm = catalogForms[line.id] ?? createQuickCatalogState(line);

                  return (
                    <div
                      key={line.id}
                      className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-olive-950/5 px-3 py-1 font-medium text-olive-950">
                          {line.itemType === "service"
                            ? "Servicio"
                            : line.itemType === "product"
                              ? "Producto"
                              : "Sin configurar"}
                        </span>
                        {line.category ? (
                          <span className="rounded-full bg-white px-3 py-1 text-muted-foreground">
                            {line.category}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-white px-3 py-1 text-muted-foreground">
                          {line.matchMethod === "exacto"
                            ? "Coincidencia exacta"
                            : line.matchMethod === "normalizado"
                              ? "Coincidencia normalizada"
                              : line.matchMethod === "sugerido"
                                ? "Coincidencia sugerida"
                                : line.matchMethod === "manual"
                                  ? "Corrección manual"
                                  : "Sin configurar"}
                        </span>
                        {line.matchedCatalogName ? (
                          <span className="rounded-full bg-white px-3 py-1 text-muted-foreground">
                            Catálogo: {line.matchedCatalogName}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[2.3fr_0.7fr_0.9fr_0.9fr_0.9fr_0.6fr]">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-olive-950">
                            Servicio / producto
                          </label>
                          <input
                            list={`catalog-${line.id}`}
                            value={line.inputName}
                            onChange={(event) =>
                              updateLine(line.id, (currentLine) => {
                                const nextLine = {
                                  ...currentLine,
                                  inputName: event.target.value,
                                  normalizedName: event.target.value,
                                };
                                const resolvedMatch = resolveCatalogMatch(
                                  event.target.value,
                                  availableCatalogItems
                                );

                                if (!resolvedMatch.item) {
                                  return recalculateSaleLine({
                                    ...nextLine,
                                    matchType: "unmatched",
                                    matchMethod: "sin_configurar",
                                  });
                                }

                                return applyCatalogItem(
                                  nextLine,
                                  resolvedMatch.item.id,
                                  availableCatalogItems,
                                  resolvedMatch.matchType,
                                  resolvedMatch.matchType === "exact"
                                    ? "exacto"
                                    : resolvedMatch.matchType === "normalized"
                                      ? "normalizado"
                                      : resolvedMatch.matchType === "suggested"
                                        ? "sugerido"
                                        : "sin_configurar"
                                );
                              })
                            }
                            className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                          />
                          <datalist id={`catalog-${line.id}`}>
                            {suggestions.map((item) => (
                              <option key={item.id} value={item.nombre} />
                            ))}
                          </datalist>
                        </div>

                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-olive-950">Cantidad</span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.id, (currentLine) =>
                                recalculateSaleLine({
                                  ...currentLine,
                                  quantity: Number(event.target.value) || 1,
                                })
                              )
                            }
                            className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-olive-950">Unidad</span>
                          <select
                            value={line.unitLabel}
                            onChange={(event) =>
                              updateLine(line.id, (currentLine) =>
                                recalculateSaleLine({
                                  ...currentLine,
                                  unitLabel: normalizeUnitLabel(event.target.value),
                                })
                              )
                            }
                            className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                          >
                            <option value="unit">Unidad</option>
                            <option value="pair">Par</option>
                            <option value="sheet">Lámina</option>
                            <option value="session">Sesión</option>
                          </select>
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-olive-950">Precio</span>
                          <input
                            type="number"
                            min={0}
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.id, (currentLine) =>
                                recalculateSaleLine({
                                  ...currentLine,
                                  unitPrice: Number(event.target.value) || 0,
                                })
                              )
                            }
                            className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                          />
                          <p className="text-xs text-muted-foreground">Precio unitario</p>
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-olive-950">Costo</span>
                          <input
                            type="number"
                            min={0}
                            value={line.unitCost}
                            onChange={(event) =>
                              updateLine(line.id, (currentLine) =>
                                recalculateSaleLine({
                                  ...currentLine,
                                  unitCost: Number(event.target.value) || 0,
                                })
                              )
                            }
                            className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                          />
                          <p className="text-xs text-muted-foreground">Costo unitario</p>
                        </label>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft({
                                ...draft,
                                items: draft.items.filter((item) => item.id !== line.id),
                              })
                            }
                            className="inline-flex size-11 items-center justify-center rounded-2xl border border-olive-950/10 bg-white text-olive-950"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <div className="rounded-2xl bg-white/90 p-3 text-sm">
                          <p className="text-muted-foreground">Bruto total línea</p>
                          <p className="mt-1 font-semibold text-olive-950">
                            {formatCurrency(line.grossLineTotal)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/90 p-3 text-sm">
                          <p className="text-muted-foreground">Neto total línea</p>
                          <p className="mt-1 font-semibold text-olive-950">
                            {formatCurrency(line.netLineTotal)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/90 p-3 text-sm">
                          <p className="text-muted-foreground">IVA total línea</p>
                          <p className="mt-1 font-semibold text-olive-950">
                            {formatCurrency(line.vatAmount)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/90 p-3 text-sm">
                          <p className="text-muted-foreground">Comisión total línea</p>
                          <p className="mt-1 font-semibold text-olive-950">
                            {formatCurrency(line.commissionAmount)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/90 p-3 text-sm">
                          <p className="text-muted-foreground">Costo total línea</p>
                          <p className="mt-1 font-semibold text-olive-950">
                            {formatCurrency(line.totalCost)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/90 p-3 text-sm">
                          <p className="text-muted-foreground">Utilidad línea</p>
                          <p className="mt-1 font-semibold text-olive-950">
                            {formatCurrency(line.profit)}
                          </p>
                        </div>
                      </div>

                      {line.warnings.length ? (
                        <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          <p className="font-semibold">Revisar antes de guardar</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {line.warnings.map((warning, warningIndex) => (
                              <li key={`${line.id}-warning-${warningIndex}`}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {!line.catalogItem ? (
                        <div className="mt-4 rounded-[20px] border border-dashed border-olive-950/12 bg-white/80 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-olive-950">
                                Item sin configurar
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Puedes agregarlo rápido al catálogo sin salir del registro.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setCatalogForms((current) => ({
                                  ...current,
                                  [line.id]: createQuickCatalogState(line),
                                }))
                              }
                              className="rounded-full border border-olive-950/10 bg-white px-4 py-2 text-sm font-semibold text-olive-950"
                            >
                              Agregar al catálogo
                            </button>
                          </div>

                          {catalogForms[line.id] ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-olive-950">Nombre</span>
                                <input
                                  value={catalogForm.name}
                                  onChange={(event) =>
                                    setCatalogForms((current) => ({
                                      ...current,
                                      [line.id]: {
                                        ...catalogForm,
                                        name: event.target.value,
                                      },
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-olive-950">Tipo</span>
                                <select
                                  value={catalogForm.tipo}
                                  onChange={(event) =>
                                    setCatalogForms((current) => ({
                                      ...current,
                                      [line.id]: {
                                        ...catalogForm,
                                        tipo: event.target.value as CatalogItem["tipo"],
                                      },
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                                >
                                  <option value="service">Servicio</option>
                                  <option value="product">Producto</option>
                                </select>
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-olive-950">Categoría</span>
                                <input
                                  value={catalogForm.categoria}
                                  onChange={(event) =>
                                    setCatalogForms((current) => ({
                                      ...current,
                                      [line.id]: {
                                        ...catalogForm,
                                        categoria: event.target.value,
                                      },
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-olive-950">Precio</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={catalogForm.price}
                                  onChange={(event) =>
                                    setCatalogForms((current) => ({
                                      ...current,
                                      [line.id]: {
                                        ...catalogForm,
                                        price: Number(event.target.value) || 0,
                                      },
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-olive-950">Costo</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={catalogForm.cost}
                                  onChange={(event) =>
                                    setCatalogForms((current) => ({
                                      ...current,
                                      [line.id]: {
                                        ...catalogForm,
                                        cost: Number(event.target.value) || 0,
                                      },
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                                />
                              </label>
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-2 text-sm">
                                  <span className="font-medium text-olive-950">
                                    Tipo comisión
                                  </span>
                                  <select
                                    value={catalogForm.commissionType}
                                    onChange={(event) =>
                                      setCatalogForms((current) => ({
                                        ...current,
                                        [line.id]: {
                                          ...catalogForm,
                                          commissionType:
                                            event.target.value as CatalogItem["commission_type"],
                                        },
                                      }))
                                    }
                                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                                  >
                                    <option value="percentage">Porcentaje</option>
                                    <option value="fixed">Monto fijo</option>
                                    <option value="none">Sin comisión</option>
                                  </select>
                                </label>
                                <label className="space-y-2 text-sm">
                                  <span className="font-medium text-olive-950">Comisión</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={catalogForm.commissionValue}
                                    onChange={(event) =>
                                      setCatalogForms((current) => ({
                                        ...current,
                                        [line.id]: {
                                          ...catalogForm,
                                          commissionValue: Number(event.target.value) || 0,
                                        },
                                      }))
                                    }
                                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                                  />
                                </label>
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const normalizedName = normalizeCatalogName(catalogForm.name);
                                    const nextItem: CatalogItem = {
                                      id: createCatalogId(catalogForm.name),
                                      categoria: catalogForm.categoria,
                                      tipo: catalogForm.tipo,
                                      nombre: catalogForm.name,
                                      nombre_normalizado: normalizedName,
                                      precio_venta_bruto: catalogForm.price,
                                      costo: catalogForm.cost,
                                      tipo_comision:
                                        catalogForm.commissionType === "percentage"
                                          ? "porcentaje"
                                          : catalogForm.commissionType === "fixed"
                                            ? "monto_fijo"
                                            : "sin_comision",
                                      valor_comision: catalogForm.commissionValue,
                                      activo: true,
                                      estado_configuracion:
                                        catalogForm.price > 0 &&
                                        (catalogForm.tipo === "product" ||
                                          catalogForm.cost > 0)
                                          ? "completo"
                                          : "incompleto",
                                      aliases: [],
                                      active: true,
                                      commission_type: catalogForm.commissionType,
                                      commission_value: catalogForm.commissionValue,
                                      commission_base: "net",
                                      default_quantity: 1,
                                      unit_label: "unit",
                                    };

                                    saveCustomCatalogItem(nextItem);
                                    updateLine(line.id, (currentLine) =>
                                      applyCatalogItem(
                                        currentLine,
                                        nextItem.id,
                                        [...availableCatalogItems, nextItem],
                                        "exact",
                                        "manual"
                                      )
                                    );
                                    setCatalogForms((current) => {
                                      const nextState = { ...current };
                                      delete nextState[line.id];
                                      return nextState;
                                    });
                                  }}
                                  className="w-full rounded-full bg-olive-950 px-4 py-3 text-sm font-semibold text-white"
                                >
                                  Guardar en catálogo
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  updateDraft({
                    ...draft,
                    items: [
                      ...draft.items,
                      recalculateSaleLine({
                        id: crypto.randomUUID(),
                        inputName: "",
                        normalizedName: "",
                        originalPdfName: "",
                        matchedCatalogId: null,
                        matchedCatalogName: "",
                        category: "",
                        itemType: "unknown",
                        quantity: 1,
                        unitLabel: "unit",
                        priceMode: "unit",
                        unitPrice: 0,
                        baseUnitPrice: 0,
                        sourceLineTotal: 0,
                        grossLineTotal: 0,
                        netLineTotal: 0,
                        vatAmount: 0,
                        commissionType: "none",
                        commissionBase: "net",
                        commissionValue: 0,
                        commissionAmount: 0,
                        unitCost: 0,
                        baseUnitCost: 0,
                        estimatedUnitCost: 0,
                        totalCost: 0,
                        profit: 0,
                        status: "requires_review",
                        warnings: [],
                        matchType: "unmatched",
                        matchMethod: "manual",
                        catalogItem: null,
                      }),
                    ],
                  })
                }
                className="inline-flex items-center gap-2 rounded-full border border-olive-950/10 bg-white px-4 py-2 text-sm font-semibold text-olive-950"
              >
                <Plus className="size-4" />
                Agregar línea
              </button>

              <div className="grid gap-4 lg:grid-cols-6">
                <div className="rounded-[24px] bg-[#fbfaf6] p-4">
                  <p className="text-sm text-muted-foreground">Bruto total</p>
                  <p className="mt-2 text-2xl font-semibold text-olive-950">
                    {formatCurrency(grossTotal)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#fbfaf6] p-4">
                  <p className="text-sm text-muted-foreground">Neto total</p>
                  <p className="mt-2 text-2xl font-semibold text-olive-950">
                    {formatCurrency(draft.netTotal)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#fbfaf6] p-4">
                  <p className="text-sm text-muted-foreground">IVA total</p>
                  <p className="mt-2 text-2xl font-semibold text-olive-950">
                    {formatCurrency(draft.tax)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#fbfaf6] p-4">
                  <p className="text-sm text-muted-foreground">Comisiones</p>
                  <p className="mt-2 text-2xl font-semibold text-olive-950">
                    {formatCurrency(commissionTotal)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#fbfaf6] p-4">
                  <p className="text-sm text-muted-foreground">Costos</p>
                  <p className="mt-2 text-2xl font-semibold text-olive-950">
                    {formatCurrency(costTotal)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-olive-950 p-4 text-white">
                  <p className="text-sm text-white/70">Utilidad estimada</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatCurrency(profitTotal)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetEditorState();
                    setPartialError(null);
                    if (isEmbedded) {
                      onClose?.();
                    }
                  }}
                  className="rounded-full border border-olive-950/10 bg-white px-5 py-3 text-sm font-semibold text-olive-950"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Guardando..." : "Guardar venta"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
