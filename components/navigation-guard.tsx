"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
type Guard = { dirty: boolean; save: () => Promise<boolean> };
const Context = createContext<{
  register: (guard: Guard) => void;
  navigate: (action: () => void) => void;
} | null>(null);
export function useNavigationGuard() {
  const context = useContext(Context);
  if (!context) throw new Error("Navigation guard is missing.");
  return context;
}
export function NavigationGuard({ children }: { children: React.ReactNode }) {
  const guard = useRef<Guard>({ dirty: false, save: async () => true });
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);
  const register = useCallback((value: Guard) => {
    guard.current = value;
  }, []);
  const navigate = useCallback((action: () => void) => {
    if (guard.current.dirty) setPending(() => action);
    else action();
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (guard.current.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest?.("a");
      if (
        !guard.current.dirty ||
        !link ||
        link.target === "_blank" ||
        link.getAttribute("href")?.startsWith("#") ||
        event.ctrlKey ||
        event.metaKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPending(() => () => window.location.assign(link.href));
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, []);
  return (
    <Context.Provider value={{ register, navigate }}>
      {children}
      {pending && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-title"
            className="panel modal"
          >
            <h2 id="unsaved-title">Save your changes first?</h2>
            <p>
              Your latest edits have not been saved. Save the draft before
              leaving, or stay here to keep editing.
            </p>
            <div className="actions">
              <button
                autoFocus
                className="button secondary"
                disabled={saving}
                onClick={() => setPending(null)}
              >
                Stay here
              </button>
              <button
                className="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  const ok = await guard.current.save();
                  setSaving(false);
                  if (ok) {
                    guard.current.dirty = false;
                    setPending(null);
                    pending();
                  } else setPending(null);
                }}
              >
                {saving ? "Saving…" : "Save and continue"}
              </button>
            </div>
          </section>
        </div>
      )}
    </Context.Provider>
  );
}
