import type { ReactNode } from "react";
import { cn } from "@/utils/misc";

interface KeycapProps {
  label: string;
  hold?: boolean;
  holding?: boolean;
  progress?: number;
  cooldown?: boolean;
  selected?: boolean;
}

export function Keycap({ label, hold = false, holding = false, progress = 0, cooldown = false, selected = false }: KeycapProps) {
  const text = label.trim() || "E";
  let glyph: ReactNode = text;
  if (selected) {
    glyph = (
      <svg className="keycap-tick" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.2 8.3 6.4 11.4 12.8 4.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else if (cooldown) {
    glyph = <i className="fa-regular fa-hourglass-half" />;
  }
  const drawn = 100 - Math.max(0, Math.min(1, progress)) * 100;

  return (
    <span className={cn("keycap", !selected && !cooldown && text.length > 2 && "is-wide", hold && !selected && "is-hold", holding && !selected && "is-holding", selected && "is-selected")}>
      {hold && !selected ? (
        <svg className="keycap-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            pathLength={100}
            style={holding ? { strokeDasharray: 100, strokeDashoffset: drawn } : undefined}
          />
        </svg>
      ) : null}
      <span>{glyph}</span>
    </span>
  );
}
