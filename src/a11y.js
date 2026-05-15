import { useEffect } from "react";
import { useNotifier } from "./ui/primitives/Toast.jsx";

let _notifier = null;

export function _registerNotifier(api) {
  _notifier = api;
}

export function announce(text, opts = {}) {
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

export function useA11yBridge() {
  const notifier = useNotifier();
  useEffect(() => {
    _registerNotifier(notifier);
    return () => {
      if (_notifier === notifier) _registerNotifier(null);
    };
  }, [notifier]);
}
