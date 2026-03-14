import type { PropsWithChildren } from "react";

import { MobileQuickActions } from "@/shared/components/layout/mobile-quick-actions";
import { Topbar } from "@/shared/components/layout/topbar";
import { Sidebar } from "@/shared/components/layout/sidebar";

type AppShellProps = PropsWithChildren;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="font-sans">
      <div className="min-h-screen bg-[var(--theme-bg)] p-2 transition-colors sm:p-4 md:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1600px] gap-3 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4">
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <Sidebar />
          </div>
          <main className="rounded-[24px] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-[var(--theme-text)] shadow-[var(--theme-shell-shadow)] backdrop-blur-xl transition-colors sm:p-5 md:rounded-[32px] md:p-8">
            <Topbar />
            <div className="mt-6 md:mt-8">{children}</div>
          </main>
        </div>
        <MobileQuickActions />
      </div>
    </div>
  );
}
