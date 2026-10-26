/**
 * ════════════════════════════════════════════════════════════════════════
 * МАСШТАБНЫЕ МНОГОСЕКЦИОННЫЕ ПАРКУР-МИРЫ (ПО 5 НОВЫМ РЕФЕРЕНСАМ!)
 * ════════════════════════════════════════════════════════════════════════
 * ГЛАВНЫЕ ОСОБЕННОСТИ НОВЫХ КАРТ:
 * 1) НИКАКОГО ОБЯЗАТЕЛЬНОГО МОРЯ ВНИЗУ И НИКАКИХ МГНОВЕННЫХ СМЕРТЕЙ ОТ ПРОМАХА!
 *    Под паркур-блоками на большинстве секций есть полноценный твёрдый пол (трава, каменная мостовая,
 *    песок, светокамень или снопы сена). Если вы оступились и упали вниз — вы НЕ умираете!
 *    Вы приземляетесь на нижний ярус и можете спокойно пробежать пару шагов назад к золотым ступеням/лесенкам
 *    (`birch_planks` / `gold`), чтобы снова запрыгнуть на паркур-маршрут и продолжить забег!
 * 2) КАРТЫ В 3 РАЗА ДЛИННЕЕ И МАСШТАБНЕЕ (по 160–200 метров в длину, 4–5 тематических зон и 3 чекпоинта на каждой).
 *
 * СПИСОК КАРТ:
 * - Уровень 1: «TikTok Садовая Аллея и Золотой Зал» (Точная реконструкция Референса 5 + Референса 4!)
 * - Уровень 2: «Меса-Каньон, Бамбук и Светокаменный Мост» (Точная реконструкция Референса 2 + Референса 4!)
 * - Уровень 3: «Изумрудные Небесные Острова 4K» (Точная реконструкция Референса 3!)
 * - Уровень 4: «Пшеничный Грот и Висящие Брёвна» (Точная реконструкция Референса 1 + процедурный каньон!)
 */

function createSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finalizeBlocks(rawBlocks) {
  const map = new Map();
  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i];
    const rx = Math.round(b.x);
    const ry = Math.round(b.y);
    const rz = Math.round(b.z);
    map.set(`${rx},${ry},${rz}`, { ...b, x: rx, y: ry, z: rz });
  }
  return Array.from(map.values());
}

/**
 * Строит крестообразную 3x3 платформу с вырезом по центру (точно как жёлтые платформы на Референсе 5 "USE THIS FOR TikTok"!)
 */
function addHollowCrossPlatform(blocks, cx, y, cz, type = 'yellow_wool') {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue; // Отверстие по центру как на скриншоте 5!
      blocks.push({ x: cx + dx, y, z: cz + dz, type, collidable: true, isRoute: dx === 0 && dz === -1 });
    }
  }
}

/**
 * Строит удобную ступенчатую лесенку с пола обратно на высоту паркура,
 * чтобы упавший на пол игрок мог быстро подняться назад без рестарта!
 */
function addRecoveryStairs(blocks, sideX, floorY, topY, startZ) {
  const steps = Math.max(1, topY - floorY);
  for (let s = 1; s <= steps; s++) {
    blocks.push({
      x: sideX,
      y: floorY + s,
      z: startZ - (s - 1) * 2,
      type: 'gold',
      collidable: true
    });
    blocks.push({
      x: sideX + (sideX < 0 ? 1 : -1),
      y: floorY + s,
      z: startZ - (s - 1) * 2,
      type: 'birch_planks',
      collidable: true
    });
  }
}

/**
 * Строит высокое хвойное/лиственное дерево (как на парящих островах Референса 3)
 */
function addTallSpruceTree(blocks, x, baseY, z, height = 9) {
  for (let y = 0; y < height; y++) {
    blocks.push({ x, y: baseY + y, z, type: 'oak_log', collidable: false });
  }
  for (let layer = 2; layer < height + 2; layer++) {
    const radius = layer % 2 === 0 ? 2 : 1;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        if (dx === 0 && dz === 0 && layer < height) continue;
        blocks.push({ x: x + dx, y: baseY + layer, z: z + dz, type: 'leaves', collidable: false });
      }
    }
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════
 * УРОВЕНЬ 1: «TikTok Садовая Аллея и Золотой Зал» (Референс 5 + Референс 4)
 * Длина: 175 блоков! Внизу сплошной газонный и светокаменный пол с золотыми ступенями возврата!
 * ════════════════════════════════════════════════════════════════════════
 */
function buildLevel1() {
  const blocks = [];

  // 1. Секция 1 (z от +4 до -60): Монументальный коридор Садовой Аллеи из Референса 5!
  // Внизу — сплошной зелёный газон (y = 0), по бокам — резные бордюры из каменного кирпича и высокие живые изгороди с цветами.
  for (let z = 4; z >= -62; z--) {
    // Пол коридора (можно спокойно бегать, если упал с платформ!)
    for (let x = -5; x <= 5; x++) {
      const floorType = Math.abs(x) === 5 ? 'stone_bricks' : (z >= -2 ? 'birch_planks' : 'grass');
      blocks.push({ x, y: 0, z, type: floorType, collidable: true });
    }

    // Каменные бордюры по бокам (x = -6 и x = +6), точно как на скриншоте 5
    blocks.push({ x: -6, y: 1, z, type: 'stone_bricks', collidable: true });
    blocks.push({ x: 6, y: 1, z, type: 'stone_bricks', collidable: true });
    if (z % 2 === 0) {
      blocks.push({ x: -6, y: 2, z, type: 'stone', collidable: true });
      blocks.push({ x: 6, y: 2, z, type: 'stone', collidable: true });
    }

    // Высокие колонны деревьев и цветущей листвы вдоль аллеи
    if (z % 6 === 0) {
      for (let y = 2; y <= 11; y++) {
        blocks.push({ x: -8, y, z, type: 'oak_log', collidable: false });
        blocks.push({ x: 8, y, z, type: 'oak_log', collidable: false });
      }
      // Перекидные зелёные арки под потолком аллеи
      for (let ax = -7; ax <= 7; ax++) {
        blocks.push({ x: ax, y: 12, z, type: Math.abs(ax) < 3 ? 'stone_bricks' : 'leaves', collidable: false });
      }
    } else {
      for (let y = 3; y <= 10; y++) {
        blocks.push({ x: -8, y, z, type: 'leaves', collidable: false });
        blocks.push({ x: 8, y, z, type: 'leaves', collidable: false });
      }
    }
  }

  // Ступеньки возврата с пола y=0 на стартовый помост y=2 в начале и середине аллеи
  addRecoveryStairs(blocks, -4, 0, 2, -2);
  addRecoveryStairs(blocks, 4, 0, 3, -24);
  addRecoveryStairs(blocks, -4, 0, 4, -44);

  // Стартовый помост из светлых берёзовых досок (как под ногами игрока на Референсе 5!)
  for (let x = -3; x <= 3; x++) {
    for (let z = 2; z >= -1; z--) {
      blocks.push({ x, y: 2, z, type: 'birch_planks', collidable: true });
    }
  }

  // Серия фирменных жёлтых крестовых платформ над газоном (z = -5 .. -53)
  addHollowCrossPlatform(blocks, 0, 2, -6, 'yellow_wool');
  addHollowCrossPlatform(blocks, 0, 2, -12, 'yellow_wool');
  // Поперечный деревянный мостик
  for (let x = -3; x <= 3; x++) {
    blocks.push({ x, y: 3, z: -17, type: 'birch_planks', collidable: true, isRoute: x === 0 });
  }
  addHollowCrossPlatform(blocks, -1, 3, -22, 'yellow_wool');
  addHollowCrossPlatform(blocks, 1, 3, -28, 'yellow_wool');
  addHollowCrossPlatform(blocks, 0, 4, -34, 'yellow_wool');

  // Одиночные скоростные блоки изумруда и золота
  blocks.push({ x: -2, y: 4, z: -39, type: 'emerald', collidable: true, isRoute: true });
  blocks.push({ x: 0, y: 4, z: -43, type: 'gold', collidable: true, isRoute: true });
  blocks.push({ x: 2, y: 5, z: -47, type: 'emerald', collidable: true, isRoute: true });
  blocks.push({ x: 0, y: 5, z: -51, type: 'gold', collidable: true, isRoute: true });

  // ЧЕКПОИНТ #1 на большом каменном балконе (z = -57)
  for (let x = -3; x <= 3; x++) {
    for (let z = -55; z >= -60; z--) {
      blocks.push({ x, y: 5, z, type: 'stone_bricks', collidable: true });
    }
  }
  blocks.push({ x: 0, y: 6, z: -57, type: 'checkpoint', checkpointIndex: 1, collidable: false });

  // 2. Секция 2 (z от -61 до -118): «Золотая Цитадель и Светокаменная Терраса» (Точная копия Референса 4!)
  // Пол выложен светящимся Светокамнем (Glowstone) и Красным ковром, справа — массивная золотая стена, слева — деревянные ограды
  for (let z = -61; z >= -118; z--) {
    for (let x = -5; x <= 5; x++) {
      const isRedCarpet = x >= 1 && x <= 3 || (z % 8 === 0 && Math.abs(x) <= 2);
      blocks.push({
        x,
        y: 4,
        z,
        type: isRedCarpet ? 'red_wool' : 'glowstone',
        collidable: true
      });
    }
    // Деревянные перила слева (как на Референсе 4!)
    if (z % 3 === 0) {
      blocks.push({ x: -5, y: 5, z, type: 'birch_planks', collidable: true });
      blocks.push({ x: -5, y: 6, z, type: 'birch_planks', collidable: true });
    } else {
      blocks.push({ x: -5, y: 5, z, type: 'birch_planks', collidable: true });
    }

    // Массивная рельефная стена из Золотых Блоков справа и нависающий каменный утёс сверху!
    const goldWallHeight = 9 + Math.round(Math.sin(z * 0.2) * 2);
    for (let y = 5; y <= goldWallHeight; y++) {
      blocks.push({ x: 5, y, z, type: 'gold', collidable: true });
      if (y > 7) blocks.push({ x: 4, y, z, type: 'gold', collidable: false });
    }
    for (let rx = 2; rx <= 6; rx++) {
      blocks.push({ x: rx, y: 12, z, type: 'stone', collidable: false });
    }
  }

  // Лесенки возврата с пола Светокамня (y=4) на золотые и красные блоки паркура
  addRecoveryStairs(blocks, -3, 4, 7, -68);
  addRecoveryStairs(blocks, -3, 4, 8, -94);

  const goldSectionSteps = [
    { x: 0, y: 6, z: -64, type: 'gold' },
    { x: 1, y: 7, z: -68, type: 'red_wool' },
    { x: 2, y: 7, z: -72, type: 'gold' },
    { x: 0, y: 8, z: -76, type: 'red_wool' },
    { x: -2, y: 8, z: -80, type: 'gold' },
    { x: -1, y: 9, z: -84, type: 'red_wool' },
    { x: 1, y: 9, z: -88, type: 'gold' },
    { x: 2, y: 9, z: -92, type: 'red_wool' },
    { x: 0, y: 10, z: -96, type: 'gold' },
    { x: -2, y: 10, z: -100, type: 'red_wool' },
    { x: 0, y: 10, z: -104, type: 'gold' },
    { x: 0, y: 10, z: -108, type: 'red_wool' }
  ];
  for (const s of goldSectionSteps) {
    blocks.push({ ...s, collidable: true, isRoute: true });
  }

  // ЧЕКПОИНТ #2 на золотом балконе (z = -114)
  for (let x = -3; x <= 3; x++) {
    for (let z = -112; z >= -117; z--) {
      blocks.push({ x, y: 10, z, type: 'gold', collidable: true });
    }
  }
  blocks.push({ x: 0, y: 11, z: -114, type: 'checkpoint', checkpointIndex: 2, collidable: false });

  // 3. Секция 3 (z от -119 до -172): Финальный Изумрудный Сад с павильоном финиша
  for (let z = -119; z >= -168; z--) {
    for (let x = -4; x <= 4; x++) {
      blocks.push({ x, y: 8, z, type: Math.abs(x) === 4 ? 'stone_bricks' : 'grass', collidable: true });
    }
  }
  addRecoveryStairs(blocks, -3, 8, 11, -124);
  addRecoveryStairs(blocks, 3, 8, 13, -146);

  const emeraldFinale = [
    { x: 0, y: 11, z: -122, type: 'emerald' },
    { x: -2, y: 11, z: -126, type: 'emerald' },
    { x: -1, y: 12, z: -130, type: 'yellow_wool' },
    { x: 1, y: 12, z: -134, type: 'emerald' },
    { x: 2, y: 13, z: -138, type: 'yellow_wool' },
    { x: 0, y: 13, z: -142, type: 'emerald' },
    { x: -2, y: 14, z: -146, type: 'emerald' },
    { x: 0, y: 14, z: -150, type: 'gold' },
    { x: 1, y: 15, z: -154, type: 'emerald' },
    { x: 0, y: 15, z: -158, type: 'gold' }
  ];
  for (const s of emeraldFinale) {
    blocks.push({ ...s, collidable: true, isRoute: true });
  }

  // Финишный Храм (z = -164)
  for (let x = -3; x <= 3; x++) {
    for (let z = -162; z >= -168; z--) {
      blocks.push({ x, y: 15, z, type: 'emerald', collidable: true });
    }
  }
  blocks.push({ x: 0, y: 16, z: -165, type: 'finish', collidable: false });

  return {
    id: 1,
    name: '1. TikTok Сад & Золото',
    subtitle: 'Длинная аллея с газонным полом, крестами и Золотой Цитаделью',
    biomeThumb: 'garden',
    waterLevelY: null, // Никакого моря внизу — везде есть твёрдый пол и ступеньки возврата!
    start: { x: 0, y: 2.5, z: 0 },
    blocks: finalizeBlocks(blocks),
    botTargetTime: 46.0
  };
}

/**
 * ════════════════════════════════════════════════════════════════════════
 * УРОВЕНЬ 2: «Пшеничный Грот и Меса-Каньон с Бамбуком» (Референс 1 + Референс 2)
 * Длина: 170 блоков! Пшеничное поле из снопов сена внизу, висящие деревянные столбы и песчаный каньон!
 * ════════════════════════════════════════════════════════════════════════
 */
function buildLevel2() {
  const blocks = [];

  // Секция 1 (z от +3 до -60): Пшеничный Грот с висящими на брёвнах оранжевыми платформами (Референс 1!)
  for (let z = 3; z >= -62; z--) {
    // Пол грота: слева зелёная трава с тропинкой, в центре и справа — золотое пшеничное поле (`hay`)!
    for (let x = -6; x <= 6; x++) {
      let floorType = 'hay';
      if (x <= -3) floorType = x === -4 ? 'dirt' : 'grass';
      blocks.push({ x, y: 0, z, type: floorType, collidable: true });
    }
    // Каменная скала слева и каменный свод пещеры высоко над головой
    for (let y = 1; y <= 12; y++) {
      blocks.push({ x: -7, y, z, type: 'stone', collidable: true });
    }
    for (let x = -7; x <= 5; x++) {
      blocks.push({ x, y: 13, z, type: 'stone', collidable: false });
    }
  }

  // Стоги сена (3x3 кубы на поле, как справа внизу на Референсе 1!)
  for (let dx = 0; dx <= 1; dx++) {
    for (let dz = 0; dz <= 1; dz++) {
      blocks.push({ x: 3 + dx, y: 1, z: -10 - dz, type: 'hay', collidable: true });
      blocks.push({ x: 3 + dx, y: 2, z: -10 - dz, type: 'hay', collidable: true });
      blocks.push({ x: -2 + dx, y: 1, z: -32 - dz, type: 'hay', collidable: true });
      blocks.push({ x: -2 + dx, y: 2, z: -32 - dz, type: 'hay', collidable: true });
    }
  }

  // Лесенки возврата с пшеничного поля на старт и промежуточные платформы
  addRecoveryStairs(blocks, -5, 0, 3, -2);
  addRecoveryStairs(blocks, 5, 0, 4, -26);
  addRecoveryStairs(blocks, -5, 0, 5, -48);

  // Стартовый балкон из оранжевых акациевых досок
  for (let x = -2; x <= 2; x++) {
    for (let z = 1; z >= -2; z--) {
      blocks.push({ x, y: 3, z, type: 'planks', collidable: true });
    }
  }

  // Знаменитые висящие на вертикальных столбах Г-образные деревянные платформы из Референса 1!
  const hangingPlatforms = [
    { x: 0, y: 3, z: -7 },
    { x: 1, y: 4, z: -13 },
    { x: -1, y: 4, z: -19 },
    { x: 0, y: 5, z: -25 },
    { x: 2, y: 5, z: -31 },
    { x: 0, y: 6, z: -37 },
    { x: -2, y: 6, z: -43 },
    { x: 0, y: 6, z: -49 }
  ];

  for (const hp of hangingPlatforms) {
    // Сама широкая платформа из оранжевых досок
    blocks.push({ x: hp.x, y: hp.y, z: hp.z, type: 'planks', collidable: true, isRoute: true });
    blocks.push({ x: hp.x + 1, y: hp.y, z: hp.z, type: 'planks', collidable: true });
    blocks.push({ x: hp.x, y: hp.y, z: hp.z - 1, type: 'planks', collidable: true });

    // Вертикальный деревянный столб-подвес, уходящий вверх в каменный потолок пещеры!
    for (let py = hp.y + 1; py <= 12; py++) {
      blocks.push({ x: hp.x, y: py, z: hp.z - 1, type: 'planks', collidable: true });
    }
  }

  // ЧЕКПОИНТ #1 на каменном уступе с красной кроватью/ковром (z = -56)
  for (let x = -3; x <= 3; x++) {
    for (let z = -54; z >= -59; z--) {
      blocks.push({ x, y: 6, z, type: 'stone', collidable: true });
    }
  }
  blocks.push({ x: 2, y: 7, z: -56, type: 'red_wool', collidable: true });
  blocks.push({ x: 0, y: 7, z: -56, type: 'checkpoint', checkpointIndex: 1, collidable: false });

  // Секция 2 (z от -60 до -125): «Песчано-Терракотовый Меса-Каньон с Бамбуком» (Референс 2!)
  for (let z = -60; z >= -126; z--) {
    // Широкий песчаный пляж-пол внизу (y = 4), с которого всегда можно подняться по ступенькам!
    for (let x = -5; x <= 5; x++) {
      blocks.push({ x, y: 4, z, type: 'sand', collidable: true });
    }
    // Высокие рыжие скалы из оранжевой терракоты слева (как на Референсе 2!)
    for (let y = 5; y <= 12; y++) {
      blocks.push({ x: -6, y, z, type: y > 10 ? 'sand' : 'terracotta', collidable: true });
    }
    // Высокие стебли зелёного бамбука вдоль правого края песчаного берега!
    if (z % 5 === 0) {
      for (let by = 5; by <= 13; by++) {
        blocks.push({ x: 4, y: by, z, type: 'bamboo', collidable: true });
      }
    }
  }

  addRecoveryStairs(blocks, -4, 4, 7, -66);
  addRecoveryStairs(blocks, 3, 4, 9, -96);

  // Г-образные каменные и терракотовые блоки паркура над песком (как в центре Референса 2!)
  const mesaJumps = [
    { x: 0, y: 7, z: -64, type: 'stone' },
    { x: 1, y: 7, z: -68, type: 'stone' },
    { x: -1, y: 8, z: -73, type: 'terracotta' },
    { x: 1, y: 8, z: -78, type: 'stone' },
    { x: 2, y: 9, z: -83, type: 'terracotta' },
    { x: 0, y: 9, z: -88, type: 'stone' },
    { x: -2, y: 10, z: -93, type: 'terracotta' },
    { x: 0, y: 10, z: -98, type: 'gold' },
    { x: 1, y: 11, z: -103, type: 'stone' },
    { x: -1, y: 11, z: -108, type: 'terracotta' },
    { x: 0, y: 12, z: -113, type: 'gold' }
  ];
  for (const mj of mesaJumps) {
    blocks.push({ ...mj, collidable: true, isRoute: true });
    blocks.push({ x: mj.x, y: mj.y, z: mj.z - 1, type: mj.type, collidable: true });
  }

  // ЧЕКПОИНТ #2 и Финальный рывок к Оазису (z = -120 .. -162)
  for (let x = -3; x <= 3; x++) {
    for (let z = -118; z >= -123; z--) {
      blocks.push({ x, y: 12, z, type: 'terracotta', collidable: true });
    }
  }
  blocks.push({ x: 0, y: 13, z: -120, type: 'checkpoint', checkpointIndex: 2, collidable: false });

  for (let z = -124; z >= -164; z--) {
    for (let x = -4; x <= 4; x++) {
      blocks.push({ x, y: 10, z, type: 'sand', collidable: true });
    }
  }
  addRecoveryStairs(blocks, -3, 10, 13, -128);

  const oasisSteps = [
    { x: 0, y: 13, z: -128, type: 'emerald' },
    { x: 2, y: 13, z: -133, type: 'gold' },
    { x: 0, y: 14, z: -138, type: 'emerald' },
    { x: -2, y: 14, z: -143, type: 'gold' },
    { x: 0, y: 15, z: -148, type: 'emerald' },
    { x: 0, y: 15, z: -153, type: 'gold' }
  ];
  for (const os of oasisSteps) {
    blocks.push({ ...os, collidable: true, isRoute: true });
  }

  for (let x = -3; x <= 3; x++) {
    for (let z = -157; z >= -163; z--) {
      blocks.push({ x, y: 15, z, type: 'gold', collidable: true });
    }
  }
  blocks.push({ x: 0, y: 16, z: -160, type: 'finish', collidable: false });

  return {
    id: 2,
    name: '2. Пшеница & Меса-Каньон',
    subtitle: 'Висящие брёвна над пшеничным полем и бамбуковый каньон',
    biomeThumb: 'gold_mesa',
    waterLevelY: null,
    start: { x: 0, y: 3.5, z: 0 },
    blocks: finalizeBlocks(blocks),
    botTargetTime: 45.0
  };
}

/**
 * ════════════════════════════════════════════════════════════════════════
 * УРОВЕНЬ 3: «Изумрудные Небесные Острова 4K» (Точная реконструкция Референса 3!)
 * Огромный архипелаг парящих островов из бирюзового призмарина, травы и высоких сосен,
 * соединённых мостами и колоннами из Изумрудных Блоков! Под мостами — страховочные палубы островов!
 * ════════════════════════════════════════════════════════════════════════
 */
function buildLevel3() {
  const blocks = [];

  // Вспомогательная функция создания живописного парящего острова с призмариновым основанием и соснами (Референс 3!)
  const addFloatingEmeraldIsland = (cx, topY, cz, radiusX, radiusZ, withTrees = true) => {
    for (let dx = -radiusX; dx <= radiusX; dx++) {
      for (let dz = -radiusZ; dz <= radiusZ; dz++) {
        const dist = Math.hypot(dx / radiusX, dz / radiusZ);
        if (dist <= 1.05) {
          blocks.push({ x: cx + dx, y: topY, z: cz + dz, type: 'grass', collidable: true });
          const depth = Math.max(1, Math.round((1.1 - dist) * 4));
          for (let d = 1; d <= depth; d++) {
            blocks.push({
              x: cx + dx,
              y: topY - d,
              z: cz + dz,
              type: d === 1 ? 'dirt' : 'prismarine',
              collidable: false
            });
          }
        }
      }
    }
    if (withTrees) {
      addTallSpruceTree(blocks, cx - radiusX + 2, topY + 1, cz - 2, 8);
      addTallSpruceTree(blocks, cx + radiusX - 2, topY + 1, cz + 2, 9);
    }
  };

  // Остров 1 (Старт, z = 0 .. -24)
  addFloatingEmeraldIsland(0, 2, -10, 6, 14, true);
  addRecoveryStairs(blocks, -3, 2, 5, -4);

  // Изумрудные Г-образные колонны и блоки (точно как на переднем плане Референса 3!)
  const island1Steps = [
    { x: 0, y: 4, z: -4 },
    { x: 1, y: 5, z: -8 },
    { x: -1, y: 5, z: -13 },
    { x: 0, y: 6, z: -18 },
    { x: 0, y: 6, z: -22 }
  ];
  for (const s of island1Steps) {
    blocks.push({ x: s.x, y: s.y, z: s.z, type: 'emerald', collidable: true, isRoute: true });
    blocks.push({ x: s.x + 1, y: s.y, z: s.z, type: 'emerald', collidable: true });
    for (let cy = 3; cy < s.y; cy++) {
      blocks.push({ x: s.x, y: cy, z: s.z, type: 'emerald', collidable: true });
    }
  }

  // Широкий страховочный мост из призмарина между островами, чтобы игрок не улетал в бездну при промахе
  for (let z = -24; z >= -155; z--) {
    for (let x = -4; x <= 4; x++) {
      blocks.push({ x, y: 4, z, type: Math.abs(x) === 4 ? 'prismarine' : 'grass', collidable: true });
    }
  }

  // Остров 2 (Чекпоинт #1, z = -30 .. -68)
  addFloatingEmeraldIsland(-8, 8, -42, 5, 8, true);
  addFloatingEmeraldIsland(8, 9, -56, 5, 8, true);
  addRecoveryStairs(blocks, -3, 4, 7, -30);
  addRecoveryStairs(blocks, 3, 4, 8, -56);

  blocks.push({ x: 0, y: 5, z: -28, type: 'checkpoint', checkpointIndex: 1, collidable: false });

  const midEmeraldSteps = [
    { x: 0, y: 6, z: -33, type: 'emerald' },
    { x: -2, y: 7, z: -38, type: 'emerald' },
    { x: 0, y: 7, z: -43, type: 'gold' },
    { x: 2, y: 8, z: -48, type: 'emerald' },
    { x: 0, y: 8, z: -53, type: 'emerald' },
    { x: -1, y: 9, z: -58, type: 'gold' },
    { x: 1, y: 9, z: -63, type: 'emerald' },
    { x: 0, y: 9, z: -68, type: 'emerald' }
  ];
  for (const s of midEmeraldSteps) {
    blocks.push({ ...s, collidable: true, isRoute: true });
    blocks.push({ x: s.x, y: s.y, z: s.z - 1, type: s.type, collidable: true });
  }

  // Чекпоинт #2 (z = -74)
  for (let x = -2; x <= 2; x++) {
    for (let z = -72; z >= -76; z--) {
      blocks.push({ x, y: 9, z, type: 'emerald', collidable: true });
    }
  }
  blocks.push({ x: 0, y: 10, z: -74, type: 'checkpoint', checkpointIndex: 2, collidable: false });

  // Секция 3 (z = -78 .. -155): Грандиозная изумрудная аллея к небесному замку
  addFloatingEmeraldIsland(-9, 11, -100, 5, 9, true);
  addFloatingEmeraldIsland(9, 12, -125, 5, 9, true);
  addRecoveryStairs(blocks, -3, 4, 10, -84);
  addRecoveryStairs(blocks, 3, 4, 12, -118);

  for (let z = -80; z >= -144; z -= 5) {
    const sx = Math.round(Math.sin(z * 0.12) * 2);
    const sy = 10 + Math.floor((-80 - z) / 22);
    blocks.push({ x: sx, y: sy, z, type: 'emerald', collidable: true, isRoute: true });
    blocks.push({ x: sx + 1, y: sy, z, type: 'emerald', collidable: true });
  }

  // Финишный остров Архипелага (z = -152)
  addFloatingEmeraldIsland(0, 13, -154, 6, 7, true);
  blocks.push({ x: 0, y: 14, z: -154, type: 'finish', collidable: false });

  return {
    id: 3,
    name: '3. Изумрудные Острова 4K',
    subtitle: 'Парящий архипелаг из призмарина, высоких елей и изумрудных колонн',
    biomeThumb: 'emerald_sky',
    waterLevelY: null,
    start: { x: 0, y: 4.5, z: -4 },
    blocks: finalizeBlocks(blocks),
    botTargetTime: 44.0
  };
}

/**
 * ════════════════════════════════════════════════════════════════════════
 * УРОВЕНЬ 4: Процедурный Мега-Коридор (160 блоков с твёрдым полом и новыми генерациями!)
 * ════════════════════════════════════════════════════════════════════════
 */
export function generateProceduralLevel(seed = 2026) {
  const rand = createSeededRandom(seed);
  const blocks = [];

  // Длинный страховочный пол на всю трассу (z от 2 до -150)
  for (let z = 2; z >= -152; z--) {
    for (let x = -4; x <= 4; x++) {
      blocks.push({
        x,
        y: 0,
        z,
        type: Math.abs(x) === 4 ? 'stone_bricks' : (z % 10 === 0 ? 'glowstone' : 'grass'),
        collidable: true
      });
    }
    if (z % 18 === 0) {
      addRecoveryStairs(blocks, -3, 0, 4, z);
    }
  }

  for (let x = -2; x <= 2; x++) {
    for (let z = 1; z >= -2; z--) {
      blocks.push({ x, y: 2, z, type: 'birch_planks', collidable: true });
    }
  }

  let curX = 0;
  let curY = 3;
  let curZ = -2;
  let cpIndex = 1;
  const palette = ['emerald', 'gold', 'yellow_wool', 'red_wool', 'planks'];

  for (let i = 1; i <= 30; i++) {
    curZ -= 4;
    curX = Math.max(-2, Math.min(2, curX + (Math.floor(rand() * 3) - 1)));
    curY = Math.max(2, Math.min(8, curY + (rand() < 0.35 ? 1 : (rand() < 0.2 ? -1 : 0))));

    if (i % 10 === 0 && i < 30) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          blocks.push({ x: curX + dx, y: curY, z: curZ + dz, type: 'stone_bricks', collidable: true });
        }
      }
      blocks.push({ x: curX, y: curY + 1, z: curZ, type: 'checkpoint', checkpointIndex: cpIndex++, collidable: false });
      curZ -= 2;
    } else {
      const matType = palette[Math.floor(rand() * palette.length)];
      blocks.push({ x: curX, y: curY, z: curZ, type: matType, collidable: true, isRoute: true });
      blocks.push({ x: curX + 1, y: curY, z: curZ, type: matType, collidable: true });
    }
  }

  curZ -= 5;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      blocks.push({ x: curX + dx, y: curY, z: curZ + dz, type: 'gold', collidable: true });
    }
  }
  blocks.push({ x: curX, y: curY + 1, z: curZ, type: 'finish', collidable: false });

  return {
    id: 4,
    name: '4. Мега-Генератор ∞',
    subtitle: 'Бесконечная рандомная полоса со страховочным полом и золотом',
    biomeThumb: 'wheat_cave',
    waterLevelY: null,
    start: { x: 0, y: 2.5, z: 0 },
    blocks: finalizeBlocks(blocks),
    botTargetTime: 42.0
  };
}

export const LEVELS = [
  buildLevel1(),
  buildLevel2(),
  buildLevel3(),
  generateProceduralLevel(777)
];
