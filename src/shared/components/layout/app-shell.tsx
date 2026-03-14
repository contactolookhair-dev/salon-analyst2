import type { PropsWithChildren } from "react";

import { Topbar } from "@/shared/components/layout/topbar";
import { Sidebar } from "@/shared/components/layout/sidebar";

type AppShellProps = PropsWithChildren;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="font-sans">
      <div className="min-h-screen bg-[var(--theme-bg)] p-4 transition-colors md:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <Sidebar />
          </div>
          <main className="rounded-[32px] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-[var(--theme-text)] shadow-[var(--theme-shell-shadow)] backdrop-blur-xl transition-colors md:p-8">
            <Topbar />
            <div className="mt-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
