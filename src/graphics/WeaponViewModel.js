import * as THREE from 'three';

/**
 * ════════════════════════════════════════════════════════════════════════
 * АРСЕНАЛ КАСТОМНЫХ 3D-НОЖЕЙ И МЕЧЕЙ С АНИМАЦИЯМИ ОСМОТРА (CS2 × MINECRAFT)
 * ════════════════════════════════════════════════════════════════════════
 * Решает две ключевые задачи:
 * 1) Полностью исправляет баг «полупрозрачной руки» — модели оружия рендерятся
 *    с собственным глубинным буфером и направленным освещением поверх мира без просвечивания граней!
 * 2) Добавляет 5 культовых ножей/клинков с процедурными 3D-геометриями и плавными анимациями:
 *    - Кунай «Кровавая Паутина» (Kunai Crimson — стартовый нож с кольцом на пальце)
 *    - Керамбит «Сапфировый Градиент» (Karambit Doppler — изогнутый коготь с вращением на 360° вокруг пальца!)
 *    - Нож-Бабочка «Золотой Зуб Тигра» (Butterfly Lore — раскладные двойные рукояти, крутящиеся при флипе!)
 *    - Штык-нож «М9 Изумрудный Гамма» (M9 Bayonet Emerald — массивный зазубренный клинок с подбросом)
 *    - Алмазная Катана «Неоновый Дракон» (Diamond Katana — премиум клинок за изумруды или Rewarded-рекламу)
 */

export const WEAPON_SKINS = [
  {
    id: 'kunai_crimson',
    name: 'Кунай «Кровавый Рубин»',
    rarity: 'Базовый клинок',
    price: 0,
    color: '#ef4444',
    accent: '#991b1b',
    handleColor: '#1f2937',
    type: 'kunai'
  },
  {
    id: 'karambit_fade',
    name: 'Керамбит «Градиент»',
    rarity: 'Тайное • Вращение 360°',
    price: 50,
    color: '#ec4899',
    accent: '#8b5cf6',
    handleColor: '#111827',
    type: 'karambit'
  },
  {
    id: 'butterfly_gold',
    name: 'Бабочка «Золотой Тигр»',
    rarity: 'Тайное • Флип рукоятей',
    price: 100,
    color: '#f59e0b',
    accent: '#fde047',
    handleColor: '#451a03',
    type: 'butterfly'
  },
  {
    id: 'm9_emerald',
    name: 'Штык-нож M9 «Изумруд»',
    rarity: 'Гамма-Волны',
    price: 150,
    color: '#10b981',
    accent: '#6ee7b7',
    handleColor: '#064e3b',
    type: 'm9'
  },
  {
    id: 'katana_diamond',
    name: 'Алмазная Катана «Кибер»',
    rarity: 'Древнее • VIP Донат',
    price: 250,
    isRewardedUnlock: true,
    color: '#06b6d4',
    accent: '#a5f3fc',
    handleColor: '#311042',
    type: 'katana'
  }
];

export class WeaponViewModel {
  constructor() {
    // Отдельная сцена и камера для 3D-оружия в руках, которая рисуется поверх основного мира
    // с очищенным буфером глубины (renderer.clearDepth()). Это на 100% исключает как проваливание ножа в стены,
    // так и артефакты прозрачности между деталями самой руки и лезвия!
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 10);

    // Собственный студийный свет для красивых бликов на металлическом лезвии ножей
    const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    keyLight.position.set(1.5, 2.5, 2.0);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-2.0, 1.0, -1.0);
    this.scene.add(rimLight);

    this.rootGroup = new THREE.Group();
    // Базовая позиция правой руки и ножа в кадре (правый нижний угол как в CS2 / Valorant)
    this.basePos = new THREE.Vector3(0.36, -0.32, -0.62);
    this.rootGroup.position.copy(this.basePos);
    this.scene.add(this.rootGroup);

    this.weaponPivot = new THREE.Group();
    this.rootGroup.add(this.weaponPivot);

    // Детали для процедурной анимации бабочки/керамбита
    this.handleLeft = null;
    this.handleRight = null;
    this.bladeGroup = null;

    this.currentSkinId = 'kunai_crimson';
    this.inspectTimer = 0;     // Таймер анимации осмотра ножа (клавиша F)
    this.inspectDuration = 1.65;
    this.attackTimer = 0;      // Таймер взмаха/удара ножом (ЛКМ)
    this.attackDuration = 0.36;
    this.jumpImpulse = 0;
    this.walkCycle = 0;

    this.equipSkin(this.currentSkinId);
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Запускает крутую крутку/осмотр ножа на 360 градусов (клавиша F)
   */
  triggerInspect() {
    this.inspectTimer = this.inspectDuration;
  }

  /**
   * Запускает быстрый режущий взмах клинком (ЛКМ или при двойном прыжке)
   */
  triggerSlash() {
    if (this.attackTimer <= 0.05) {
      this.attackTimer = this.attackDuration;
      this.inspectTimer = 0; // Удар прерывает осмотр, как в CS
    }
  }

  triggerJumpImpulse() {
    this.jumpImpulse = 1.0;
    // При каждом прыжке нож делает лёгкий стильный подкрут!
    if (this.inspectTimer <= 0 && this.attackTimer <= 0) {
      this.inspectTimer = 0.55;
    }
  }

  /**
   * Строит детализированную воксельно-полигональную 3D-модель выбранного ножа + перчатку игрока
   */
  equipSkin(skinId) {
    const skin = WEAPON_SKINS.find((s) => s.id === skinId) || WEAPON_SKINS[0];
    this.currentSkinId = skin.id;

    while (this.weaponPivot.children.length > 0) {
      const ch = this.weaponPivot.children[0];
      this.weaponPivot.remove(ch);
    }
    this.handleLeft = null;
    this.handleRight = null;

    // 1. Спортивная тактическая перчатка и предплечье игрока (НЕПРОЗРАЧНАЯ, чёткая 3D-геометрия)
    const armGroup = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const cuffMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skin.color), roughness: 0.4, metalness: 0.3 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd49b72, roughness: 0.7 });

    // Предплечье
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.42), sleeveMat);
    forearm.position.set(0.08, -0.14, 0.24);
    forearm.rotation.set(-0.25, -0.18, 0);
    armGroup.add(forearm);

    // Цветной манжет перчатки в цвет скина ножа
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.06), cuffMat);
    cuff.position.set(0.04, -0.08, 0.04);
    cuff.rotation.set(-0.25, -0.18, 0);
    armGroup.add(cuff);

    // Кисть в тактической перчатке
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.14), gloveMat);
    palm.position.set(0.01, -0.05, -0.04);
    armGroup.add(palm);

    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.06), skinMat);
    fingers.position.set(-0.01, -0.04, -0.12);
    armGroup.add(fingers);

    this.weaponPivot.add(armGroup);

    // 2. Материалы клинка (высокий металлический блеск + неоновая режущая кромка)
    const bladeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skin.color),
      emissive: new THREE.Color(skin.color),
      emissiveIntensity: 0.22,
      roughness: 0.18,
      metalness: 0.78
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skin.accent),
      emissive: new THREE.Color(skin.accent),
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.9
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skin.handleColor),
      roughness: 0.6,
      metalness: 0.25
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.85
    });

    this.bladeGroup = new THREE.Group();
    this.bladeGroup.position.set(0, 0, -0.08);
    this.weaponPivot.add(this.bladeGroup);

    if (skin.type === 'karambit') {
      this._buildKarambit(this.bladeGroup, bladeMat, edgeMat, handleMat, ringMat);
    } else if (skin.type === 'butterfly') {
      this._buildButterfly(this.bladeGroup, bladeMat, edgeMat, handleMat);
    } else if (skin.type === 'm9') {
      this._buildM9Bayonet(this.bladeGroup, bladeMat, edgeMat, handleMat, ringMat);
    } else if (skin.type === 'katana') {
      this._buildKatana(this.bladeGroup, bladeMat, edgeMat, handleMat);
    } else {
      this._buildKunai(this.bladeGroup, bladeMat, edgeMat, handleMat, ringMat);
    }
  }

  /**
   * 1. Модель Куная (с кольцом у основания и ромбовидным лезвием)
   */
  _buildKunai(group, bladeMat, edgeMat, handleMat, ringMat) {
    // Кольцо для вращения на указательном пальце
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 8, 20), ringMat);
    ring.position.set(0, -0.12, 0);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);

    // Обмотанная рукоять
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8), handleMat);
    grip.position.set(0, -0.02, 0);
    group.add(grip);

    // Ступенчатое воксельное лезвие куная
    const bladeCore = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.28, 4), bladeMat);
    bladeCore.position.set(0, 0.18, 0);
    bladeCore.scale.set(0.45, 1.0, 1.0);
    group.add(bladeCore);

    const bladeEdge = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.29, 4), edgeMat);
    bladeEdge.position.set(0, 0.185, -0.004);
    bladeEdge.scale.set(0.22, 1.0, 1.02);
    group.add(bladeEdge);
  }

  /**
   * 2. Модель Керамбита (кольцо + анатомическая рукоять + серповидный коготь из сегментов)
   */
  _buildKarambit(group, bladeMat, edgeMat, handleMat, ringMat) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 8, 20), ringMat);
    ring.position.set(0, -0.11, 0.01);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);

    // Изогнутая рукоять с насечками под пальцы
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.048), handleMat);
      seg.position.set(0, -0.06 + i * 0.035, -i * 0.008);
      seg.rotation.x = i * 0.12;
      group.add(seg);
    }

    // Изогнутое лезвие-коготь керамбита
    const clawSegments = 7;
    for (let i = 0; i < clawSegments; i++) {
      const t = i / (clawSegments - 1);
      const w = 0.046 * (1 - t * 0.72);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.045, w), bladeMat);
      const angle = t * 1.15;
      seg.position.set(
        0,
        0.07 + Math.sin(angle) * 0.16,
        -0.02 - (1 - Math.cos(angle)) * 0.14
      );
      seg.rotation.x = angle;
      group.add(seg);

      const sharp = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.046, 0.012), edgeMat);
      sharp.position.copy(seg.position);
      sharp.position.z -= w * 0.48;
      sharp.rotation.copy(seg.rotation);
      group.add(sharp);
    }
  }

  /**
   * 3. Модель Ножа-Бабочки (Balisong — две вращающиеся рукояти + клинок)
   */
  _buildButterfly(group, bladeMat, edgeMat, handleMat) {
    // Центральное лезвие бабочки
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.25, 0.038), bladeMat);
    blade.position.set(0, 0.15, 0);
    group.add(blade);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.08, 4), edgeMat);
    tip.position.set(0, 0.31, 0);
    tip.scale.set(0.35, 1, 1);
    group.add(tip);

    const edgeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.25, 0.01), edgeMat);
    edgeStrip.position.set(0, 0.15, -0.02);
    group.add(edgeStrip);

    // Две шарнирные половинки рукояти бабочки, которые раскрываются веером при осмотре!
    this.handleLeft = new THREE.Group();
    this.handleLeft.position.set(0, 0.02, -0.014);
    const hlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.19, 0.022), handleMat);
    hlMesh.position.set(0, -0.095, 0);
    this.handleLeft.add(hlMesh);
    group.add(this.handleLeft);

    this.handleRight = new THREE.Group();
    this.handleRight.position.set(0, 0.02, 0.014);
    const hrMesh = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.19, 0.022), handleMat);
    hrMesh.position.set(0, -0.095, 0);
    this.handleRight.add(hrMesh);
    group.add(this.handleRight);
  }

  /**
   * 4. Модель Штык-ножа M9 Bayonet (с гардой, пилой на обухе и отверстием в клинке)
   */
  _buildM9Bayonet(group, bladeMat, edgeMat, handleMat, ringMat) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.16, 10), handleMat);
    grip.position.set(0, -0.04, 0);
    group.add(grip);

    // Массивная гарда с кольцом под ствол
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.018, 0.095), ringMat);
    guard.position.set(0, 0.045, 0);
    group.add(guard);

    // Широкое боевое лезвие
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.27, 0.056), bladeMat);
    blade.position.set(0, 0.185, 0);
    group.add(blade);

    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.28, 0.014), edgeMat);
    edge.position.set(0, 0.19, -0.028);
    group.add(edge);

    // Зазубрины пилы на обухе M9
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), edgeMat);
      tooth.position.set(0, 0.09 + i * 0.036, 0.03);
      tooth.rotation.x = Math.PI / 4;
      group.add(tooth);
    }
  }

  /**
   * 5. Модель Алмазной Катаны (длинный изогнутый клинок с гардой-цубой)
   */
  _buildKatana(group, bladeMat, edgeMat, handleMat) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.22, 0.034), handleMat);
    grip.position.set(0, -0.07, 0);
    group.add(grip);

    // Золотая гарда (Цуба)
    const tsuba = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.016, 0.075),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
    );
    tsuba.position.set(0, 0.045, 0);
    group.add(tsuba);

    // Длинное светящееся алмазное лезвие
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.44, 0.042), bladeMat);
    blade.position.set(0, 0.27, -0.005);
    blade.rotation.x = 0.04;
    group.add(blade);

    const neonEdge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.45, 0.012), edgeMat);
    neonEdge.position.set(0, 0.275, -0.026);
    neonEdge.rotation.x = 0.04;
    group.add(neonEdge);
  }

  /**
   * Плавное обновление положения и вращения ножа в каждом кадре
   */
  update(delta, horizontalSpeed, onGround, velocityY) {
    // 1. Цикл покачивания при беге (Sway & Bob)
    if (onGround && horizontalSpeed > 0.4) {
      this.walkCycle += delta * horizontalSpeed * 1.9;
    }

    this.jumpImpulse = Math.max(0, this.jumpImpulse - delta * 4.0);

    const bobX = Math.cos(this.walkCycle) * 0.022;
    const bobY = Math.abs(Math.sin(this.walkCycle * 2)) * 0.026;
    const airLagY = Math.max(-0.06, Math.min(0.06, -velocityY * 0.004));

    this.rootGroup.position.set(
      this.basePos.x + bobX,
      this.basePos.y - bobY + airLagY,
      this.basePos.z
    );

    // Базовый боевой наклон ножа
    let rotX = 0.22 - this.jumpImpulse * 0.35;
    let rotY = -0.32;
    let rotZ = -0.12;

    this.bladeGroup.rotation.set(0, 0, 0);
    if (this.handleLeft && this.handleRight) {
      this.handleLeft.rotation.x = 0;
      this.handleRight.rotation.x = 0;
    }

    // 2. Анимация удара ножом (ЛКМ)
    if (this.attackTimer > 0) {
      this.attackTimer = Math.max(0, this.attackTimer - delta);
      const p = 1.0 - this.attackTimer / this.attackDuration;
      const swing = Math.sin(p * Math.PI);

      this.rootGroup.position.x -= swing * 0.18;
      this.rootGroup.position.y += swing * 0.08;
      this.rootGroup.position.z -= swing * 0.16;

      rotX += swing * 0.95;
      rotY -= swing * 1.1;
      rotZ += swing * 0.65;
    }
    // 3. Анимация CS2-осмотра и вращения ножа на пальце (клавиша F или авто-флип в прыжке)
    else if (this.inspectTimer > 0) {
      this.inspectTimer = Math.max(0, this.inspectTimer - delta);
      const progress = 1.0 - this.inspectTimer / this.inspectDuration;
      const ease = Math.sin(progress * Math.PI);

      // Поднимаем нож ближе к центру экрана и делаем двойной спин 720 градусов вокруг кольца!
      this.rootGroup.position.x -= ease * 0.11;
      this.rootGroup.position.y += ease * 0.09;
      rotY += ease * 0.55;
      rotZ += ease * 0.35;

      const spinAngle = progress * Math.PI * 4.0;
      this.bladeGroup.rotation.x = spinAngle;

      // Если в руках нож-бабочка — её половинки рукояти эффектно порхают при крутке!
      if (this.handleLeft && this.handleRight) {
        this.handleLeft.rotation.x = Math.sin(progress * Math.PI * 6) * 1.3;
        this.handleRight.rotation.x = -Math.sin(progress * Math.PI * 6) * 1.3;
      }
    }

    this.weaponPivot.rotation.set(rotX, rotY, rotZ);
  }

  /**
   * Рендерит нож поверх основной сцены с очисткой буфера глубины (без артефактов прозрачности!)
   */
  render(renderer) {
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
  }
}

/**
 * Генерирует иконку ножа для оружейного магазина (DataURL)
 */
export function generateWeaponIconDataURL(skin) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const g = ctx.createRadialGradient(48, 32, 4, 48, 32, 46);
  g.addColorStop(0, skin.color + '55');
  g.addColorStop(1, '#090d16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 64);

  ctx.save();
  ctx.translate(48, 34);
  ctx.rotate(-0.55);

  // Кольцо керамбита/куная
  if (skin.type === 'karambit' || skin.type === 'kunai') {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-26, 2, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Рукоять
  ctx.fillStyle = skin.handleColor;
  ctx.fillRect(-20, -5, 22, 10);

  // Лезвие
  ctx.fillStyle = skin.color;
  if (skin.type === 'karambit') {
    ctx.beginPath();
    ctx.moveTo(2, -6);
    ctx.quadraticCurveTo(26, -16, 32, 14);
    ctx.quadraticCurveTo(14, 2, 2, 5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(2, -7);
    ctx.lineTo(36, 0);
    ctx.lineTo(2, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skin.accent;
    ctx.fillRect(2, -2, 28, 3);
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
}
