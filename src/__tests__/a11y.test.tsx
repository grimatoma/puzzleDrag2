// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { announce, _registerNotifier } from "../a11y.js";
import type { NotifierApi } from "../ui/primitives/Toast.js";

describe("a11y announce", () => {
  let mockNotifier: NotifierApi;

  beforeEach(() => {
    mockNotifier = {
      toast: vi.fn().mockReturnValue("toast-id"),
      bubble: vi.fn(),
      beat: vi.fn(),
      dismissToast: vi.fn(),
      dismissBubble: vi.fn(),
    };
    _registerNotifier(null); // Reset before each test
  });

  it("does nothing if no notifier is registered", () => {
    announce("Hello World");
    expect(mockNotifier.toast).not.toHaveBeenCalled();
  });

  it("does nothing if text is empty", () => {
    _registerNotifier(mockNotifier);
    announce("");
    expect(mockNotifier.toast).not.toHaveBeenCalled();
  });

  it("calls toast with default options", () => {
    _registerNotifier(mockNotifier);
    announce("Hello Default");
    expect(mockNotifier.toast).toHaveBeenCalledWith({
      text: "Hello Default",
      tone: "info",
      icon: undefined,
      duration: undefined,
      ariaLive: "polite",
    });
  });

  it("calls toast with custom options", () => {
    _registerNotifier(mockNotifier);
    announce("Hello Custom", {
      assertive: true,
      tone: "success",
      icon: "check",
      duration: 5000,
    });
    expect(mockNotifier.toast).toHaveBeenCalledWith({
      text: "Hello Custom",
      tone: "success",
      icon: "check",
      duration: 5000,
      ariaLive: "assertive",
    });
  });
});
