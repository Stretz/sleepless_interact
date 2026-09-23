import { Keycap } from "@/components/Keycap";
import { Mark } from "@/components/Mark";
import { activate, beginHold, resetHold, selectMode, useInteract } from "@/stores/interact";

export function FocusChip() {
  const mode = useInteract(selectMode);
  const summary = useInteract((state) => state.summary);
  const title = useInteract((state) => state.title);
  const menuIcon = useInteract((state) => state.menuIcon);
  const keyLabel = useInteract((state) => state.keyLabel);
  const cooldown = useInteract((state) => state.cooldown);
  const option = useInteract((state) => state.options[0]);
  const holding = useInteract((state) => state.holding);
  const progress = useInteract((state) => state.holdProgress);
  const selectedIndex = useInteract((state) => state.selectedIndex);

  if (!option || (mode !== "focus" && mode !== "single")) return null;

  const single = mode === "single";
  const label = single ? option.label : title || summary;
  const icon = single ? option.icon || menuIcon : menuIcon;
  return (
    <button
      type="button"
      className="chip panel"
      onClick={() => {
        if (single && option.holdTime) return;
        activate(0);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || !single || !option.holdTime) return;
        beginHold(0);
      }}
      onPointerUp={() => {
        if (single && option.holdTime) resetHold();
      }}
      onPointerLeave={() => {
        if (single && option.holdTime) resetHold();
      }}
    >
      <span className="mark">
        <Mark icon={icon} color={single ? option.iconColor : undefined} />
      </span>
      <span className="chip-label">{label}</span>
      {single && option.hideButton ? null : (
        <Keycap
          label={keyLabel}
          hold={single && option.holdTime > 0}
          holding={holding && !cooldown}
          progress={progress}
          cooldown={cooldown}
          selected={selectedIndex === 0}
        />
      )}
    </button>
  );
}
