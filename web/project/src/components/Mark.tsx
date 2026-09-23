import { iconClass } from "@/utils/misc";

interface MarkProps {
  icon?: string;
  color?: string;
}

export function Mark({ icon, color }: MarkProps) {
  if (icon) {
    return <i className={iconClass(icon)} style={color ? { color } : undefined} />;
  }

  return (
    <svg viewBox="0 0 16 16" width="0.72rem" height="0.72rem" aria-hidden="true">
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}
