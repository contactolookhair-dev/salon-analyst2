import type { Metadata } from "next";

import { AppShell } from "@/shared/components/layout/app-shell";
import { BranchProvider } from "@/shared/context/branch-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalonAnalyst2",
  description: "Sistema de análisis financiero para salones de belleza.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <BranchProvider>
          <AppShell>{children}</AppShell>
        </BranchProvider>
      </body>
    </html>
  );
}
