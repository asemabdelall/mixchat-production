/**
 * Web Audio API Sound Synthesizer for MixChat Calling
 * Generates crisp, realistic telephone ringback and electronic chime tones with zero external asset dependencies.
 */

class CallSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: NodeJS.Timeout | null = null;
  private ringbackInterval: NodeJS.Timeout | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play a dual-frequency pleasant electronic ringtone pulse for incoming calls
   */
  private playRingtonePulse() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // 853Hz + 960Hz harmonic dual tone with pitch envelope
      osc1.frequency.setValueAtTime(853, now);
      osc1.frequency.exponentialRampToValueAtTime(1020, now + 0.4);

      osc2.frequency.setValueAtTime(960, now);
      osc2.frequency.exponentialRampToValueAtTime(1280, now + 0.4);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);

      // Second beep in sequence
      const secondBeepTime = now + 0.6;
      const osc3 = ctx.createOscillator();
      const osc4 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc3.type = 'sine';
      osc4.type = 'triangle';
      osc3.frequency.setValueAtTime(960, secondBeepTime);
      osc3.frequency.exponentialRampToValueAtTime(1200, secondBeepTime + 0.5);
      osc4.frequency.setValueAtTime(1200, secondBeepTime);
      osc4.frequency.exponentialRampToValueAtTime(1440, secondBeepTime + 0.5);

      gain2.gain.setValueAtTime(0.001, secondBeepTime);
      gain2.gain.linearRampToValueAtTime(0.2, secondBeepTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, secondBeepTime + 0.6);

      osc3.connect(gain2);
      osc4.connect(gain2);
      gain2.connect(ctx.destination);

      osc3.start(secondBeepTime);
      osc4.start(secondBeepTime);
      osc3.stop(secondBeepTime + 0.6);
      osc4.stop(secondBeepTime + 0.6);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Play standard telephone ringback tone for caller (440Hz + 480Hz)
   */
  private playRingbackPulse() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.setValueAtTime(0.12, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    } catch {
      // Audio autoplay fallback
    }
  }

  /**
   * Play connected chime tone when call connects
   */
  public playConnectSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.3); // C6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Ignore
    }
  }

  /**
   * Play hangup/end chime
   */
  public playEndSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.setValueAtTime(523.25, now + 0.15); // C5
      osc.frequency.setValueAtTime(392.0, now + 0.3); // G4

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Ignore
    }
  }

  /**
   * Start looping incoming ringtone
   */
  public startRingtone() {
    this.stopAll();
    this.playRingtonePulse();
    this.ringtoneInterval = setInterval(() => {
      this.playRingtonePulse();
    }, 2800);
  }

  /**
   * Start looping outgoing ringback tone
   */
  public startRingback() {
    this.stopAll();
    this.playRingbackPulse();
    this.ringbackInterval = setInterval(() => {
      this.playRingbackPulse();
    }, 3500);
  }

  /**
   * Stop all playing sound loops
   */
  public stopAll() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
  }
}

export const callSounds = new CallSoundSynthesizer();
