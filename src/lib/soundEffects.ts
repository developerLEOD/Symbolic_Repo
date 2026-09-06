// Industrial tactile synthesized audio engine using Web Audio API.
// Tuned for the sweet spot: snappy, mechanical, tactile "thock" with solid acoustic weight,
// crisp definition, and zero subwoofer mud or piercing tinny treble.

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastHoverTime: number = 0;
  private impulseNoiseBuffer: AudioBuffer | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Normalizes volume parameters so callers passing either a fractional value
   * (e.g. 0.04 - 0.15) or standard multipliers (1.0) achieve a well-balanced acoustic level.
   */
  private normalizeVol(vol?: number, defaultBase: number = 1.0): number {
    if (vol === undefined) return defaultBase;
    if (vol <= 0.2) {
      // Scale legacy fractional levels into an audible, comfortable range
      return (0.7 + (vol / 0.1) * 0.5) * defaultBase;
    }
    return Math.min(Math.max(vol, 0.4), 2.0) * defaultBase;
  }

  /**
   * Pre-generates a short noise burst for mechanical tactile friction transients
   */
  private getImpulseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.impulseNoiseBuffer && this.impulseNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.impulseNoiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.035); // 35ms
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // Pink/gentle noise distribution for natural physical contact texture
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    this.impulseNoiseBuffer = buffer;
    return buffer;
  }

  /**
   * Crisp, tactile rotary micro-detent for hover interactions.
   * Light, dry, and responsive like stepping across a notched industrial dial.
   * Tight 14ms decay — zero low-end mud and zero shrill treble.
   */
  public playHover(volumeInput?: number) {
    if (this.isMuted) return;
    const now = Date.now();
    // Throttle to keep rapid pointer sweeps crisp and distinct
    if (now - this.lastHoverTime < 38) return;
    this.lastHoverTime = now;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const t = ctx.currentTime;
      const jitter = 1 + (Math.random() * 0.06 - 0.03);
      const effectiveVol = this.normalizeVol(volumeInput, 0.09);

      // Low-pass filter at 850Hz to keep it rounded, clean, and never tinny
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(850, t);
      filter.Q.setValueAtTime(1.2, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(effectiveVol, t);
      gain.connect(ctx.destination);
      filter.connect(gain);

      // Snappy micro-transient: 380Hz down to 140Hz in 14ms
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(380 * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.014);

      oscGain.gain.setValueAtTime(0.85, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.014);

      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(t);
      osc.stop(t + 0.016);
    } catch {
      // Autoplay policy fallback
    }
  }

  /**
   * Satisfying mechanical "thock" click.
   * Combines a punchy tactile mid-low knock (180Hz -> 65Hz) with a crisp mechanical
   * latch snap (580Hz -> 180Hz). Snappy, firm, satisfying, and clean.
   */
  public playClick(volumeInput?: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const t = ctx.currentTime;
      const jitter = 1 + (Math.random() * 0.05 - 0.025);
      const effectiveVol = this.normalizeVol(volumeInput, 0.16);

      // Main filter: cuts off harshness above 1,100Hz while preserving crisp definition
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1100, t);
      filter.Q.setValueAtTime(1.4, t);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(effectiveVol, t);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      // 1. Solid Tactile Knock (firm body without subwoofer boom: 180Hz down to 60Hz)
      const knockOsc = ctx.createOscillator();
      const knockGain = ctx.createGain();
      knockOsc.type = "triangle";
      knockOsc.frequency.setValueAtTime(180 * jitter, t);
      knockOsc.frequency.exponentialRampToValueAtTime(60, t + 0.032);

      knockGain.gain.setValueAtTime(0.95, t);
      knockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.034);

      knockOsc.connect(knockGain);
      knockGain.connect(filter);

      knockOsc.start(t);
      knockOsc.stop(t + 0.036);

      // 2. Crisp Mechanical Latch Snap (gives the physical click articulation: 560Hz down to 170Hz)
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = "sine";
      snapOsc.frequency.setValueAtTime(560 * jitter, t);
      snapOsc.frequency.exponentialRampToValueAtTime(170, t + 0.018);

      snapGain.gain.setValueAtTime(0.5, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.019);

      snapOsc.connect(snapGain);
      snapGain.connect(filter);

      snapOsc.start(t);
      snapOsc.stop(t + 0.021);

      // 3. Dry Tactile Friction Transient (very short 12ms physical tap)
      const noise = ctx.createBufferSource();
      noise.buffer = this.getImpulseBuffer(ctx);

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(800, t);
      noiseFilter.Q.setValueAtTime(1.5, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(filter);

      noise.start(t);
      noise.stop(t + 0.015);
    } catch {
      // Autoplay policy fallback
    }
  }

  /**
   * Tactile toggle latch for controls, view switchers, and tabs.
   * Quick, snappy 20ms mechanical detent.
   */
  public playToggle(volumeInput?: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const t = ctx.currentTime;
      const effectiveVol = this.normalizeVol(volumeInput, 0.12);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(950, t);
      filter.Q.setValueAtTime(1.3, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(effectiveVol, t);

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.022);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.9, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.024);

      osc.connect(oscGain);
      oscGain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.026);
    } catch {
      // Graceful fallback
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
