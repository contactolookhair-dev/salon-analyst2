import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SalonAnalyst2",
    short_name: "SalonAnalyst2",
    description: "Control financiero, comisiones y alertas inteligentes para salones.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e0e",
    theme_color: "#C6A96A",
    lang: "es-CL",
  };
}
