import { describe, expect, it } from "vitest";

import { catalogItems } from "@/features/configuration/data/business-rules";
import { findExactCatalogMatch, searchCatalogItems } from "@/features/sales-register/lib/catalog-search";

describe("catalog search", () => {
  it('encuentra "Cinta adhesivas pequeña" por variacion singular/plural', () => {
    const results = searchCatalogItems("Cinta adhesivas pequeña", 3);

    expect(results[0]?.id).toBe("cinta-adhesivas-pequena");
  });

  it('encuentra "Removedor de extensiones adhesivas" usando alias y normalizacion', () => {
    const results = searchCatalogItems("Removedor de extensiones adhesivas", 3);

    expect(results[0]?.id).toBe("removedor-de-extensiones-adhesivas");
  });

  it('encuentra "Protesis Premium 4k Tono #1" por nombre base', () => {
    const results = searchCatalogItems("Protesis Premium 4k Tono #1", 3);

    expect(results[0]?.id).toBe("protesis-premium-4k-tono-1");
  });

  it("busca productos por nombre exacto y nombre normalizado", () => {
    expect(findExactCatalogMatch("Extension adhesivas #1b")?.id).toBe(
      "extension-adhesivas-1b"
    );
    expect(findExactCatalogMatch("extension adhesivas 1b")?.id).toBe(
      "extension-adhesivas-1b"
    );
  });

  it("deduplica filas exactas del catalogo masivo", () => {
    const curlyProducts = catalogItems.filter(
      (item) => item.nombre === "Cortina Curly #Natural Black"
    );

    expect(curlyProducts).toHaveLength(1);
    expect(curlyProducts[0]?.deduplicado_interno).toBe(true);
  });
});
