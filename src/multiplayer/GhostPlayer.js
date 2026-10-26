import * as THREE from 'three';

/**
 * Воспроизведение асинхронных «призраков» соперников на трассе.
 * Каждый призрак — полупрозрачный блочный аватар в стиле Minecraft (тело + голова с визором),
 * чья позиция и поворот плавно интерполируются по записанному таймлайну { t, x, y, z, yaw }.
 */
export class GhostPlayer {
  constructor(scene) {
    this.scene = scene;
    this.ghosts = [];

    // Переиспользуемая геометрия для всех призраков
    this.bodyGeo = new THREE.BoxGeometry(0.55, 1.0, 0.35);
    this.headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  }

  /**
   * Очищает старых призраков и создаёт меши для нового заезда
   */
  setGhosts(ghostDataList) {
    this.clear();

    const colors = [0x38bdf8, 0xf43f5e, 0xa855f7, 0xfacc15];

    ghostDataList.forEach((data, idx) => {
      if (!data.frames || data.frames.length < 2) return;

      const color = colors[idx % colors.length];
      const group = new THREE.Group();

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.45,
        roughness: 0.3
      });

      const body = new THREE.Mesh(this.bodyGeo, mat);
      body.position.y = 0.65;
      group.add(body);

      const head = new THREE.Mesh(this.headGeo, mat);
      head.position.y = 1.42;
      group.add(head);

      const first = data.frames[0];
      group.position.set(first.x, first.y, first.z);
      this.scene.add(group);

      this.ghosts.push({
        name: data.name || `Призрак #${idx + 1}`,
        frames: data.frames,
        mesh: group,
        material: mat
      });
    });
  }

  /**
   * Генерирует эталонный таймлайн бота-спидранера по путевым точкам уровня,
   * чтобы у игрока всегда был живой соперник даже при первом запуске в оффлайне.
   */
   static createBotGhost(waypoints, totalTime = 24.0) {
    if (!waypoints || waypoints.length < 2) return null;

    const frames = [];
    const stepCount = waypoints.length - 1;
    const segDuration = totalTime / stepCount;

    for (let i = 0; i < stepCount; i++) {
      const p0 = waypoints[i];
      const p1 = waypoints[i + 1];
      const subSteps = 10;

      for (let s = 0; s < subSteps; s++) {
        const alpha = s / subSteps;
        const t = i * segDuration + alpha * segDuration;

        // Линейная интерполяция XZ + параболическая дуга прыжка по Y
        const x = p0.x + (p1.x - p0.x) * alpha;
        const z = p0.z + (p1.z - p0.z) * alpha;
        const baseY = p0.y + (p1.y - p0.y) * alpha;
        const jumpArc = Math.sin(alpha * Math.PI) * 1.35;
        const y = baseY + jumpArc;

        const yaw = Math.atan2(-(p1.x - p0.x), -(p1.z - p0.z));

        frames.push({
          t: Number(t.toFixed(3)),
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          z: Number(z.toFixed(2)),
          yaw: Number(yaw.toFixed(2))
        });
      }
    }

    const last = waypoints[waypoints.length - 1];
    frames.push({
      t: Number(totalTime.toFixed(3)),
      x: last.x,
      y: last.y,
      z: last.z,
      yaw: 0
    });

    return {
      id: 'bot_speedrunner',
      name: 'Призрак Мастера',
      frames
    };
  }

  /**
   * Интерполяция позиции и угла поворота всех активных призраков на момент времени runTimeSeconds
   */
  update(runTimeSeconds) {
    for (const ghost of this.ghosts) {
      const frames = ghost.frames;
      const lastFrame = frames[frames.length - 1];

      if (runTimeSeconds >= lastFrame.t) {
        ghost.mesh.position.set(lastFrame.x, lastFrame.y, lastFrame.z);
        ghost.mesh.rotation.y = lastFrame.yaw || 0;
        continue;
      }

      // Находим два соседних кадра для плавной линейной интерполяции
      let idx = 0;
      while (idx < frames.length - 2 && frames[idx + 1].t < runTimeSeconds) {
        idx++;
      }

      const f0 = frames[idx];
      const f1 = frames[idx + 1];
      const span = Math.max(0.0001, f1.t - f0.t);
      const alpha = Math.min(1, Math.max(0, (runTimeSeconds - f0.t) / span));

      ghost.mesh.position.set(
        f0.x + (f1.x - f0.x) * alpha,
        f0.y + (f1.y - f0.y) * alpha,
        f0.z + (f1.z - f0.z) * alpha
      );
      ghost.mesh.rotation.y = (f0.yaw || 0) + ((f1.yaw || 0) - (f0.yaw || 0)) * alpha;
    }
  }

  clear() {
    for (const g of this.ghosts) {
      this.scene.remove(g.mesh);
      if (g.material) g.material.dispose();
    }
    this.ghosts = [];
  }
}
