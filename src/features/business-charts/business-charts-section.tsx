import type { BusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import { ProfitChart } from "@/features/business-charts/profit-chart";
import { ProfessionalsChart } from "@/features/business-charts/professionals-chart";
import { SalesChart } from "@/features/business-charts/sales-chart";
import { ServicesChart } from "@/features/business-charts/services-chart";
import {
  buildProfitChartData,
  buildProfessionalsChartData,
  buildSalesChartData,
  buildServicesChartData,
} from "@/features/business-charts/chart-data";
import { SectionHeading } from "@/shared/components/ui/section-heading";

type BusinessChartsSectionProps = {
  snapshot: BusinessSnapshot;
};

export function BusinessChartsSection({
  snapshot,
}: BusinessChartsSectionProps) {
  const salesData = buildSalesChartData(snapshot);
  const profitData = buildProfitChartData(snapshot);
  const servicesData = buildServicesChartData(snapshot);
  const professionalsData = buildProfessionalsChartData(snapshot);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Visualizacion del negocio"
        title="Graficos operativos"
        description="Una capa visual minimalista para leer ventas, utilidad, servicios y rendimiento del equipo sin salir del dashboard."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <SalesChart data={salesData} />
        <ProfitChart data={profitData} />
        <ServicesChart data={servicesData} />
        <ProfessionalsChart data={professionalsData} />
      </div>
    </section>
  );
}

