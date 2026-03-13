import { Card } from "@/shared/components/ui/card";
import { SectionHeading } from "@/shared/components/ui/section-heading";

type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Módulo"
        title={title}
        description={description}
      />
      <Card>
        <p className="text-sm leading-7 text-muted-foreground">
          Este espacio quedó preparado para la siguiente fase de implementación con
          componentes, casos de uso y reglas de negocio del módulo.
        </p>
      </Card>
    </section>
  );
}

