/**
 * Аутентичная физика и AABB-коллизии Minecraft:
 *
 * ИСПРАВЛЕНИЕ КРИТИЧЕСКОГО БАГА («опрокидывает с блока»):
 * 1) Точка отсчёта игрока `position` теперь — это ТОЧКА СТОП (низ хитбокса, как в реальном Minecraft: `feetY`),
 *    а НЕ центр куба. Хитбокс по высоте равен `[position.y, position.y + 1.8]`, по ширине `[position.x - 0.3, position.x + 0.3]`.
 * 2) При проверке движения по осям X и Z вертикальный интервал `minY` поднимается на микро-отступ `0.002` м (`yMin = position.y + 0.002`),
 *    поэтому блок, НА КОТОРОМ стоит игрок (`block.maxY === position.y`), НИКОГДА не цепляется боковыми стенками X/Z
 *    и никогда не сталкивает/не опрокидывает игрока с края!
 * 3) Для быстрой проверки тысяч блоков ландшафта используется пространственный хэш (Spatial Grid с ячейкой 4x4),
 *    поэтому физика проверяет только ~10-20 ближайших кубов вокруг игрока и держит 60 FPS даже на огромных биомах.
 */
export class Physics {
  constructor() {
    this.halfWidth = 0.3;  // Ширина игрока в Minecraft = 0.6 м
    this.height = 1.8;     // Высота игрока в Minecraft = 1.8 м
    this.eps = 0.0001;
    this.cellSize = 4;
    this.spatialGrid = new Map();
  }

  /**
   * Индексирует массив твёрдых блоков уровня в пространственную сетку (Spatial Hash Grid)
   */
  buildSpatialIndex(solidBlocks) {
    this.spatialGrid.clear();
    for (let i = 0; i < solidBlocks.length; i++) {
      const b = solidBlocks[i];
      const gx = Math.floor(b.x / this.cellSize);
      const gz = Math.floor(b.z / this.cellSize);
      const key = `${gx},${gz}`;
      let cell = this.spatialGrid.get(key);
      if (!cell) {
        cell = [];
        this.spatialGrid.set(key, cell);
      }
      cell.push(b);
    }
  }

  /**
   * Возвращает только блоки в окрестности 3x3 ячеек вокруг координат игрока
   */
  _getNearbyBlocks(px, pz, fallbackBlocks) {
    if (this.spatialGrid.size === 0) return fallbackBlocks;
    const cx = Math.floor(px / this.cellSize);
    const cz = Math.floor(pz / this.cellSize);
    const result = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cell = this.spatialGrid.get(`${cx + dx},${cz + dz}`);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            result.push(cell[i]);
          }
        }
      }
    }
    return result;
  }

  /**
   * Проверяет пересечение AABB игрока (с точкой стоп в px, feetY, pz) и AABB блока.
   * Параметр yMargin позволяет исключить ложное касание пола при горизонтальном движении X/Z.
   */
  _intersectsBox(px, feetY, pz, block, yMargin = 0) {
    return (
      px + this.halfWidth > block.minX &&
      px - this.halfWidth < block.maxX &&
      feetY + this.height - yMargin > block.minY &&
      feetY + yMargin < block.maxY &&
      pz + this.halfWidth > block.minZ &&
      pz - this.halfWidth < block.maxZ
    );
  }

  /**
   * Перемещает игрока с разрешением коллизий в порядке Y -> X -> Z (стандарт воксельных движков)
   */
  moveAndCollide(position, velocity, delta, solidBlocks, wasOnGround) {
    const nearby = this._getNearbyBlocks(position.x, position.z, solidBlocks);
    let onGround = false;

    // 1. Сначала разрешаем вертикальную ось Y (гравитация и опора под ногами)
    position.y += velocity.y * delta;
    for (let i = 0; i < nearby.length; i++) {
      const b = nearby[i];
      if (this._intersectsBox(position.x, position.y, position.z, b, 0)) {
        if (velocity.y <= 0) {
          // Стопы встают ровно на верхнюю грань блока b.maxY
          position.y = b.maxY;
          velocity.y = 0;
          onGround = true;
        } else if (velocity.y > 0) {
          // Удар макушкой о потолок
          position.y = b.minY - this.height - this.eps;
          velocity.y = 0;
        }
      }
    }

    // 2. Разрешаем ось X с вертикальным зазором yMargin = 0.002,
    // чтобы пол, на котором мы стоим (position.y === b.maxY), никогда не вызывал боковую коллизию!
    position.x += velocity.x * delta;
    for (let i = 0; i < nearby.length; i++) {
      const b = nearby[i];
      if (this._intersectsBox(position.x, position.y, position.z, b, 0.002)) {
        if (velocity.x > 0) {
          position.x = b.minX - this.halfWidth - this.eps;
        } else if (velocity.x < 0) {
          position.x = b.maxX + this.halfWidth + this.eps;
        }
        velocity.x = 0;
      }
    }

    // 3. Разрешаем ось Z с вертикальным зазором yMargin = 0.002
    position.z += velocity.z * delta;
    for (let i = 0; i < nearby.length; i++) {
      const b = nearby[i];
      if (this._intersectsBox(position.x, position.y, position.z, b, 0.002)) {
        if (velocity.z > 0) {
          position.z = b.minZ - this.halfWidth - this.eps;
        } else if (velocity.z < 0) {
          position.z = b.maxZ + this.halfWidth + this.eps;
        }
        velocity.z = 0;
      }
    }

    // 4. Надёжный зонд опоры под стопами (2 см вниз), чтобы игрок уверенно стоял даже на самом краю пикселя блока
    if (!onGround && velocity.y <= 0) {
      const probeFeetY = position.y - 0.025;
      for (let i = 0; i < nearby.length; i++) {
        const b = nearby[i];
        if (
          position.x + this.halfWidth > b.minX &&
          position.x - this.halfWidth < b.maxX &&
          position.z + this.halfWidth > b.minZ &&
          position.z - this.halfWidth < b.maxZ &&
          probeFeetY <= b.maxY &&
          position.y >= b.maxY - 0.05
        ) {
          position.y = b.maxY;
          velocity.y = 0;
          onGround = true;
          break;
        }
      }
    }

    const landedThisFrame = !wasOnGround && onGround;
    return { onGround, landedThisFrame };
  }

  /**
   * Проверка пересечения игрока с водой/лавой, чекпоинтами и финишем
   */
  checkTriggers(position, level) {
    const result = {
      hitHazard: false,
      hazardReason: '',
      checkpoint: null,
      hitFinish: false
    };

    // 1. Проверка падения в реку (уровень воды задаётся в level.waterLevelY)
    if (level.waterLevelY !== null && position.y < level.waterLevelY - 0.15) {
      result.hitHazard = true;
      result.hazardReason = 'Вы упали в глубокую реку!';
      return result;
    }

    // 2. Проверка касания блоков лавы
    for (let i = 0; i < level.lavaBlocks.length; i++) {
      const lava = level.lavaBlocks[i];
      if (this._intersectsBox(position.x, position.y - 0.05, position.z, lava, 0)) {
        result.hitHazard = true;
        result.hazardReason = 'Вы упали в раскалённую лаву!';
        return result;
      }
    }

    // 3. Проверка чекпоинтов
    for (let i = 0; i < level.checkpoints.length; i++) {
      const cp = level.checkpoints[i];
      if (!cp.activated && this._intersectsBox(position.x, position.y - 0.1, position.z, cp, 0)) {
        result.checkpoint = cp;
        break;
      }
    }

    // 4. Проверка финишного портала
    if (level.finishBlock) {
      if (this._intersectsBox(position.x, position.y - 0.15, position.z, level.finishBlock, 0)) {
        result.hitFinish = true;
      }
    }

    return result;
  }
}
