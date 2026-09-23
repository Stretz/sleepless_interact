import { useEffect, useState } from "react";
import { isEnvBrowser } from "@/utils/misc";
import { previewClose, previewHold, previewOpen, useInteract } from "@/stores/interact";

const THEMES = ["eco", "modern", "vice", "cyber", "light", "retro", "noir"];

const POLICE = [
  { label: "Equip Uniform", icon: "fa-solid fa-shirt" },
  { label: "Take Duty Vest", icon: "fa-solid fa-vest" },
  { label: "Grab Medkit", icon: "fa-solid fa-kit-medical", holdTime: 1500 },
  { label: "Change Outfit", icon: "fa-solid fa-arrows-rotate" },
  { label: "Personal Stash", icon: "fa-solid fa-box" },
];

const VEHICLE = [
  { label: "Check Engine", icon: "fa-solid fa-magnifying-glass" },
  { label: "Repair Engine", icon: "fa-solid fa-wrench" },
  { label: "Check Oil", icon: "fa-solid fa-oil-can" },
  { label: "Wash Vehicle", icon: "fa-solid fa-soap" },
  { label: "Push Vehicle", icon: "fa-solid fa-hand" },
];

type Scene = "police" | "vehicle" | "single";

function scenePayload(scene: Scene) {
  if (scene === "single") {
    return {
      title: "Vehicle",
      icon: "fa-solid fa-car",
      options: {
        global: [{ label: "Unlock", icon: "fa-solid fa-lock" }],
      },
    };
  }

  if (scene === "vehicle") {
    return {
      title: "Vehicle",
      icon: "fa-solid fa-car",
      options: { global: VEHICLE },
    };
  }

  return {
    title: "Police Locker",
    icon: "fa-solid fa-shield-halved",
    options: { global: POLICE },
  };
}

function publish(scene: Scene) {
  const payload = scenePayload(scene);
  window.postMessage({ action: "setLabel", value: payload.title }, "*");
  window.postMessage({ action: "setKey", value: "E" }, "*");
  window.postMessage(
    {
      action: "setOptions",
      value: { ...payload, resetIndex: true },
    },
    "*",
  );
}

function show(scene: Scene, open: boolean) {
  publish(scene);
  window.setTimeout(() => {
    if (open) previewOpen();
    else previewClose();
  }, 0);
}

export function BrowserDock() {
  const [scene, setScene] = useState<Scene>("police");
  const [open, setOpen] = useState(true);
  const theme = useInteract((state) => state.theme);
  const cooldown = useInteract((state) => state.cooldown);

  useEffect(() => {
    if (!isEnvBrowser()) return;
    document.documentElement.dataset.browser = "true";
    window.postMessage({ action: "visible", value: true }, "*");
    window.postMessage({ action: "setMenu", value: { compact: true, idleMs: 8000 } }, "*");
    publish("police");
    window.setTimeout(() => previewOpen(), 0);
  }, []);

  if (!isEnvBrowser()) return null;

  return (
    <div className="dock">
      {THEMES.map((id) => (
        <button
          key={id}
          type="button"
          className={theme === id ? "is-active" : undefined}
          onClick={() => window.postMessage({ action: "setTheme", value: id }, "*")}
        >
          {id}
        </button>
      ))}
      <button
        type="button"
        className={scene === "police" && open ? "is-active" : undefined}
        onClick={() => {
          setScene("police");
          setOpen(true);
          show("police", true);
        }}
      >
        Menu
      </button>
      <button
        type="button"
        className={scene === "police" && !open ? "is-active" : undefined}
        onClick={() => {
          setScene("police");
          setOpen(false);
          show("police", false);
        }}
      >
        Focus
      </button>
      <button
        type="button"
        className={scene === "single" ? "is-active" : undefined}
        onClick={() => {
          setScene("single");
          setOpen(false);
          show("single", false);
        }}
      >
        Chip
      </button>
      <button
        type="button"
        className={scene === "vehicle" ? "is-active" : undefined}
        onClick={() => {
          setScene("vehicle");
          setOpen(true);
          show("vehicle", true);
        }}
      >
        Vehicle
      </button>
      <button
        type="button"
        className={cooldown ? "is-active" : undefined}
        onClick={() => window.postMessage({ action: "setCooldown", value: !cooldown }, "*")}
      >
        Cooldown
      </button>
      <button type="button" onClick={() => previewHold(0.62)}>
        Hold
      </button>
    </div>
  );
}
