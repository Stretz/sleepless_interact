import { clsx, type ClassValue } from "clsx";
import type { CSSProperties } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isEnvBrowser() {
  if (typeof window.invokeNative === "function") return false;

  const href = String(window.location.href);
  if (href.startsWith("nui://") || href.includes("cfx-nui-")) return false;

  const protocol = window.location.protocol;
  return protocol === "http:" || protocol === "https:" || protocol === "file:";
}

export function isDuiSurface() {
  return new URLSearchParams(window.location.search).get("surface") === "dui";
}

export function isCursorSurface() {
  return !isEnvBrowser() && !isDuiSurface();
}

export function toneStyle(color?: [number, number, number, number]) {
  if (!color) return undefined;
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  const hex = `#${channel(color[0])}${channel(color[1])}${channel(color[2])}`;
  return {
    "--line": hex,
    "--icon": hex,
    "--keycap-line": hex,
    "--key-accent": hex,
  } as CSSProperties;
}

export function iconClass(icon?: string | null) {
  if (!icon) return "";
  if (icon.includes("fa-")) return icon;
  return `fa-solid fa-${icon}`;
}

const SEQUENCE = ["E", "F", "G", "H", "I", "J", "K", "L", "Z", "X", "C", "V", "B", "N", "M", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function rowKey(index: number, bound: string, explicit?: string) {
  if (explicit && explicit.trim()) return explicit.trim().toUpperCase();
  const key = bound.trim().toUpperCase() || "E";
  const at = SEQUENCE.indexOf(key);
  if (at < 0) return key;
  return SEQUENCE[(at + index) % SEQUENCE.length];
}

export function mixHex(base: [number, number, number], tint: [number, number, number], amount: number) {
  const channel = (index: number) =>
    Math.max(0, Math.min(255, Math.round(base[index] + (tint[index] - base[index]) * amount)));
  return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, "0")).join("")}`;
}

export function onLightText(r: number, g: number, b: number) {
  const lin = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.62;
}
