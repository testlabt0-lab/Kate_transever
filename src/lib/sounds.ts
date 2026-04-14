// ==================== Sound Generator using Web Audio API ====================
// This module generates notification sounds dynamically without external audio files

class SoundGenerator {
  private audioContext: AudioContext | null = null;
  private volume: number = 0.8;
  private enabled: boolean = true;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  // Generate a simple beep sound
  private beep(frequency: number, duration: number, type: OscillatorType = 'sine'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.enabled) {
        resolve();
        return;
      }

      try {
        const ctx = this.getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        // Envelope for smoother sound
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, ctx.currentTime + duration * 0.5);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);

        oscillator.onended = () => resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Play a sequence of beeps
  private async playSequence(notes: { freq: number; duration: number; delay: number; type?: OscillatorType }[]): Promise<void> {
    for (const note of notes) {
      await this.beep(note.freq, note.duration, note.type || 'sine');
      await this.delay(note.delay);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== Predefined Sounds ====================

  // Default notification sound
  async playDefault(): Promise<void> {
    await this.playSequence([
      { freq: 523, duration: 0.15, delay: 50 },  // C5
      { freq: 659, duration: 0.15, delay: 50 },  // E5
      { freq: 784, duration: 0.2, delay: 100 },  // G5
    ]);
  }

  // Urgent notification - fast beeps
  async playUrgent(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await this.playSequence([
        { freq: 880, duration: 0.1, delay: 50, type: 'square' },
        { freq: 988, duration: 0.1, delay: 50, type: 'square' },
      ]);
      await this.delay(100);
    }
  }

  // Timer alarm - ascending tones
  async playTimer(): Promise<void> {
    await this.playSequence([
      { freq: 440, duration: 0.15, delay: 100 },
      { freq: 554, duration: 0.15, delay: 100 },
      { freq: 659, duration: 0.15, delay: 100 },
      { freq: 880, duration: 0.3, delay: 200 },
    ]);
    await this.delay(300);
    await this.playSequence([
      { freq: 440, duration: 0.15, delay: 100 },
      { freq: 554, duration: 0.15, delay: 100 },
      { freq: 659, duration: 0.15, delay: 100 },
      { freq: 880, duration: 0.3, delay: 200 },
    ]);
  }

  // Reminder sound - gentle chimes
  async playReminder(): Promise<void> {
    await this.playSequence([
      { freq: 784, duration: 0.12, delay: 80 },  // G5
      { freq: 988, duration: 0.12, delay: 80 },  // B5
      { freq: 1175, duration: 0.15, delay: 100 }, // D6
      { freq: 1319, duration: 0.2, delay: 150 },  // E6
    ]);
  }

  // Success sound - happy chime
  async playSuccess(): Promise<void> {
    await this.playSequence([
      { freq: 523, duration: 0.1, delay: 50 },   // C5
      { freq: 659, duration: 0.1, delay: 50 },   // E5
      { freq: 784, duration: 0.1, delay: 50 },   // G5
      { freq: 1047, duration: 0.2, delay: 100 }, // C6
    ]);
  }

  // Error sound - descending tones
  async playError(): Promise<void> {
    await this.playSequence([
      { freq: 440, duration: 0.15, delay: 100 },
      { freq: 349, duration: 0.15, delay: 100 },
      { freq: 294, duration: 0.2, delay: 150 },
    ]);
  }

  // Click sound - short tick
  async playClick(): Promise<void> {
    await this.beep(1000, 0.05, 'square');
  }

  // Play sound by type
  async play(type: 'default' | 'urgent' | 'timer' | 'reminder' | 'success' | 'error' | 'click' = 'default'): Promise<void> {
    switch (type) {
      case 'urgent':
        return this.playUrgent();
      case 'timer':
        return this.playTimer();
      case 'reminder':
        return this.playReminder();
      case 'success':
        return this.playSuccess();
      case 'error':
        return this.playError();
      case 'click':
        return this.playClick();
      default:
        return this.playDefault();
    }
  }
}

// Export singleton instance
export const soundGenerator = new SoundGenerator();

// Export class for custom instances
export default SoundGenerator;
