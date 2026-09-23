import { useEffect, useLayoutEffect } from "react";
import { FocusChip } from "@/components/FocusChip";
import { MenuCard } from "@/components/MenuCard";
import { BrowserDock } from "@/preview/BrowserDock";
import { pressHotkey, selectMode, stepIndex, useInteract } from "@/stores/interact";
import { post } from "@/nui/post";
import { isCursorSurface, isDuiSurface, isEnvBrowser } from "@/utils/misc";

function usePromptAnchor() {
  const mode = useInteract(selectMode);
  const index = useInteract((state) => state.currentIndex);
  const title = useInteract((state) => state.title);
  const count = useInteract((state) => state.options.length);

  useLayoutEffect(() => {
    if (isEnvBrowser() || !isDuiSurface()) return;
    const node = document.querySelector(".prompt");
    if (!(node instanceof HTMLElement)) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    post("promptAnchor", {
      x: (rect.left + rect.right) / 2 / window.innerWidth,
      y: (rect.top + rect.bottom) / 2 / window.innerHeight,
    });
  }, [mode, index, title, count]);
}

function listIsOpen() {
  const state = useInteract.getState();
  return state.options.length > 1 && (!state.compactEnabled || state.expanded);
}

function useWheel() {
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (!listIsOpen() || useInteract.getState().holding) return;
      event.preventDefault();

      if (isCursorSurface()) {
        post("scroll", { delta: event.deltaY });
        return;
      }

      if (isEnvBrowser() || isDuiSurface()) stepIndex(event.deltaY > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);
}

function useMenuKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const listen = isCursorSurface() || isEnvBrowser();
      if (!listen) return;

      if (event.key === "Alt") {
        event.preventDefault();
        if (isCursorSurface()) post("holdCursor");
        return;
      }

      if (!listIsOpen()) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        if (isEnvBrowser()) stepIndex(delta);
        else post("scroll", { delta });
        return;
      }

      if (isEnvBrowser()) {
        if (pressHotkey(event.key, true)) event.preventDefault();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      post("hotkey", { key: event.key, down: true });
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const listen = isCursorSurface() || isEnvBrowser();
      if (!listen) return;

      if (event.key === "Alt") {
        if (isCursorSurface()) post("releaseCursor");
        return;
      }

      if (!listIsOpen()) return;

      if (isEnvBrowser()) {
        pressHotkey(event.key, false);
        return;
      }

      event.preventDefault();
      post("hotkey", { key: event.key, down: false });
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}

function useKeyFocus(mode: string) {
  useEffect(() => {
    if (!isDuiSurface()) return;
    post("keyFocus", { open: mode === "menu" });
  }, [mode]);
}

function Prompt({ cooldown }: { cooldown: boolean }) {
  return (
    <div className={cooldown ? "prompt is-cooldown" : "prompt"}>
      <FocusChip />
      <MenuCard />
    </div>
  );
}

function releaseCursor(event: { preventDefault: () => void }) {
  event.preventDefault();
  post("releaseCursor");
}

export function App() {
  const mode = useInteract(selectMode);
  const cooldown = useInteract((state) => state.cooldown);
  const cursor = useInteract((state) => state.cursor);
  const cursorPos = useInteract((state) => state.cursorPos);
  usePromptAnchor();
  useWheel();
  useMenuKeys();
  useKeyFocus(mode);

  if (isCursorSurface()) {
    if (!cursor || mode === "hidden") return null;
    return (
      <div
        className="cursor-layer"
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          const target = event.target;
          if (target instanceof Element && target.closest(".prompt")) return;
          releaseCursor(event);
        }}
        onContextMenu={releaseCursor}
      >
        <div className="vignette" />
        <div
          className={cooldown ? "prompt is-placed is-cooldown" : "prompt is-placed"}
          style={{ left: `${cursorPos.x * 100}%`, top: `${cursorPos.y * 100}%` }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <FocusChip />
          <MenuCard />
        </div>
      </div>
    );
  }

  return (
    <>
      <BrowserDock />
      {mode === "hidden" ? null : <Prompt cooldown={cooldown} />}
    </>
  );
}
