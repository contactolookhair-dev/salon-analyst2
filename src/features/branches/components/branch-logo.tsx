"use client";

import { useEffect, useState } from "react";

import type { Branch } from "@/shared/types/business";
import { cn } from "@/shared/lib/utils";

type BranchLogoProps = {
  branch?: Branch | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  labelClassName?: string;
};

const sizeClasses = {
  sm: "size-10 rounded-2xl",
  md: "size-14 rounded-[20px]",
  lg: "size-20 rounded-[24px]",
} as const;

const textSizeClasses = {
  sm: "text-[11px]",
  md: "text-sm",
  lg: "text-base",
} as const;

function getBranchInitials(name?: string) {
  if (!name) {
    return "SA";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getBranchPlaceholderLabel(name?: string, size?: "sm" | "md" | "lg") {
  if (!name) {
    return size === "lg" ? "Salon Analyst" : "SA";
  }

  if (size === "sm" || size === "md") {
    return getBranchInitials(name);
  }

  return name;
}

export function BranchLogo({
  branch,
  size = "md",
  className,
  labelClassName,
}: BranchLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasLogo = Boolean(branch?.logoUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [branch?.logoUrl]);

  return (
    <div
      className={cn(
        "relative flex h-auto w-auto shrink-0 grow-0 basis-auto items-center justify-center overflow-hidden border shadow-soft",
        sizeClasses[size],
        className
      )}
      style={{
        borderColor: `${branch?.primaryColor ?? "var(--theme-border)"}33`,
        background: hasLogo
          ? "#ffffff"
          : `linear-gradient(135deg, ${branch?.secondaryColor ?? "#f4efe5"} 0%, #ffffff 100%)`,
      }}
      aria-label={branch?.name ? `Logo de ${branch.name}` : "Logo sucursal"}
    >
      {hasLogo ? (
        // Safari/iPhone renderiza con más consistencia logos cargados por usuario con img nativo.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branch?.logoUrl ?? ""}
          alt={branch?.name ? `Logo de ${branch.name}` : "Logo sucursal"}
          className="h-full w-full object-contain p-2"
          loading="eager"
          decoding="async"
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "px-2 text-center font-semibold tracking-[0.16em] uppercase",
            textSizeClasses[size],
            labelClassName
          )}
          style={{ color: branch?.primaryColor ?? "var(--theme-text)" }}
        >
          {getBranchPlaceholderLabel(branch?.name, size)}
        </span>
      )}
    </div>
  );
}
