/** Shared RAF driver for Dev Panel icon animation previews. */

type DrawCallback = (t: number) => void;

class IconAnimationTicker {
  private callbacks = new Map<symbol, DrawCallback>();
  private rafId = 0;

  subscribe(id: symbol, draw: DrawCallback): void {
    this.callbacks.set(id, draw);
    if (this.rafId === 0) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  unsubscribe(id: symbol): void {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0 && this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** @internal Test hook — number of active animation subscribers. */
  get subscriberCount(): number {
    return this.callbacks.size;
  }

  private tick = (): void => {
    const t = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    for (const draw of this.callbacks.values()) {
      draw(t);
    }
    if (this.callbacks.size > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = 0;
    }
  };
}

export const iconAnimationTicker = new IconAnimationTicker();
