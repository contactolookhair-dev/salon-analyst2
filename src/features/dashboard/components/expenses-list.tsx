import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type ExpensesListProps = {
  items: {
    id: string;
    title: string;
    category: string;
    amount: number;
    createdAt: string;
  }[];
};

export function ExpensesList({ items }: ExpensesListProps) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Gastos del día</p>
          <h3 className="mt-1 text-xl font-semibold text-olive-950">
            Movimientos registrados
          </h3>
        </div>
        <span className="rounded-full bg-[#f2f0e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-olive-700">
          {items.length} items
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-olive-950/6 bg-[#fbfaf6] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-olive-950">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.category} · {item.createdAt}
                </p>
              </div>
              <p className="font-semibold text-olive-950">
                {formatCurrency(item.amount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

