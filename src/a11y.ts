import { useEffect } from "react";
import { useNotifier, type NotifierApi } from "./ui/primitives/Toast.jsx";

type ToastTone = "info" | "success" | "warning" | "danger" | "moss" | "ember" | "gold" | "iron";

export interface AnnounceOptions {
  /** When true, uses aria-live="assertive"; defaults to "polite". */
  assertive?: boolean;
  tone?: ToastTone;
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
  const { assertive = false, tone = "info" as ToastTone, icon, duration } = opts;
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
