import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";

const NotifierCtx = createContext(null);

const TOAST_MS = 3000;
const BUBBLE_MS = 1800;
const TOAST_MAX = 3;

const TONE_TOAST = {
  info:    "bg-iron text-cream border-iron-soft",
  success: "bg-moss text-ink border-moss-soft",
  warning: "bg-gold text-ink border-gold-soft",
  danger:  "bg-rose text-cream border-rose",
  moss:    "bg-moss text-ink border-moss-soft",
  ember:   "bg-ember text-cream border-ember-soft",
  gold:    "bg-gold text-ink border-gold-soft",
  iron:    "bg-iron text-cream border-iron-soft",
};

let nextId = 1;
const uid = () => `n${nextId++}`;

function ToastItem({ entry, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(entry.id), entry.duration ?? TOAST_MS);
    return () => clearTimeout(t);
  }, [entry, onDone]);

  const toneCls = TONE_TOAST[entry.tone] || TONE_TOAST.info;
  return (
    <div
      className={`pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border shadow-md text-body font-medium tabular-nums animate-[fadein_180ms_ease-out] ${toneCls}`}
      style={{ animation: "toastIn 180ms ease-out" }}
    >
      {entry.icon && <Icon iconKey={entry.icon} size={18} />}
      <span className="leading-tight">{entry.text}</span>
    </div>
  );
}

function BubbleItem({ entry, onDone, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(entry.id), entry.duration ?? BUBBLE_MS);
    return () => clearTimeout(t);
  }, [entry, onDone]);

  return (
    <button
      type="button"
      onClick={() => onDismiss(entry.id)}
      className="pointer-events-auto max-w-xs px-3 py-2 bg-parchment text-ink rounded-lg border border-iron shadow-md text-body text-left"
      aria-label="Dismiss bubble"
    >
      {entry.npcKey && (
        <span className="block text-micro font-semibold uppercase tracking-wider text-iron-deep mb-0.5">
          {entry.npcKey}
        </span>
      )}
      <span className="leading-snug">{entry.text}</span>
    </button>
  );
}

export function NotifierProvider({ children, onBeat }) {
  const [toasts, setToasts] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const onBeatRef = useRef(onBeat);
  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  const dropToast = useCallback((id) => {
    setToasts((q) => q.filter((t) => t.id !== id));
  }, []);
  const dropBubble = useCallback((id) => {
    setBubbles((q) => q.filter((b) => b.id !== id));
  }, []);

  const api = useMemo(
    () => ({
      toast(payload) {
        const entry = { id: uid(), ...payload };
        setToasts((q) => {
          const next = [...q, entry];
          return next.length > TOAST_MAX ? next.slice(next.length - TOAST_MAX) : next;
        });
        return entry.id;
      },
      bubble(payload) {
        const entry = { id: uid(), ...payload };
        setBubbles((q) => [...q, entry]);
        return entry.id;
      },
      beat(payload) {
        onBeatRef.current?.(payload);
      },
      dismissToast: dropToast,
      dismissBubble: dropBubble,
    }),
    [dropToast, dropBubble]
  );

  const portal =
    typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              aria-live="polite"
              aria-atomic="false"
              className="fixed left-1/2 -translate-x-1/2 z-[9998] flex flex-col items-center gap-2 pointer-events-none"
              style={{
                bottom:
                  "calc(var(--chrome-bottom) + var(--safe-bottom) + 16px)",
              }}
            >
              {toasts.map((entry) => (
                <ToastItem key={entry.id} entry={entry} onDone={dropToast} />
              ))}
            </div>
            <div
              aria-live="polite"
              aria-atomic="false"
              className="fixed left-1/2 -translate-x-1/2 z-[9997] flex flex-col items-center gap-2 pointer-events-none"
              style={{
                top: "calc(var(--chrome-top) + var(--safe-top) + 16px)",
              }}
            >
              {bubbles.map((entry) => (
                <BubbleItem
                  key={entry.id}
                  entry={entry}
                  onDone={dropBubble}
                  onDismiss={dropBubble}
                />
              ))}
            </div>
            <div aria-live="assertive" className="sr-only" />
          </>,
          document.body
        )
      : null;

  return (
    <NotifierCtx.Provider value={api}>
      {children}
      {portal}
    </NotifierCtx.Provider>
  );
}

export function useNotifier() {
  const ctx = useContext(NotifierCtx);
  if (!ctx) {
    return {
      toast: () => null,
      bubble: () => null,
      beat: () => null,
      dismissToast: () => {},
      dismissBubble: () => {},
    };
  }
  return ctx;
}

export default NotifierProvider;
