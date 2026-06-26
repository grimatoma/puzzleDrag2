// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Minimal fakes for the slice of the ServiceWorker API the watcher touches.
function makeWorker() {
  return { postMessage: vi.fn(), state: "installed", addEventListener: vi.fn() };
}

function makeRegistration(waiting: ReturnType<typeof makeWorker> | null = null) {
  return {
    waiting,
    installing: null as null,
    update: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
  };
}

function installServiceWorker(reg: ReturnType<typeof makeRegistration>, hasController: boolean) {
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      controller: hasController ? {} : null,
      getRegistration: vi.fn().mockResolvedValue(reg),
      addEventListener: vi.fn(),
    },
    configurable: true,
  });
}

describe("appUpdate watcher", () => {
  beforeEach(() => {
    vi.resetModules(); // reset the module-level singleton between tests
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports updateReady=true when a build is installed + waiting", async () => {
    installServiceWorker(makeRegistration(makeWorker()), /* hasController */ true);

    const { useAppUpdateReady } = await import("./appUpdate.js");
    const { result } = renderHook(() => useAppUpdateReady());

    expect(result.current).toBe(false); // initial snapshot before SW resolves
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("does NOT report an update on the very first SW install (no controller)", async () => {
    installServiceWorker(makeRegistration(makeWorker()), /* hasController */ false);

    const { useAppUpdateReady } = await import("./appUpdate.js");
    const { result } = renderHook(() => useAppUpdateReady());

    // Give getRegistration a couple of microtasks to settle, then confirm the
    // flag stayed false (a fresh install is not an "update to refresh to").
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current).toBe(false);
  });

  it("applyUpdate posts SKIP_WAITING to the waiting worker", async () => {
    const waiting = makeWorker();
    installServiceWorker(makeRegistration(waiting), true);

    const mod = await import("./appUpdate.js");
    const { result } = renderHook(() => mod.useAppUpdateReady());
    await waitFor(() => expect(result.current).toBe(true));

    mod.applyUpdate();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("checkForUpdate asks the registration to update", async () => {
    const reg = makeRegistration();
    installServiceWorker(reg, true);

    const mod = await import("./appUpdate.js");
    renderHook(() => mod.useAppUpdateReady());
    // Wait for getRegistration to resolve so the registration is cached.
    await waitFor(() =>
      expect((navigator.serviceWorker.getRegistration as ReturnType<typeof vi.fn>)).toHaveBeenCalled(),
    );
    await Promise.resolve();

    mod.checkForUpdate();
    expect(reg.update).toHaveBeenCalled();
  });

  it("checkForUpdate resolves once the check settles", async () => {
    const reg = makeRegistration();
    installServiceWorker(reg, true);

    const mod = await import("./appUpdate.js");
    renderHook(() => mod.useAppUpdateReady());
    await waitFor(() =>
      expect((navigator.serviceWorker.getRegistration as ReturnType<typeof vi.fn>)).toHaveBeenCalled(),
    );
    await Promise.resolve();

    await expect(mod.checkForUpdate()).resolves.toBeUndefined();
  });

  it("checkForUpdate resolves (does not reject) when the SW update fails", async () => {
    const reg = makeRegistration();
    reg.update = vi.fn().mockRejectedValue(new Error("offline"));
    installServiceWorker(reg, true);

    const mod = await import("./appUpdate.js");
    renderHook(() => mod.useAppUpdateReady());
    await waitFor(() =>
      expect((navigator.serviceWorker.getRegistration as ReturnType<typeof vi.fn>)).toHaveBeenCalled(),
    );
    await Promise.resolve();

    await expect(mod.checkForUpdate()).resolves.toBeUndefined();
  });
});
