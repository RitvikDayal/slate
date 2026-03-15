import { cn } from "@/lib/utils";

interface SlateLogoProps {
  /** Show the wordmark next to the icon */
  showWordmark?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeConfig = {
  sm: { icon: 20, text: "text-sm", gap: "gap-1.5" },
  md: { icon: 24, text: "text-lg", gap: "gap-2" },
  lg: { icon: 32, text: "text-2xl", gap: "gap-2.5" },
  xl: { icon: 44, text: "text-4xl", gap: "gap-3" },
} as const;

/**
 * Slate brand logo — two offset geometric planes forming an abstract "S".
 * The overlapping slate tablets convey depth, structure, and a writing surface.
 */
export function SlateLogo({
  showWordmark = true,
  size = "md",
  className,
}: SlateLogoProps) {
  const config = sizeConfig[size];

  return (
    <span className={cn("inline-flex items-center", config.gap, className)}>
      <SlateIcon size={config.icon} />
      {showWordmark && (
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            config.text
          )}
        >
          Slate
        </span>
      )}
    </span>
  );
}

interface SlateIconProps {
  size?: number;
  className?: string;
}

/**
 * Standalone icon mark — two overlapping angled planes.
 *
 * The back plane is the primary brand purple, the front plane is
 * slightly lighter and offset, creating the illusion of stacked
 * slate tablets with a subtle "S" negative space between them.
 */
export function SlateIcon({ size = 24, className }: SlateIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Back plane — deeper purple, sits upper-left */}
      <rect
        x="2"
        y="3"
        width="20"
        height="16"
        rx="3"
        fill="var(--color-primary)"
        opacity="0.55"
      />
      {/* Front plane — brighter, offset lower-right */}
      <rect
        x="10"
        y="13"
        width="20"
        height="16"
        rx="3"
        fill="var(--color-primary)"
      />
      {/* Accent line on front plane — suggests a writing surface */}
      <rect x="15" y="19" width="10" height="1.5" rx="0.75" fill="var(--color-primary-foreground)" opacity="0.7" />
      <rect x="15" y="23" width="7" height="1.5" rx="0.75" fill="var(--color-primary-foreground)" opacity="0.4" />
    </svg>
  );
}
