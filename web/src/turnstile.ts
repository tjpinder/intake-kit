// Cloudflare Turnstile in the browser: loaded only when the server has a site key, and run once
// when a session starts. https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function load(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile didn't load")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Turnstile couldn't be loaded"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Runs a Turnstile challenge (usually invisible) and resolves with a single-use token. */
export async function getTurnstileToken(siteKey: string, container: HTMLElement): Promise<string> {
  const api = await load();
  return new Promise((resolve, reject) => {
    const id = api.render(container, {
      sitekey: siteKey,
      execution: "execute",
      appearance: "interaction-only",
      callback: (token: string) => {
        resolve(token);
        setTimeout(() => api.remove(id), 0);
      },
      "error-callback": () => {
        reject(new Error("We couldn't confirm you're a person."));
        setTimeout(() => api.remove(id), 0);
      },
    });
    api.execute(id);
  });
}
