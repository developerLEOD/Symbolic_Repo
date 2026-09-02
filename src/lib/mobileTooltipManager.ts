type TooltipListener = () => void;

class MobileTooltipManager {
  private suppressedUntil: number = 0;
  private closedProductId: string | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private listeners: Set<TooltipListener> = new Set();

  /**
   * Called on mobile when a tooltip item (e.g. angle thumbnail) is selected
   * and/or the cross (X) button is pressed.
   * Suppresses the tooltip from showing again for 60 seconds.
   */
  suppress(productId: string, durationMs: number = 60000) {
    this.suppressedUntil = Date.now() + durationMs;
    this.closedProductId = productId;
    this.notify();

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      if (this.closedProductId === productId) {
        this.clear();
      }
    }, durationMs);
  }

  /**
   * Called when another product is hovered on (PC) or dwelled on / revealed (mobile).
   * If another product is activated (productId !== closedProductId),
   * the 60-second suppression on the previous product is cleared.
   */
  onProductRevealed(productId: string) {
    if (this.closedProductId && this.closedProductId !== productId && this.isSuppressed(this.closedProductId)) {
      // Another product was dwelled on / revealed! Clear the 60s suppression
      this.clear();
    }
  }

  /**
   * Backwards compatible alias
   */
  onProductHovered(productId: string) {
    this.onProductRevealed(productId);
  }

  /**
   * Checks whether the tooltip for a given productId is currently suppressed.
   */
  isSuppressed(productId: string): boolean {
    if (Date.now() >= this.suppressedUntil) {
      return false;
    }
    return this.closedProductId === productId;
  }

  /**
   * Check if any suppression is currently active across the system.
   */
  hasActiveSuppression(): boolean {
    return Date.now() < this.suppressedUntil && this.closedProductId !== null;
  }

  /**
   * Returns remaining seconds of cooldown for a product.
   */
  getRemainingCooldown(productId: string): number {
    if (!this.isSuppressed(productId)) return 0;
    return Math.max(0, Math.ceil((this.suppressedUntil - Date.now()) / 1000));
  }

  clear() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.suppressedUntil = 0;
    this.closedProductId = null;
    this.notify();
  }

  subscribe(listener: TooltipListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const mobileTooltipManager = new MobileTooltipManager();
