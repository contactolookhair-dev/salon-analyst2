import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  visual?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  visual,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        {visual ? <div className="pt-1">{visual}</div> : null}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-olive-700">
            {eyebrow}
          </p>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-olive-950">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
