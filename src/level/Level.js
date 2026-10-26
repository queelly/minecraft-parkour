import * as THREE from 'three';

/**
 * Загрузчик и рендерер воксельного мира:
 * - Использует `THREE.InstancedMesh` для пакетной отрисовки тысяч блоков берегов, холмов, деревьев и грибов за считанные draw calls (стабильные 60 FPS!).
 * - Создаёт шейдерную зеркальную поверхность реки (`waterPlane`), отражающую небо и солнце, как на референсе 1 и 2.
 * - Формирует точные AABB только для коллизионных блоков (`collidable !== false`) и передаёт их в пространственный индекс `Physics.buildSpatialIndex()`.
 * - Добавляет объёмные парящие воксельные облака в небе.
 */
export class Level {
  constructor(scene, materials, physics) {
    this.scene = scene;
    this.materials = materials;
    this.physics = physics;

    this.sharedBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.checkpointGeometry = new THREE.BoxGeometry(0.75, 0.75, 0.75);

    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);

    this.solidBlocks = [];
    this.lavaBlocks = [];
    this.checkpoints = [];
    this.finishBlock = null;
    this.finishParticles = null;
    this.waterMesh = null;
    this.waterLevelY = -0.25;
    this.cloudsGroup = null;

    this.startPosition = new THREE.Vector3(0, 1.0, 0);
    this.waypoints = [];
  }

  /**
   * Загружает уровень, группируя статические блоки по типу материала в InstancedMesh
   */
  load(levelData) {
    this.clear();

    this.waterLevelY = levelData.waterLevelY !== undefined ? levelData.waterLevelY : -0.25;
    this.startPosition.set(
      levelData.start.x,
      levelData.start.y,
      levelData.start.z
    );

    this.waypoints.push(this.startPosition.clone());

    // 1. Создаём шейдерную реку на всю длину каньона
    if (this.waterLevelY !== null) {
      const waterGeo = new THREE.PlaneGeometry(140, 220, 48, 96);
      waterGeo.rotateX(-Math.PI / 2);
      this.waterMesh = new THREE.Mesh(waterGeo, this.materials.waterMaterial);
      this.waterMesh.position.set(0, this.waterLevelY, -55);
      this.waterMesh.receiveShadow = true;
      this.levelGroup.add(this.waterMesh);
    }

    // 2. Создаём объёмные воксельные облака высоко в небе
    this._createVoxelClouds();

    // 3. Группируем блоки по типу для пакетного рендеринга через InstancedMesh
    const batches = new Map();
    const dummy = new THREE.Object3D();

    for (let i = 0; i < levelData.blocks.length; i++) {
      const block = levelData.blocks[i];
      const { x, y, z, type } = block;

      const aabb = {
        x,
        y,
        z,
        type,
        minX: x - 0.5,
        maxX: x + 0.5,
        minY: y - 0.5,
        maxY: y + 0.5,
        minZ: z - 0.5,
        maxZ: z + 0.5
      };

      if (type === 'checkpoint') {
        const mesh = new THREE.Mesh(
          this.checkpointGeometry,
          this.materials.getMaterial('checkpoint')
        );
        mesh.position.set(x, y + 0.1, z);
        this.levelGroup.add(mesh);

        // Оценка точки респавна: стопы ровно на блоке под чекпоинтом (y - 0.5)
        const spawnFeetY = y - 0.5;
        this.checkpoints.push({
          ...aabb,
          index: block.checkpointIndex || 1,
          activated: false,
          mesh,
          spawnPos: new THREE.Vector3(x, spawnFeetY, z)
        });
        this.waypoints.push(new THREE.Vector3(x, spawnFeetY, z));
      } else if (type === 'finish') {
        const mesh = new THREE.Mesh(
          this.sharedBoxGeometry,
          this.materials.getMaterial('finish')
        );
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.levelGroup.add(mesh);

        this.finishBlock = {
          ...aabb,
          mesh
        };
        this.waypoints.push(new THREE.Vector3(x, y - 0.5, z));
        this._createFinishParticles(x, y + 0.6, z);
      } else if (type === 'lava') {
        if (!batches.has('lava')) batches.set('lava', []);
        batches.get('lava').push(block);
        this.lavaBlocks.push({ ...aabb, maxY: y + 0.42 });
      } else {
        if (!batches.has(type)) batches.set(type, []);
        batches.get(type).push(block);

        // В физический индекс добавляем блоки, с которыми игрок может столкнуться
        if (block.collidable !== false) {
          this.solidBlocks.push(aabb);
        }

        if (block.isRoute) {
          this.waypoints.push(new THREE.Vector3(x, y + 0.5, z));
        }
      }
    }

    // 4. Строим InstancedMesh для каждого типа блоков (1 Draw Call на целый тип материала!)
    for (const [type, list] of batches.entries()) {
      if (list.length === 0) continue;
      const mat = this.materials.getMaterial(type);
      const instanced = new THREE.InstancedMesh(this.sharedBoxGeometry, mat, list.length);
      instanced.castShadow = type !== 'waterfall';
      instanced.receiveShadow = true;

      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        dummy.position.set(b.x, b.y, b.z);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      this.levelGroup.add(instanced);
    }

    // 5. Индексируем коллизионные блоки в Spatial Hash Grid
    if (this.physics) {
      this.physics.buildSpatialIndex(this.solidBlocks);
    }

    this.waypoints.sort((a, b) => b.z - a.z);
  }

  _createVoxelClouds() {
    this.cloudsGroup = new THREE.Group();
    const cloudGeo = new THREE.BoxGeometry(8, 1.2, 5);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78
    });

    const cloudCoords = [
      [-18, 28, -20],
      [16, 30, -35],
      [-12, 29, -58],
      [20, 31, -75],
      [-6, 32, -95]
    ];
    for (const [cx, cy, cz] of cloudCoords) {
      const m = new THREE.Mesh(cloudGeo, cloudMat);
      m.position.set(cx, cy, cz);
      this.cloudsGroup.add(m);
    }
    this.levelGroup.add(this.cloudsGroup);
  }

  _createFinishParticles(fx, fy, fz) {
    const count = 56;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = fx + (Math.random() - 0.5) * 1.6;
      positions[i * 3 + 1] = fy + Math.random() * 3.0;
      positions[i * 3 + 2] = fz + (Math.random() - 0.5) * 1.6;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffe066,
      size: 0.18,
      transparent: true,
      opacity: 0.95
    });

    this.finishParticles = new THREE.Points(geo, mat);
    this.finishParticles.userData = { baseY: fy };
    this.levelGroup.add(this.finishParticles);
  }

  activateCheckpoint(cp) {
    if (cp.activated) return false;
    cp.activated = true;
    if (cp.mesh) {
      cp.mesh.material = this.materials.checkpointActiveMaterial;
    }
    return true;
  }

  resetCheckpoints() {
    for (const cp of this.checkpoints) {
      cp.activated = false;
      if (cp.mesh) {
        cp.mesh.material = this.materials.checkpointMaterial;
      }
    }
  }

  update(delta, elapsedTime) {
    for (const cp of this.checkpoints) {
      if (cp.mesh) {
        cp.mesh.rotation.y += delta * 2.0;
        cp.mesh.position.y = cp.y + 0.15 + Math.sin(elapsedTime * 3.5) * 0.1;
      }
    }

    if (this.cloudsGroup) {
      for (const cloud of this.cloudsGroup.children) {
        cloud.position.x += delta * 0.45;
        if (cloud.position.x > 35) cloud.position.x = -35;
      }
    }

    if (this.finishParticles) {
      const posAttr = this.finishParticles.geometry.attributes.position;
      const baseY = this.finishParticles.userData.baseY;
      for (let i = 0; i < posAttr.count; i++) {
        let py = posAttr.getY(i) + delta * 1.25;
        if (py > baseY + 3.0) py = baseY;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;
    }
  }

  clear() {
    while (this.levelGroup.children.length > 0) {
      const child = this.levelGroup.children[0];
      if (child.isPoints && child.geometry) {
        child.geometry.dispose();
        child.material.dispose();
      } else if (child.isInstancedMesh) {
        child.dispose();
      }
      this.levelGroup.remove(child);
    }
    this.solidBlocks = [];
    this.lavaBlocks = [];
    this.checkpoints = [];
    this.finishBlock = null;
    this.finishParticles = null;
    this.waterMesh = null;
    this.cloudsGroup = null;
    this.waypoints = [];
  }
}
