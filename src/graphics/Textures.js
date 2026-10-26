import * as THREE from 'three';

/**
 * Процедурный 16x16 / 32x32 генератор каноничных пиксельных текстур Minecraft (Faithful / BSL Shader Pack style)
 * + новые блоки с 5 референсов пользователя:
 * - Изумрудный блок (Emerald Block — скошенная 3D-грань, реф 3)
 * - Золотой блок (Gold Block — блестящий слиток с фаской, реф 4)
 * - Светокамень (Glowstone — золотая светящаяся мозаика, реф 4)
 * - Жёлтая и Красная шерсть / терракота (Yellow/Red Wool — паркур-блоки на полу, реф 2, 4, 5)
 * - Каменные кирпичи (Stone Bricks — стены коридоров и колоннад, реф 5)
 * - Берёзовые и Акациевые доски (Birch / Acacia Planks, реф 1, 4, 5)
 * - Сноп сена (Hay Bale — жёлтый блок с красными ремешками, реф 1)
 * - Призмарин и Бамбук (Prismarine & Bamboo, реф 2, 3)
 */

function createPRNG(seed = 1337) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function configurePixelTexture(canvas, repeat = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.needsUpdate = true;
  return texture;
}

/**
 * Рисует тонкую пиксельную 3D-фаску по краям блока, чтобы каждый воксель в мире читался объёмно!
 */
function drawVoxelBevel(ctx, size, lightAlpha = 0.14, darkAlpha = 0.2) {
  ctx.fillStyle = `rgba(255, 255, 255, ${lightAlpha})`;
  ctx.fillRect(0, 0, size, 1);
  ctx.fillRect(0, 0, 1, size);

  ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
  ctx.fillRect(0, size - 1, size, 1);
  ctx.fillRect(size - 1, 0, 1, size);
}

/**
 * 1. Верх травяного блока (сочный лаймово-изумрудный газон как в шейдерах реф 3 и 5)
 */
export function createGrassTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(101);

  const palette = ['#56b030', '#4ca027', '#62be3a', '#439120', '#6dca44'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.1, 0.15);
  return configurePixelTexture(canvas);
}

/**
 * 2. Бок травяного блока (земля + зелёная шапка дёрна)
 */
export function createGrassSideTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(202);

  const dirtPalette = ['#86593b', '#754c31', '#946546', '#654028'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = dirtPalette[Math.floor(rand() * dirtPalette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const grassPalette = ['#56b030', '#4ca027', '#62be3a', '#439120'];
  for (let x = 0; x < size; x++) {
    const depth = 3 + Math.floor(rand() * 3);
    for (let y = 0; y < depth; y++) {
      ctx.fillStyle = grassPalette[Math.floor(rand() * grassPalette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = '#4a2e1b';
    ctx.fillRect(x, depth, 1, 1);
  }
  drawVoxelBevel(ctx, size, 0.1, 0.18);
  return configurePixelTexture(canvas);
}

/**
 * 3. Земля / Тропинка (Dirt / Grass Path)
 */
export function createDirtTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(250);

  const dirtPalette = ['#86593b', '#754c31', '#946546', '#654028'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = dirtPalette[Math.floor(rand() * dirtPalette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.08, 0.18);
  return configurePixelTexture(canvas);
}

/**
 * 4. Оранжевые доски акации (Acacia Planks — реф 1)
 */
export function createPlanksTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(310);

  const shades = ['#d97224', '#c96418', '#e58031', '#ba5810'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = shades[Math.floor(rand() * shades.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const rowH = size / 4;
  for (let r = 0; r < 4; r++) {
    const sy = r * rowH;
    ctx.fillStyle = '#873b06';
    ctx.fillRect(0, sy, size, 1);
    ctx.fillStyle = '#f29549';
    ctx.fillRect(0, sy + 1, size, 1);
    const jx = (r * 5 + 3) % (size - 2) + 1;
    ctx.fillStyle = '#873b06';
    ctx.fillRect(jx, sy, 1, rowH);
  }
  drawVoxelBevel(ctx, size, 0.12, 0.18);
  return configurePixelTexture(canvas);
}

/**
 * 5. Светлые берёзовые доски (Birch Planks — пол и заборы на реф 4 и 5)
 */
export function createBirchPlanksTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(315);

  const shades = ['#d7c185', '#ceb677', '#e0cb92', '#c4ab6c'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = shades[Math.floor(rand() * shades.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const rowH = size / 4;
  for (let r = 0; r < 4; r++) {
    const sy = r * rowH;
    ctx.fillStyle = '#9c844c';
    ctx.fillRect(0, sy, size, 1);
    ctx.fillStyle = '#ebd9a7';
    ctx.fillRect(0, sy + 1, size, 1);
    const jx = (r * 7 + 4) % (size - 2) + 1;
    ctx.fillStyle = '#9c844c';
    ctx.fillRect(jx, sy, 1, rowH);
  }
  drawVoxelBevel(ctx, size, 0.14, 0.16);
  return configurePixelTexture(canvas);
}

/**
 * 6. Каменные кирпичи (Stone Bricks — колонны и бордюры аллеи из реф 5!)
 */
export function createStoneBricksTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(420);

  const grays = ['#7d8085', '#717478', '#898c91', '#686b70'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = grays[Math.floor(rand() * grays.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Кладка из крупных каменных кирпичей со светотенью
  ctx.fillStyle = '#494b4f';
  ctx.fillRect(0, 0, size, 1);
  ctx.fillRect(0, 8, size, 1);
  ctx.fillRect(0, 0, 1, 8);
  ctx.fillRect(8, 8, 1, 8);

  ctx.fillStyle = '#9ea2a8';
  ctx.fillRect(1, 1, size - 2, 1);
  ctx.fillRect(1, 9, size - 2, 1);

  return configurePixelTexture(canvas);
}

/**
 * 7. Гладкий камень / Булыжник скал (Stone)
 */
export function createStoneTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(404);

  const stoneColors = ['#7c7f85', '#6e7176', '#8a8d94', '#63666b'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = stoneColors[Math.floor(rand() * stoneColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.1, 0.18);
  return configurePixelTexture(canvas);
}

/**
 * 8. Изумрудный блок с гранёной 3D-рамкой (Emerald Block — точно как на реф 3!)
 */
export function createEmeraldBlockTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, size, size);

  // Внешняя светлая/тёмная грань
  ctx.fillStyle = '#6ee7b7';
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 0, 2, size);
  ctx.fillStyle = '#047857';
  ctx.fillRect(0, size - 2, size, 2);
  ctx.fillRect(size - 2, 0, 2, size);

  // Внутренний квадрат кристалла
  ctx.fillStyle = '#34d399';
  ctx.fillRect(3, 3, size - 6, size - 6);
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 1;
  ctx.strokeRect(3.5, 3.5, size - 7, size - 7);

  ctx.fillStyle = '#a7f3d0';
  ctx.fillRect(5, 5, 3, 3);

  return configurePixelTexture(canvas);
}

/**
 * 9. Золотой блок с металлическим отливом (Gold Block — точно как на реф 4!)
 */
export function createGoldBlockTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 0, 2, size);

  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, size - 2, size, 2);
  ctx.fillRect(size - 2, 0, 2, size);

  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(3, 3, size - 6, size - 6);

  // Диагональный золотой блик
  ctx.fillStyle = '#fef9c3';
  for (let i = 4; i < size - 5; i++) {
    ctx.fillRect(i, size - 1 - i, 2, 1);
  }

  return configurePixelTexture(canvas);
}

/**
 * 10. Светокамень (Glowstone — золотистая светящаяся мозаика на полу из реф 4!)
 */
export function createGlowstoneTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(999);

  ctx.fillStyle = '#92400e';
  ctx.fillRect(0, 0, size, size);

  const glowColors = ['#fde047', '#facc15', '#fef9c3', '#d97706', '#b45309'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = glowColors[Math.floor(rand() * glowColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.18, 0.22);
  return configurePixelTexture(canvas);
}

/**
 * 11. Жёлтый бетон / шерсть (Yellow Wool — стартовые крестовые платформы из реф 5!)
 */
export function createYellowWoolTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(512);

  const yellows = ['#eab308', '#ca8a04', '#facc15', '#d99b06'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = yellows[Math.floor(rand() * yellows.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.14, 0.16);
  return configurePixelTexture(canvas);
}

/**
 * 12. Красная шерсть / ковёр (Red Wool — яркие дорожки из реф 4!)
 */
export function createRedWoolTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(518);

  const reds = ['#dc2626', '#b91c1c', '#ef4444', '#991b1b'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = reds[Math.floor(rand() * reds.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.14, 0.18);
  return configurePixelTexture(canvas);
}

/**
 * 13. Оранжевая терракота и Песок (Меса-каньон из реф 2!)
 */
export function createOrangeTerracottaTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(530);

  const oranges = ['#ea580c', '#c2410c', '#f97316', '#9a3412'];
  for (let y = 0; y < size; y++) {
    const rowShade = oranges[(y + Math.floor(rand() * 2)) % oranges.length];
    ctx.fillStyle = rowShade;
    ctx.fillRect(0, y, size, 1);
  }
  drawVoxelBevel(ctx, size, 0.12, 0.18);
  return configurePixelTexture(canvas);
}

export function createSandTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(505);

  const sandPalette = ['#fde68a', '#fcd34d', '#fef3c7', '#f59e0b'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = sandPalette[Math.floor(rand() * sandPalette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.14, 0.14);
  return configurePixelTexture(canvas);
}

/**
 * 14. Сноп сена с красными ремешками (Hay Bale — пшеничное поле из реф 1!)
 */
export function createHayBaleTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(600);

  const wheat = ['#d97706', '#eab308', '#ca8a04', '#b45309'];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      ctx.fillStyle = wheat[Math.floor(rand() * wheat.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Два красных стягивающих ремешка
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 4, size, 2);
  ctx.fillRect(0, 11, size, 2);
  drawVoxelBevel(ctx, size, 0.12, 0.18);
  return configurePixelTexture(canvas);
}

/**
 * 15. Бирюзовый Призмарин (Prismarine — нижняя порода парящих островов из реф 3!)
 */
export function createPrismarineTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(640);

  const teals = ['#0d9488', '#14b8a6', '#0f766e', '#2dd4bf'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = teals[Math.floor(rand() * teals.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.14, 0.18);
  return configurePixelTexture(canvas);
}

/**
 * 16. Зелёный стебель бамбука (Bamboo — реф 2)
 */
export function createBambooTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#65a30d';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#84cc16';
  ctx.fillRect(2, 0, 4, size);
  // Междоузлия бамбука
  ctx.fillStyle = '#3f6212';
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 8, size, 2);
  return configurePixelTexture(canvas);
}

/**
 * 17. Кора дуба, берёзы и пышная листва с цветами (реф 3 и 5)
 */
export function createOakLogTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(606);

  const bark = ['#5c4028', '#4a321e', '#6e4e32', '#3d2816'];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      ctx.fillStyle = bark[(x + Math.floor(rand() * 2)) % bark.length];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.08, 0.2);
  return configurePixelTexture(canvas);
}

export function createBirchLogTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(707);

  ctx.fillStyle = '#e5e2dc';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#2b2a29';
    ctx.fillRect(Math.floor(rand() * (size - 4)), Math.floor(rand() * size), 3, 1);
  }
  drawVoxelBevel(ctx, size, 0.12, 0.16);
  return configurePixelTexture(canvas);
}

export function createLeavesTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(808);

  const leafShades = ['#2b7a18', '#3c9624', '#1e5c0f', '#4eb032', '#31851c'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = leafShades[Math.floor(rand() * leafShades.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Яркие цветочки на цветущей азалии/листве (как на стенах коридора в реф 5!)
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(3, 4, 2, 2);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(11, 10, 2, 2);
  drawVoxelBevel(ctx, size, 0.1, 0.2);
  return configurePixelTexture(canvas);
}

export function createIceTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(1001);

  const icePalette = ['#60a5fa', '#3b82f6', '#93c5fd', '#2563eb'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = icePalette[Math.floor(rand() * icePalette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawVoxelBevel(ctx, size, 0.2, 0.15);
  return configurePixelTexture(canvas);
}

export function createCheckpointTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#059669';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(5, 5, size - 10, size - 10);
  return configurePixelTexture(canvas);
}

export function createFinishTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const tile = size / 4;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#fde047' : '#9333ea';
      ctx.fillRect(c * tile, r * tile, tile, tile);
    }
  }
  return configurePixelTexture(canvas);
}

export function createLavaTexture(size = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(404);

  const spots = ['#ea580c', '#f97316', '#facc15', '#dc2626'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = spots[Math.floor(rand() * spots.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return configurePixelTexture(canvas, true);
}

/**
 * 18. Чистое лазурное небо с мягкими перистыми облаками (4K 60FPS Skybox из реф 2, 3, 4)
 */
export function createSkyPanoramaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rand = createPRNG(888);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0.0, '#0284c7');
  skyGrad.addColorStop(0.32, '#0ea5e9');
  skyGrad.addColorStop(0.55, '#38bdf8');
  skyGrad.addColorStop(0.78, '#bae6fd');
  skyGrad.addColorStop(1.0, '#e0f2fe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Мягкие белоснежные облака
  for (let i = 0; i < 45; i++) {
    const cx = rand() * canvas.width;
    const cy = 60 + rand() * 180;
    const rw = 45 + rand() * 90;
    const rh = 14 + rand() * 26;

    const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rw);
    cg.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    cg.addColorStop(0.55, 'rgba(240, 249, 255, 0.48)');
    cg.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 19. Иллюстрированные превью для карточек 4 новых огромных карт в меню
 */
export function generateBiomeThumbnailDataURL(biomeType = 'garden') {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (biomeType === 'garden') {
    // Реф 5: TikTok Садовая Аллея с каменными бордюрами и жёлтыми крестовыми блоками
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, 160, 90);
    // Зелёные живые изгороди по бокам
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 36, 90);
    ctx.fillRect(124, 0, 36, 90);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(12, 18, 6, 6);
    ctx.fillRect(138, 24, 6, 6);
    // Каменные бордюры и зелёный газон-пол
    ctx.fillStyle = '#64748b';
    ctx.fillRect(28, 38, 14, 52);
    ctx.fillRect(118, 38, 14, 52);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(42, 42, 76, 48);
    // Жёлтые паркур-платформы по центру
    ctx.fillStyle = '#eab308';
    ctx.fillRect(54, 62, 52, 18);
    ctx.fillRect(62, 44, 36, 12);
  } else if (biomeType === 'gold_mesa') {
    // Реф 2 + 4: Золотая Цитадель & Бамбуковый Каньон
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, 160, 90);
    // Каменный свод сверху
    ctx.fillStyle = '#57534e';
    ctx.fillRect(0, 0, 95, 24);
    // Золотые стены и светокамень
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(92, 18, 68, 72);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(0, 56, 95, 34);
    // Красный ковёр и бамбук
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(52, 62, 70, 28);
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(18, 16, 6, 56);
    ctx.fillRect(32, 22, 6, 50);
  } else if (biomeType === 'emerald_sky') {
    // Реф 3: Изумрудные Небесные Острова 4K
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 160, 90);
    // Острова с призмарином и елками
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(14, 48, 48, 26);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(12, 42, 52, 8);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(26, 10, 22, 32);
    // Изумрудные блоки на переднем плане
    ctx.fillStyle = '#10b981';
    ctx.fillRect(76, 48, 72, 42);
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 3;
    ctx.strokeRect(78, 50, 68, 38);
  } else {
    // Реф 1: Пшеничная Пещера и Висящие Брёвна
    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 0, 160, 32);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(25, 48, 110, 42);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(62, 0, 10, 52);
    ctx.fillRect(104, 0, 10, 44);
    ctx.fillRect(44, 42, 52, 14);
  }

  return canvas.toDataURL('image/png');
}
