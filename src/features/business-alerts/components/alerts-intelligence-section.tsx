"use client";

import { useEffect } from "react";
import { AlertTriangle, BellRing, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { analyzeBusinessAlerts } from "@/features/business-alerts/lib/business-alerts-engine";
import type { BusinessAlert } from "@/features/business-alerts/types";
import type { BusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import { Card } from "@/shared/components/ui/card";
import { useBranch } from "@/shared/context/branch-context";
import { formatCurrency, formatPercent } from "@/shared/lib/utils";

type AlertsIntelligenceSectionProps = {
  snapshot: BusinessSnapshot;
};

const severityStyles: Record<BusinessAlert["severity"], string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

function getAlertIcon(alert: BusinessAlert) {
  if (alert.isPredictive) {
    return <Sparkles className="size-4" />;
  }

  if (alert.severity === "critical") {
    return <AlertTriangle className="size-4" />;
  }

  return <BellRing className="size-4" />;
}

function renderMetric(alert: BusinessAlert) {
  if (typeof alert.amount === "number") {
    return formatCurrency(alert.amount);
  }

  if (typeof alert.percent === "number") {
    return formatPercent(Math.abs(alert.percent));
  }

  return null;
}

export function AlertsIntelligenceSection({ snapshot }: AlertsIntelligenceSectionProps) {
  const { branch } = useBranch();
  const { current, predictive } = analyzeBusinessAlerts(snapshot, branch);

  useEffect(() => {
    void fetch("/api/alerts/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branch }),
    }).catch(() => undefined);
  }, [branch]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--theme-header-eyebrow)]">
          Alertas inteligentes
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--theme-text)]">
          Señales actuales y proyecciones del negocio
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Una capa proactiva para detectar desvíos operativos hoy y anticipar riesgos de utilidad, ventas, comisiones o stock antes de que se conviertan en un problema mayor.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--theme-accent)]/15 p-3 text-[var(--theme-accent)]">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--theme-text)]">Alertas actuales</p>
              <p className="text-sm text-muted-foreground">
                Eventos críticos o importantes detectados en el estado actual del negocio.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {current.length ? (
              current.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-[22px] border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--theme-accent)]">{getAlertIcon(alert)}</span>
                        <p className="font-semibold text-[var(--theme-text)]">{alert.title}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {alert.message}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityStyles[alert.severity]}`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  {alert.recommendation ? (
                    <div className="mt-3 rounded-2xl bg-[var(--theme-accent)]/8 px-4 py-3 text-sm text-[var(--theme-text)]">
                      <p className="font-semibold">Recomendación</p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {alert.recommendation}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-5 text-sm text-muted-foreground">
                No hay alertas actuales críticas o importantes con los datos disponibles.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--theme-accent)]/15 p-3 text-[var(--theme-accent)]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--theme-text)]">Alertas predictivas</p>
              <p className="text-sm text-muted-foreground">
                Proyecciones basadas en ritmo actual, promedio reciente y riesgo operacional.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {predictive.length ? (
              predictive.map((alert) => {
                const metric = renderMetric(alert);

                return (
                  <div
                    key={alert.id}
                    className="rounded-[22px] border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--theme-accent)]">
                            {alert.percent && alert.percent < 0 ? (
                              <TrendingDown className="size-4" />
                            ) : (
                              <TrendingUp className="size-4" />
                            )}
                          </span>
                          <p className="font-semibold text-[var(--theme-text)]">{alert.title}</p>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {alert.message}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityStyles[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    {metric ? (
                      <div className="mt-3 rounded-2xl bg-[var(--theme-accent)]/8 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Métrica clave
                        </p>
                        <p className="mt-2 text-xl font-semibold text-[var(--theme-text)]">
                          {metric}
                        </p>
                      </div>
                    ) : null}

                    {alert.recommendation ? (
                      <div className="mt-3 rounded-2xl border border-[var(--theme-border)] px-4 py-3 text-sm">
                        <p className="font-semibold text-[var(--theme-text)]">Recomendación</p>
                        <p className="mt-1 leading-relaxed text-muted-foreground">
                          {alert.recommendation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-5 text-sm text-muted-foreground">
                No hay suficientes datos confiables para construir alertas predictivas en este momento.
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
