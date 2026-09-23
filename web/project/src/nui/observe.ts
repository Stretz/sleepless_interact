type Handler = (value: unknown) => void;

const handlers = new Map<string, Handler>();

export function observe(action: string, handler: Handler) {
  handlers.set(action, handler);
}

let bound = false;

export function bindMessages() {
  if (bound) return;
  bound = true;

  window.addEventListener("message", (event: MessageEvent) => {
    const action = event.data?.action;
    if (typeof action !== "string") return;
    handlers.get(action)?.(event.data.value);
  });
}
