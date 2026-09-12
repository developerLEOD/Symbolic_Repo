// Industrial tactile synthesized audio engine using Web Audio API.
// Engineered specifically for the TACTILE BLUE CLACK profile (Mechanical Switch).

class TactileSoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 1.0;
  private pitchMultiplier: number = 1.1;
  private lastHoverTime: number = 0;
  private impulseNoiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("symbolic_audio_muted");
      if (savedMute !== null) {
        this.isMuted = savedMute === "true";
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getImpulseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.impulseNoiseBuffer && this.impulseNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.impulseNoiseBuffer;
    }
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    this.impulseNoiseBuffer = buffer;
    return buffer;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("symbolic_audio_muted", String(this.isMuted));
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("symbolic_audio_muted", String(this.isMuted));
    }
  }

  // --- TACTILE BLUE SWITCH HOVER (Tick) ---
  public playHover(volumeInput: number = 0.045) {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastHoverTime < 32) return;
    this.lastHoverTime = now;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const t = ctx.currentTime;
      const pitch = this.pitchMultiplier;
      const jitter = 1 + (Math.random() * 0.04 - 0.02);
      const effectiveVol = volumeInput * this.masterVolume;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400 * pitch, t);
      filter.Q.setValueAtTime(2.2, t);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(effectiveVol * 0.9, t);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(540 * pitch * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(240 * pitch, t + 0.014);

      oscGain.gain.setValueAtTime(0.85, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.014);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start(t);
      osc.stop(t + 0.016);
    } catch {
      // AudioContext fallback
    }
  }

  // --- TACTILE BLUE CLACK (Dual-Stage Click) ---
  public playClick(volumeInput: number = 0.18) {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const t = ctx.currentTime;
      const pitch = this.pitchMultiplier;
      const jitter = 1 + (Math.random() * 0.04 - 0.02);
      const effectiveVol = volumeInput * this.masterVolume;

      // Filter
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1100 * pitch, t);
      filter.Q.setValueAtTime(1.5, t);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(effectiveVol * 1.15, t);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Stage 1: Leaf Clack Snap
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "square";
      osc1.frequency.setValueAtTime(880 * pitch * jitter, t);
      osc1.frequency.exponentialRampToValueAtTime(280 * pitch, t + 0.016);

      gain1.gain.setValueAtTime(0.55, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.016);

      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start(t);
      osc1.stop(t + 0.018);

      // Stage 2: Bottom-Out Body
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(180 * pitch * jitter, t + 0.006);
      osc2.frequency.exponentialRampToValueAtTime(70 * pitch, t + 0.034);

      gain2.gain.setValueAtTime(0.85, t + 0.006);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.034);

      osc2.connect(gain2);
      gain2.connect(filter);
      osc2.start(t + 0.006);
      osc2.stop(t + 0.036);
    } catch {
      // AudioContext fallback
    }
  }

  public playToggle(volumeInput: number = 0.12) {
    this.playClick(volumeInput);
  }

  public playSuccess(volumeInput: number = 0.2) {
    this.playClick(volumeInput);
  }
}

export const soundManager = new TactileSoundManager();
