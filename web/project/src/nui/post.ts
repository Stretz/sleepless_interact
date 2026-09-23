import { isEnvBrowser } from "@/utils/misc";

function resourceName() {
  if (typeof window.GetParentResourceName === "function") {
    return window.GetParentResourceName();
  }
  return "sleepless_interact";
}

export async function post(eventName: string, data?: unknown) {
  if (isEnvBrowser()) return 1;

  const response = await fetch(`https://${resourceName()}/${eventName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(data ?? {}),
  });

  return response.json();
}
