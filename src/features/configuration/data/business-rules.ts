import { normalizeLooseName } from "@/shared/lib/normalize";
import type { BranchId } from "@/shared/types/business";
import type { BusinessCatalogItem, QuantityUnit } from "@/shared/types/sales-processing";
import { masterProductSeeds } from "@/features/configuration/data/master-products";

export type CatalogConfigurationStatus = "completo" | "incompleto";
export type CatalogCommissionType = "percentage" | "fixed" | "none";
export type CatalogItemType = "service" | "product";

export type CatalogItem = {
  id: string;
  categoria: string;
  tipo: CatalogItemType;
  nombre: string;
  nombre_normalizado: string;
  aliases?: string[];
  precio_venta_bruto: number;
  costo: number;
  tipo_comision: "porcentaje" | "monto_fijo" | "sin_comision";
  valor_comision: number;
  activo: boolean;
  estado_configuracion: CatalogConfigurationStatus;
  commission_type: CatalogCommissionType;
  commission_value: number;
  commission_base?: "net" | "gross" | "unit";
  default_quantity?: number;
  unit_label?: QuantityUnit;
  active: boolean;
  branchIds?: BranchId[];
  deduplicado_interno?: boolean;
  filas_duplicadas?: string[];
};

function sanitizeCatalogName(value: string) {
  return value.replace(/\s+-\s+From$/i, "").trim();
}

export function normalizeCatalogName(value: string) {
  return normalizeLooseName(sanitizeCatalogName(value))
    .replace(/\bfrom\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type CatalogSeedInput = Omit<
  CatalogItem,
  | "id"
  | "nombre_normalizado"
  | "estado_configuracion"
  | "tipo_comision"
  | "valor_comision"
  | "activo"
> & {
  nombre_normalizado?: string;
  estado_configuracion?: CatalogConfigurationStatus;
};

function createCatalogService(input: CatalogSeedInput) {
  const nombre_normalizado =
    input.nombre_normalizado ?? normalizeCatalogName(input.nombre);
  const hasCompleteConfig =
    input.precio_venta_bruto > 0 &&
    input.costo > 0 &&
    (input.commission_type === "none" || input.commission_value > 0);

  return {
    ...input,
    id: nombre_normalizado.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    nombre_normalizado,
    tipo_comision:
      input.commission_type === "percentage"
        ? "porcentaje"
        : input.commission_type === "fixed"
          ? "monto_fijo"
          : "sin_comision",
    valor_comision: input.commission_value,
    activo: input.active,
    estado_configuracion:
      input.estado_configuracion ?? (hasCompleteConfig ? "completo" : "incompleto"),
  } satisfies CatalogItem;
}

const serviceCatalogItems: CatalogItem[] = [
  createCatalogService({
    categoria: "Protesis capilar",
    tipo: "service",
    nombre: "PROTESIS CAPILAR + INSTALACION + CORTE - From",
    precio_venta_bruto: 0,
    costo: 0,
    commission_type: "none",
    commission_value: 0,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["protesis capilar instalacion corte"],
  }),
  createCatalogService({
    categoria: "Peluqueria",
    tipo: "service",
    nombre: "LAVADO + SECADO",
    precio_venta_bruto: 13990,
    costo: 2000,
    commission_type: "percentage",
    commission_value: 40,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["lavado secado"],
  }),
  createCatalogService({
    categoria: "Color",
    tipo: "service",
    nombre: "TINTURA MUJER - From",
    precio_venta_bruto: 39990,
    costo: 10000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["tintura mujer"],
  }),
  createCatalogService({
    categoria: "Color",
    tipo: "service",
    nombre: "MECHAS - From",
    precio_venta_bruto: 80000,
    costo: 15000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["mechas"],
  }),
  createCatalogService({
    categoria: "Color",
    tipo: "service",
    nombre: "DECOLORACION GLOBAL - From",
    precio_venta_bruto: 140000,
    costo: 15000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["decoloracion global"],
  }),
  createCatalogService({
    categoria: "Color",
    tipo: "service",
    nombre: "COLOR CRECIMIENTO RAIZ - From",
    precio_venta_bruto: 39990,
    costo: 10000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["color crecimiento raiz"],
  }),
  createCatalogService({
    categoria: "Color",
    tipo: "service",
    nombre: "BAÑO DE COLOR - From",
    precio_venta_bruto: 39990,
    costo: 10000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["bano de color", "baño de color"],
  }),
  createCatalogService({
    categoria: "Color",
    tipo: "service",
    nombre: "BALAYAGE - From",
    precio_venta_bruto: 120000,
    costo: 20000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["balayage"],
  }),
  createCatalogService({
    categoria: "Color",
    tipo: "service",
    nombre: "BABYLIGHTS - From",
    precio_venta_bruto: 110000,
    costo: 20000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["babylights"],
  }),
  createCatalogService({
    categoria: "Extensiones",
    tipo: "service",
    nombre: "MANTENCION TOPPERS - From",
    precio_venta_bruto: 39990,
    costo: 5000,
    commission_type: "percentage",
    commission_value: 40,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["mantencion toppers"],
  }),
  createCatalogService({
    categoria: "Extensiones",
    tipo: "service",
    nombre: "MANTENCIÓN EXTENSION CORTINA - From",
    precio_venta_bruto: 25000,
    costo: 3000,
    commission_type: "percentage",
    commission_value: 40,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["mantencion extension cortina", "mantención extension cortina"],
  }),
  createCatalogService({
    categoria: "Extensiones",
    tipo: "service",
    nombre: "RETIRO EXTENSION ADHESIVA",
    precio_venta_bruto: 2500,
    costo: 500,
    commission_type: "percentage",
    commission_value: 40,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "unit",
    active: true,
    aliases: ["retiro extension adhesiva"],
  }),
  createCatalogService({
    categoria: "Protesis capilar",
    tipo: "service",
    nombre: "MANTENCION PROTESIS CAPILAR - From",
    precio_venta_bruto: 39990,
    costo: 10000,
    commission_type: "percentage",
    commission_value: 40,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["mantencion protesis capilar"],
  }),
  createCatalogService({
    categoria: "Extensiones",
    tipo: "service",
    nombre: "MANTENCIÓN DE EXTENSION ADHESIVA",
    precio_venta_bruto: 4000,
    costo: 500,
    commission_type: "percentage",
    commission_value: 40,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "unit",
    active: true,
    aliases: [
      "mantencion de extension adhesiva",
      "mantención de extension adhesiva",
      "mantencion extension adhesiva",
    ],
  }),
  createCatalogService({
    categoria: "Tratamientos",
    tipo: "service",
    nombre: "HIDRATACION CAPILAR - From",
    precio_venta_bruto: 59990,
    costo: 10000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["hidratacion capilar"],
  }),
  createCatalogService({
    categoria: "Tratamientos",
    tipo: "service",
    nombre: "MASAJE CAPILAR - From",
    precio_venta_bruto: 39990,
    costo: 5000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["masaje capilar"],
  }),
  createCatalogService({
    categoria: "Tratamientos",
    tipo: "service",
    nombre: "BOTOX CAPILAR - From",
    precio_venta_bruto: 59990,
    costo: 10000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["botox capilar"],
  }),
  createCatalogService({
    categoria: "Tratamientos",
    tipo: "service",
    nombre: "RESTAURACIÓN CAPILAR BRAE - From",
    precio_venta_bruto: 59990,
    costo: 15000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["restauracion capilar brae", "restauración capilar brae"],
  }),
  createCatalogService({
    categoria: "Tratamientos",
    tipo: "service",
    nombre: "REPARACION OLAPLEX - From",
    precio_venta_bruto: 59990,
    costo: 15000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["reparacion olaplex"],
  }),
  createCatalogService({
    categoria: "Extensiones",
    tipo: "service",
    nombre: "TOPPER + INSTALACIÓN + PEINADO - From",
    precio_venta_bruto: 0,
    costo: 0,
    commission_type: "none",
    commission_value: 0,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["topper instalacion peinado", "topper instalación peinado"],
  }),
  createCatalogService({
    categoria: "Protesis capilar",
    tipo: "service",
    nombre: "PROTESIS + INSTALACIÓN + PEINADO",
    precio_venta_bruto: 0,
    costo: 0,
    commission_type: "none",
    commission_value: 0,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["protesis instalacion peinado", "protesis instalación peinado"],
  }),
  createCatalogService({
    categoria: "Extensiones",
    tipo: "service",
    nombre: "EXTENSION + INSTALACIÓN + PEINADO",
    precio_venta_bruto: 0,
    costo: 0,
    commission_type: "none",
    commission_value: 0,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["extension instalacion peinado", "extension instalación peinado"],
  }),
  createCatalogService({
    categoria: "Peluqueria",
    tipo: "service",
    nombre: "BRUSHING - From",
    precio_venta_bruto: 14000,
    costo: 1000,
    commission_type: "percentage",
    commission_value: 40,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["brushing"],
  }),
  createCatalogService({
    categoria: "Peluqueria",
    tipo: "service",
    nombre: "CORTE DE PUNTAS",
    precio_venta_bruto: 12990,
    costo: 1000,
    commission_type: "percentage",
    commission_value: 50,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["corte de puntas"],
  }),
  createCatalogService({
    categoria: "Barberia",
    tipo: "service",
    nombre: "CORTE DEGRADADO",
    precio_venta_bruto: 12000,
    costo: 1000,
    commission_type: "percentage",
    commission_value: 50,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["corte degradado"],
  }),
  createCatalogService({
    categoria: "Barberia",
    tipo: "service",
    nombre: "CORTE + BARBA + LAVADO",
    precio_venta_bruto: 17990,
    costo: 1000,
    commission_type: "percentage",
    commission_value: 50,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["corte barba lavado"],
  }),
  createCatalogService({
    categoria: "Alisados",
    tipo: "service",
    nombre: "ALISADO SIN FORMOL - From",
    precio_venta_bruto: 59990,
    costo: 10000,
    commission_type: "percentage",
    commission_value: 30,
    commission_base: "net",
    default_quantity: 1,
    unit_label: "session",
    active: true,
    aliases: ["alisado sin formol"],
  }),
];

function createCatalogProduct(seed: (typeof masterProductSeeds)[number]) {
  return {
    id: seed.nombre_normalizado.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    categoria: seed.categoria,
    tipo: "product" as const,
    nombre: seed.nombre,
    nombre_normalizado: normalizeCatalogName(seed.nombre_normalizado),
    aliases: [seed.nombre_normalizado],
    precio_venta_bruto: seed.precio_venta_bruto,
    costo: seed.precio_costo,
    tipo_comision: seed.tipo_comision === "fijo" ? "monto_fijo" : "sin_comision",
    valor_comision: seed.valor_comision,
    activo: seed.activo,
    estado_configuracion: seed.estado_configuracion,
    commission_type: seed.tipo_comision === "fijo" ? "fixed" : "none",
    commission_value: seed.valor_comision,
    commission_base: seed.tipo_comision === "fijo" ? "unit" : "net",
    default_quantity: 1,
    unit_label: "unit" as const,
    active: seed.activo,
  } satisfies CatalogItem;
}

function deduplicateCatalogItems(items: CatalogItem[]) {
  const deduped = new Map<string, CatalogItem>();

  items.forEach((item) => {
    const signature = [
      item.tipo,
      item.nombre,
      item.costo,
      item.precio_venta_bruto,
      item.commission_type,
      item.commission_value,
    ].join("|");
    const existing = deduped.get(signature);

    if (existing) {
      existing.deduplicado_interno = true;
      existing.filas_duplicadas = [
        ...(existing.filas_duplicadas ?? []),
        item.nombre,
      ];
      return;
    }

    deduped.set(signature, item);
  });

  return Array.from(deduped.values());
}

export const catalogImportTemplateColumns = [
  "categoria",
  "tipo",
  "nombre",
  "nombre_normalizado",
  "precio_costo",
  "precio_venta_bruto",
  "tipo_comision",
  "valor_comision",
  "activo",
  "estado_configuracion",
];

export const catalogItems: CatalogItem[] = deduplicateCatalogItems([
  ...serviceCatalogItems,
  ...masterProductSeeds.map(createCatalogProduct),
]);

export const businessCatalog: BusinessCatalogItem[] = catalogItems.map((item) => ({
  id: item.id,
  name: item.nombre,
  normalizedName: item.nombre_normalizado,
  aliases: [
    item.nombre_normalizado,
    ...(item.aliases ?? []).map((alias) => normalizeCatalogName(alias)),
  ],
  type: item.tipo,
  price: item.precio_venta_bruto,
  commissionType:
    item.commission_type === "percentage"
      ? "percent"
      : item.commission_type === "fixed"
        ? "fixed"
        : null,
  commissionValue:
    item.commission_type === "percentage"
      ? item.commission_value / 100
      : item.commission_type === "fixed"
        ? item.commission_value
        : null,
  unitCost: item.costo,
  quantityUnit: item.unit_label ?? "unit",
  branchIds: item.branchIds,
}));
