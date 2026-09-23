import { useEffect, useRef } from "react";
import { Keycap } from "@/components/Keycap";
import { Mark } from "@/components/Mark";
import { activate, beginHold, focusIndex, resetHold, selectMode, useInteract } from "@/stores/interact";
import { rowKey } from "@/utils/misc";

export function MenuCard() {
  const mode = useInteract(selectMode);
  const options = useInteract((state) => state.options);
  const currentIndex = useInteract((state) => state.currentIndex);
  const summary = useInteract((state) => state.summary);
  const title = useInteract((state) => state.title);
  const menuIcon = useInteract((state) => state.menuIcon);
  const keyLabel = useInteract((state) => state.keyLabel);
  const cooldown = useInteract((state) => state.cooldown);
  const holding = useInteract((state) => state.holding);
  const progress = useInteract((state) => state.holdProgress);
  const selectedIndex = useInteract((state) => state.selectedIndex);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(".row.is-active");
    active?.scrollIntoView({ block: "nearest" });
  }, [currentIndex, options.length]);

  if (mode !== "menu") return null;

  return (
    <div className="menu panel">
      <div className="menu-head">
        <span className="mark">
          <Mark icon={menuIcon} />
        </span>
        <span className="menu-title">{title || summary}</span>
      </div>
      <div className="rows" ref={listRef}>
        {options.map((option, index) => {
          const active = index === currentIndex;
          return (
            <button
              type="button"
              className={active ? "row is-active" : "row"}
              key={`${option.targetType}-${option.targetId}`}
              onMouseEnter={() => focusIndex(index)}
              onClick={() => {
                if (option.holdTime) return;
                activate(index);
              }}
              onPointerDown={(event) => {
                if (event.button !== 0 || !option.holdTime) return;
                beginHold(index);
              }}
              onPointerUp={() => {
                if (option.holdTime) resetHold();
              }}
              onPointerLeave={() => {
                if (option.holdTime) resetHold();
              }}
            >
              <span className="row-icon">
                <Mark icon={option.icon} color={option.iconColor} />
              </span>
              <span className="row-label">{option.label}</span>
              {option.hideButton ? null : (
                <Keycap
                  label={rowKey(index, keyLabel, option.key)}
                  hold={option.holdTime > 0}
                  holding={active && holding && !cooldown}
                  progress={active ? progress : 0}
                  cooldown={active && cooldown}
                  selected={index === selectedIndex}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="hint">Press key · Alt + Click</div>
    </div>
  );
}
