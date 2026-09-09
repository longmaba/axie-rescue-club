export class AudioSystem {
  private context: AudioContext | null = null;
  muted = false;
  async unlock() {
    try { this.context ??= new AudioContext(); if (this.context.state !== 'running') await this.context.resume(); } catch { /* Sound is optional on browsers without Web Audio. */ }
  }
  toggle() { this.muted = !this.muted; return this.muted; }
  chime(kind = 'step') {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    const notes = kind === 'win' ? [392, 494, 587, 784] : kind === 'collect' ? [659, 880] : kind === 'action' ? [330, 440, 554] : [440];
    const ctx = this.context;
    notes.forEach((hz, i) => {
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); const t = ctx.currentTime + i * .11;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.045, t + .015); gain.gain.exponentialRampToValueAtTime(.0001, t + .38);
      oscillator.connect(gain).connect(ctx.destination); oscillator.start(t); oscillator.stop(t + .4);
    });
  }
  dispose() { void this.context?.close(); }
}
