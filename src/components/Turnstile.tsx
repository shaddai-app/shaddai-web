import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile'));
    document.head.append(s);
  });
  return loading;
}

/**
 * Widget anti-spam de Cloudflare Turnstile (solo en formularios públicos). Llama a onToken con el
 * token (o null cuando vence) para mandarlo al servidor.
 */
export function Turnstile({
  siteKey,
  onToken,
  language,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  language: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    void loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        language,
        callback: (token: string) => callback.current(token),
        'expired-callback': () => callback.current(null),
        'error-callback': () => callback.current(null),
      });
    });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, language]);

  return <div ref={ref} />;
}
