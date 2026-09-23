import { create } from "zustand";
import { observe } from "@/nui/observe";
import { post } from "@/nui/post";
import type { InteractOption, PromptMode, RawOption, SetOptionsPayload } from "@/types";
import { iconClass, isCursorSurface, isDuiSurface, mixHex, rowKey } from "@/utils/misc";

const THEME_BASE: Record<string, [number, number, number]> = {
  modern: [7, 18, 10],
  minimal: [7, 18, 10],
  noir: [7, 18, 10],
  legacy: [7, 18, 10],
  vice: [36, 24, 47],
  cyber: [19, 36, 28],
  retro: [42, 33, 24],
  industrial: [42, 33, 24],
  fantasy: [42, 33, 24],
  light: [243, 244, 247],
  eco: [4, 40, 6],
};

const SURFACE_VARS = ["--surface", "--surface-2", "--keycap", "--line", "--keycap-line", "--shadow"] as const;

interface InteractState {
  visible: boolean;
  leaving: boolean;
  theme: string;
  summary: string;
  title: string;
  menuIcon: string;
  keyLabel: string;
  cooldown: boolean;
  compactEnabled: boolean;
  idleMs: number;
  expanded: boolean;
  options: InteractOption[];
  currentIndex: number;
  holding: boolean;
  holdProgress: number;
  selectedIndex: number;
  cursor: boolean;
  cursorPos: { x: number; y: number };
  mode: () => PromptMode;
  activeOption: () => InteractOption | undefined;
}

let hideTimer = 0;
let idleTimer = 0;
let holdFrame = 0;
let selectTimer = 0;
let defaultTint: [number, number, number] | null = null;

function clearIdle() {
  window.clearTimeout(idleTimer);
  idleTimer = 0;
}

function clearHold() {
  window.cancelAnimationFrame(holdFrame);
  holdFrame = 0;
}

function clearSelectTimer() {
  window.clearTimeout(selectTimer);
  selectTimer = 0;
}

function selectionLocked() {
  return useInteract.getState().selectedIndex >= 0;
}

function isCompactTarget(state: Pick<InteractState, "compactEnabled" | "options">) {
  return state.compactEnabled && state.options.length > 1;
}

function isMenuOpen(state: InteractState) {
  return !isCompactTarget(state) || state.expanded;
}

function applyThemeName(theme: string) {
  const next = theme.trim().toLowerCase() || "modern";
  document.documentElement.dataset.theme = next;
  return next;
}

function paintTint(tint: [number, number, number] | null) {
  const root = document.documentElement;
  if (!tint) {
    SURFACE_VARS.forEach((name) => root.style.removeProperty(name));
    return;
  }

  const theme = root.dataset.theme || "modern";
  const base = THEME_BASE[theme] ?? THEME_BASE.modern;
  const surface = mixHex(base, tint, theme === "light" ? 0.18 : 0.72);
  const [sr, sg, sb] = surface
    .slice(1)
    .match(/.{2}/g)!
    .map((part) => Number.parseInt(part, 16)) as [number, number, number];
  const lifted: [number, number, number] = [
    Math.min(255, sr + 16),
    Math.min(255, sg + 16),
    Math.min(255, sb + 18),
  ];
  const keycap: [number, number, number] = [
    Math.min(255, sr + 22),
    Math.min(255, sg + 22),
    Math.min(255, sb + 26),
  ];

  root.style.setProperty("--surface", surface);
  root.style.setProperty("--surface-2", mixHex([sr, sg, sb], lifted, 1));
  root.style.setProperty("--keycap", mixHex([sr, sg, sb], keycap, 1));
  root.style.setProperty("--line", mixHex([sr, sg, sb], tint, 0.35));
  root.style.setProperty("--keycap-line", mixHex([sr, sg, sb], tint, 0.55));
  root.style.setProperty("--shadow", "#05060a");
}

function flatten(groups: SetOptionsPayload["options"]) {
  const options: InteractOption[] = [];
  if (!groups) return options;

  for (const type of Object.keys(groups)) {
    const list = groups[type];
    if (!list) continue;
    list.forEach((data: RawOption, index) => {
      if (data.hide) return;
      const color = Array.isArray(data.color) && data.color.length >= 3
        ? [data.color[0], data.color[1], data.color[2], data.color[3] ?? 255] as [number, number, number, number]
        : undefined;
      options.push({
        label: String(data.label || "Option"),
        icon: iconClass(data.icon),
        iconColor: data.iconColor,
        holdTime: data.holdTime || 0,
        hideButton: !!data.hideButton,
        color,
        key: data.key || data.keybind,
        targetType: type,
        targetId: index + 1,
      });
    });
  }

  return options;
}

function syncBody(visible: boolean, leaving: boolean) {
  document.body.classList.toggle("is-visible", visible);
  document.body.classList.toggle("is-leaving", leaving);
}

export const useInteract = create<InteractState>((_set, get) => ({
  visible: false,
  leaving: false,
  theme: "eco",
  summary: "Interact",
  title: "",
  menuIcon: "",
  keyLabel: "E",
  cooldown: false,
  compactEnabled: true,
  idleMs: 2500,
  expanded: true,
  options: [],
  currentIndex: 0,
  holding: false,
  holdProgress: 0,
  selectedIndex: -1,
  cursor: false,
  cursorPos: { x: 0.5, y: 0.5 },
  mode: () => {
    const state = get();
    if (!state.visible && !state.leaving) return "hidden";
    if (state.options.length === 0) return "hidden";
    if (state.options.length === 1) return "single";
    if (isCompactTarget(state) && !state.expanded) return "focus";
    return "menu";
  },
  activeOption: () => {
    const state = get();
    return state.options[state.currentIndex] ?? state.options[0];
  },
}));

function setVisible(show: boolean) {
  window.clearTimeout(hideTimer);
  if (show) {
    clearSelectTimer();
    setState({ visible: true, leaving: false, selectedIndex: -1 });
    syncBody(true, false);
    return;
  }

  clearSelectTimer();
  setState({ visible: false, leaving: true, selectedIndex: -1 });
  syncBody(false, true);
  hideTimer = window.setTimeout(() => {
    setState({ leaving: false });
    syncBody(false, false);
  }, 180);
}

function setState(partial: Partial<InteractState>) {
  useInteract.setState(partial);
}

function bumpIdle() {
  clearIdle();
  const state = useInteract.getState();
  if (!isCompactTarget(state) || !state.expanded) return;

  idleTimer = window.setTimeout(() => {
    if (useInteract.getState().holding) {
      bumpIdle();
      return;
    }
    closeMenu();
  }, state.idleMs);
}

function closeMenu() {
  const state = useInteract.getState();
  if (!isCompactTarget(state)) return false;
  clearIdle();
  useInteract.setState({ expanded: false, currentIndex: 0, holding: false, holdProgress: 0 });
  return true;
}

function tryOpenMenu() {
  const state = useInteract.getState();
  if (!isCompactTarget(state) || state.expanded) return false;
  useInteract.setState({ expanded: true });
  bumpIdle();
  return true;
}

function finishSelect(option: InteractOption) {
  const state = useInteract.getState();
  if (state.selectedIndex >= 0) return;
  const index = state.options.indexOf(option);
  const selectedIndex = index >= 0 ? index : state.currentIndex;
  post("select", [option.targetType, option.targetId]);
  clearHold();
  clearIdle();
  clearSelectTimer();
  useInteract.setState({
    holding: false,
    holdProgress: 0,
    currentIndex: selectedIndex,
    selectedIndex,
  });
  selectTimer = window.setTimeout(() => {
    const current = useInteract.getState();
    if (current.selectedIndex !== selectedIndex) return;
    if (isCompactTarget(current)) {
      useInteract.setState({
        selectedIndex: -1,
        expanded: false,
        currentIndex: 0,
        holding: false,
        holdProgress: 0,
      });
      return;
    }
    useInteract.setState({ selectedIndex: -1, currentIndex: 0 });
  }, 460);
}

export function resetHold() {
  const state = useInteract.getState();
  if (!state.holding) return;
  clearHold();
  useInteract.setState({ holding: false, holdProgress: 0 });
  bumpIdle();
  post("endHoldAnim");
}

function startHold(option: InteractOption) {
  if (useInteract.getState().holding || option.holdTime <= 0) return;
  clearIdle();
  useInteract.setState({ holding: true, holdProgress: 0 });
  const started = performance.now();
  post("startHoldAnim", [option.targetType, option.targetId]);

  const tick = (now: number) => {
    const current = useInteract.getState().activeOption();
    if (!useInteract.getState().holding || current !== option) return;
    const progress = Math.min(1, (now - started) / option.holdTime);
    useInteract.setState({ holdProgress: progress });
    if (progress >= 1) {
      finishSelect(option);
      return;
    }
    holdFrame = window.requestAnimationFrame(tick);
  };

  holdFrame = window.requestAnimationFrame(tick);
}

function onSelect() {
  if (tryOpenMenu()) return;
  const option = useInteract.getState().activeOption();
  if (!option) return;
  if (option.holdTime) {
    startHold(option);
    return;
  }
  finishSelect(option);
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return (index + length) % length;
}

export function stepIndex(direction: number) {
  const state = useInteract.getState();
  if (selectionLocked() || state.holding || !isMenuOpen(state) || state.options.length === 0) return;
  const next = clampIndex(state.currentIndex + direction, state.options.length);
  useInteract.setState({ currentIndex: next });
  bumpIdle();
  post("currentOption", [next + 1]);
}

export function focusIndex(index: number) {
  const state = useInteract.getState();
  if (selectionLocked() || state.holding || !state.options[index]) return;
  if (index === state.currentIndex) return;
  useInteract.setState({ currentIndex: index });
  bumpIdle();
  post("currentOption", [index + 1]);
}

export function activate(index: number) {
  if (selectionLocked() || tryOpenMenu()) return;
  const option = useInteract.getState().options[index];
  if (!option) return;
  useInteract.setState({ currentIndex: index });
  post("currentOption", [index + 1]);
  if (option.holdTime) return;
  finishSelect(option);
}

export function beginHold(index: number) {
  if (selectionLocked()) return;
  const option = useInteract.getState().options[index];
  if (!option?.holdTime) return;
  useInteract.setState({ currentIndex: index });
  post("currentOption", [index + 1]);
  startHold(option);
}

export function pressHotkey(key: string, down: boolean) {
  const state = useInteract.getState();
  const listOpen = state.options.length > 1 && (!state.compactEnabled || state.expanded);
  if (!listOpen || selectionLocked()) return false;

  const pressed = key.trim().toUpperCase();
  const index = state.options.findIndex((option, optionIndex) => rowKey(optionIndex, state.keyLabel, option.key) === pressed);
  if (index < 0) return false;

  if (!down) {
    if (state.holding && state.currentIndex === index) resetHold();
    return true;
  }

  const option = state.options[index];
  if (option.holdTime) beginHold(index);
  else activate(index);
  return true;
}

export function bindInteract() {
  observe("visible", (value) => {
    setVisible(!!value);
  });

  observe("setTheme", (value) => {
    const theme = applyThemeName(String(value || "modern"));
    useInteract.setState({ theme });
    paintTint(defaultTint);
  });

  observe("setColor", (value) => {
    if (!Array.isArray(value)) {
      defaultTint = null;
    } else {
      defaultTint = [Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0];
    }
    paintTint(defaultTint);
  });

  observe("setMenu", (value) => {
    const config = (value ?? {}) as { compact?: boolean; idleMs?: number };
    const state = useInteract.getState();
    const compactEnabled = config.compact == null ? state.compactEnabled : !!config.compact;
    const idleMs = config.idleMs == null ? state.idleMs : Math.max(500, Number(config.idleMs) || 2500);
    const expanded = compactEnabled && state.options.length > 1 ? state.expanded : true;
    if (expanded) clearIdle();
    useInteract.setState({ compactEnabled, idleMs, expanded });
  });

  observe("setOptions", (value) => {
    const payload = (value ?? {}) as SetOptionsPayload;
    const options = flatten(payload.options);
    const state = useInteract.getState();
    const reset = !!payload.resetIndex;
    const compact = state.compactEnabled && options.length > 1;
    const expanded = compact ? (reset ? false : state.expanded) : true;
    const currentIndex = reset ? 0 : Math.min(state.currentIndex, Math.max(0, options.length - 1));
    if (!compact || !expanded) clearIdle();
    clearHold();
    clearSelectTimer();
    useInteract.setState({
      options,
      expanded,
      currentIndex,
      holding: false,
      holdProgress: 0,
      selectedIndex: -1,
      title: payload.title ? String(payload.title) : "",
      menuIcon: payload.icon ? iconClass(String(payload.icon)) : "",
    });
    if (compact && expanded) bumpIdle();
  });

  observe("setKey", (value) => {
    useInteract.setState({ keyLabel: String(value || "E").trim() || "E" });
  });

  observe("setLabel", (value) => {
    useInteract.setState({ summary: String(value || "Interact").trim() || "Interact" });
  });

  observe("setCooldown", (value) => {
    useInteract.setState({ cooldown: !!value });
  });

  observe("openMenu", () => {
    const state = useInteract.getState();
    if (state.options.length > 1) {
      useInteract.setState({ expanded: true });
      bumpIdle();
    }
  });

  observe("cursor", (value) => {
    if (!isCursorSurface()) return;
    const on = !!value;
    document.documentElement.classList.toggle("is-cursor", on);
    if (on && typeof value === "object" && value) {
      const payload = value as { scale?: number; x?: number; y?: number };
      if (typeof payload.scale === "number") {
        document.documentElement.style.fontSize = `${payload.scale}vh`;
      }
      useInteract.setState({
        cursor: true,
        visible: true,
        leaving: false,
        cursorPos: {
          x: typeof payload.x === "number" ? payload.x : 0.5,
          y: typeof payload.y === "number" ? payload.y : 0.5,
        },
      });
      syncBody(true, false);
      return;
    }
    document.documentElement.style.fontSize = "";
    resetHold();
    useInteract.setState({ cursor: false });
  });

  observe("cursorMove", (value) => {
    if (!isCursorSurface()) return;
    const pos = (value ?? {}) as { x?: number; y?: number };
    useInteract.setState({
      cursorPos: {
        x: typeof pos.x === "number" ? pos.x : 0.5,
        y: typeof pos.y === "number" ? pos.y : 0.5,
      },
    });
  });

  observe("interact", () => {
    onSelect();
  });

  observe("hotkey", (value) => {
    const payload = (value ?? {}) as { key?: string; down?: boolean; cursor?: boolean };
    if (!payload.key) return;
    const showOnCursor = payload.cursor === true;
    const shouldHandle = showOnCursor ? isCursorSurface() : isDuiSurface();
    if (!shouldHandle) return;
    pressHotkey(payload.key, payload.down === true);
  });

  observe("scroll", (value) => {
    const payload = (value ?? {}) as { delta?: number; cursor?: boolean };
    const showOnCursor = payload.cursor === true;
    const shouldHandle = showOnCursor ? isCursorSurface() : isDuiSurface();
    if (!shouldHandle || !payload.delta) return;
    stepIndex(payload.delta > 0 ? 1 : -1);
  });

  observe("release", () => {
    resetHold();
  });

  applyThemeName("eco");
}

export function previewOpen() {
  tryOpenMenu();
}

export function previewClose() {
  closeMenu();
}

export function previewHold(progress: number) {
  useInteract.setState({ holding: progress > 0, holdProgress: progress });
}

export function selectMode(state: InteractState): PromptMode {
  if (!state.visible && !state.leaving && !state.cursor) return "hidden";
  if (state.options.length === 0) return "hidden";
  if (state.options.length === 1) return "single";
  if (state.compactEnabled && !state.expanded) return "focus";
  return "menu";
}
