/**
 * Процедурный звуковой движок на Web Audio API без внешних аудиофайлов.
 * Строго соблюдает требование модерации Яндекс Игр (п. 4.4 / звук):
 * звук гарантированно приглушается при потере фокуса окна (blur / visibilitychange)
 * и во время показа полноэкранной/видео рекламы.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this.mutedByPlatform = false; // Флаг внешней блокировки (реклама или потеря фокуса)

    this._bindFocusEvents();
  }

  /**
   * Ленивая инициализация AudioContext после первого взаимодействия пользователя
   */
  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this._updateGain();
    }
    if (this.ctx.state === 'suspended' && !this.mutedByPlatform && this.enabled) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _updateGain() {
    if (!this.masterGain || !this.ctx) return;
    const shouldPlay = this.enabled && !this.mutedByPlatform;
    this.masterGain.gain.setValueAtTime(shouldPlay ? 0.35 : 0.0, this.ctx.currentTime);
  }

  _bindFocusEvents() {
    window.addEventListener('blur', () => {
      this.setPlatformMute(true);
    });

    window.addEventListener('focus', () => {
      this.setPlatformMute(false);
    });

    document.addEventListener('visibilitychange', () => {
      this.setPlatformMute(document.hidden);
    });
  }

  /**
   * Вызывается при потере фокуса или открытии рекламы Яндекс Игр
   */
  setPlatformMute(muted) {
    this.mutedByPlatform = muted;
    if (!this.ctx) return;
    this._updateGain();
    if (muted && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    } else if (!muted && this.enabled && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    this._ensureContext();
    this._updateGain();
    if (this.enabled) {
      this.playClick();
    }
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    this._updateGain();
  }

  /**
   * Короткий звук прыжка (восходящий свайп частоты)
   */
  playJump(isDouble = false) {
    if (!this.enabled || this.mutedByPlatform) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isDouble ? 'triangle' : 'sine';
    const baseFreq = isDouble ? 340 : 240;
    const endFreq = isDouble ? 680 : 480;

    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.14);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Мягкий стук при приземлении на блок
   */
  playLand() {
    if (!this.enabled || this.mutedByPlatform) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Звук активации чекпоинта (приятный двунотный аккорд)
   */
  playCheckpoint() {
    if (!this.enabled || this.mutedByPlatform) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.23);
    });
  }

  /**
   * Звук смерти / падения в лаву или бездну
   */
  playDeath() {
    if (!this.enabled || this.mutedByPlatform) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.36);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * Победная фанфара на финише
   */
  playFinish() {
    if (!this.enabled || this.mutedByPlatform) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const melody = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    melody.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  /**
   * Короткий клик для UI-кнопок
   */
  playClick() {
    if (!this.enabled || this.mutedByPlatform) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}
