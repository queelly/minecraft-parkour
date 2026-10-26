/**
 * Запись таймлайна движений текущего игрока с частотой 15 Гц для асинхронного мультиплеера.
 * Позволяет отправлять сессию в ysdk.multiplayer.sessions и сохранять лучший личный «призрак» локально.
 */
export class GhostRecorder {
  constructor() {
    this.frames = [];
    this.recordInterval = 1 / 15; // 15 сэмплов в секунду — баланс плавности и компактного размера JSON
    this.accumulator = 0;
    this.isRecording = false;
  }

  start() {
    this.frames = [];
    this.accumulator = 0;
    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
    return this.frames;
  }

  /**
   * Записывает ключевой кадр { t, x, y, z, yaw }
   */
  recordStep(delta, runTimeSeconds, position, yaw) {
    if (!this.isRecording) return;

    this.accumulator += delta;
    if (this.accumulator >= this.recordInterval || this.frames.length === 0) {
      this.accumulator = 0;
      this.frames.push({
        t: Number(runTimeSeconds.toFixed(3)),
        x: Number(position.x.toFixed(2)),
        y: Number(position.y.toFixed(2)),
        z: Number(position.z.toFixed(2)),
        yaw: Number(yaw.toFixed(2))
      });
    }
  }

  /**
   * Сохраняет лучший заезд уровня в localStorage для соревнований с собственным рекордом
   */
  saveBestLocalGhost(levelId, frames) {
    try {
      localStorage.setItem(`mc_parkour_ghost_lvl_${levelId}`, JSON.stringify(frames));
    } catch (_) {}
  }

  loadBestLocalGhost(levelId) {
    try {
      const raw = localStorage.getItem(`mc_parkour_ghost_lvl_${levelId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 1) return parsed;
      }
    } catch (_) {}
    return null;
  }
}
