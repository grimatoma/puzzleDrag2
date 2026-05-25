import { useEffect } from "react";
import { useNotifier } from "./ui/primitives/Toast.jsx";

/**
 * Minimal shape of the notifier API consumed by a11y.
 * Toast.jsx is JS (allowJs, checkJs:false), so we declare the subset we use.
 * TODO(ts-migration): import the real NotifierApi type once Toast.jsx is converted.
 */
interface NotifierApi {
  toast: (payload: {
    text: string;
    tone?: string;
    icon?: string;
    duration?: number;
    ariaLive?: "assertive" | "polite";
  }) => string | null;
}

export interface AnnounceOptions {
  /** When true, uses aria-live="assertive"; defaults to "polite". */
  assertive?: boolean;
  tone?: string;
  icon?: string;
  duration?: number;
}

let _notifier: NotifierApi | null = null;

export function _registerNotifier(api: NotifierApi | null): void {
  _notifier = api;
}

export function announce(text: string, opts: AnnounceOptions = {}): void {
  if (!text) return;
  if (!_notifier) return;
  const { assertive = false, tone = "info", icon, duration } = opts;
  _notifier.toast({
    text,
    tone,
    icon,
    duration,
    ariaLive: assertive ? "assertive" : "polite",
  });
}

export function useA11yBridge(): void {
  const notifier = useNotifier() as NotifierApi;
  useEffect(() => {
    _registerNotifier(notifier);
    return () => {
      if (_notifier === notifier) _registerNotifier(null);
    };
  }, [notifier]);
}
