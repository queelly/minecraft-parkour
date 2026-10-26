import * as THREE from 'three';
import { LEVELS, generateProceduralLevel } from '../level/LevelData.js';
import { GhostPlayer } from '../multiplayer/GhostPlayer.js';

/**
 * Центральный контроллер игры:
 * Управляет состояниями (menu, playing, paused, dead, finished),
 * секундомером прохождения, респавном на чекпоинтах, сохранением в YandexSDK и записью/воспроизведением призраков.
 */
export class Game {
  constructor({
    scene,
    camera,
    renderer,
    materials,
    level,
    physics,
    input,
    player,
    audio,
    yandexSDK,
    ghostRecorder,
    ghostPlayer
  }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.materials = materials;
    this.level = level;
    this.physics = physics;
    this.input = input;
    this.player = player;
    this.audio = audio;
    this.sdk = yandexSDK;
    this.ghostRecorder = ghostRecorder;
    this.ghostPlayer = ghostPlayer;

    // Состояния: 'menu' | 'playing' | 'paused' | 'dead' | 'finished'
    this.state = 'menu';

    this.levels = LEVELS;
    this.currentLevelIndex = 0;

    // Текущий прогресс в забеге
    this.runTimeMs = 0;
    this.activeCheckpointIndex = 0;
    this.activeSpawnPoint = new THREE.Vector3(0, 2.5, 0);
    this.lastFinishReward = 25;
    this.rewardDoubledThisRun = false;

    // Сохранённые данные игрока (включая купленные ножи CS2 и активный скин)
    this.saveData = {
      bestTimes: {},
      unlockedLevel: 0,
      coins: 100, // Стартовый бонус 100 изумрудов, чтобы игрок мог сразу купить Керамбит или Бабочку!
      soundEnabled: true,
      unlockedSkins: ['kunai_crimson'],
      equippedSkin: 'kunai_crimson'
    };

    this.ui = null; // Инициализируется через attachUI
    this._bindWindowBlurPause();
  }

  attachUI(uiManager) {
    this.ui = uiManager;
  }

  /**
   * Загрузка сохранений из Яндекс Игр и подготовка стартовой сцены на фоне главного меню
   */
  async initProgress() {
    const loaded = await this.sdk.loadProgress();
    if (loaded) {
      this.saveData = {
        bestTimes: loaded.bestTimes || {},
        unlockedLevel: loaded.unlockedLevel || 0,
        coins: loaded.coins !== undefined ? loaded.coins : 100,
        soundEnabled: loaded.soundEnabled !== undefined ? loaded.soundEnabled : true,
        unlockedSkins: Array.isArray(loaded.unlockedSkins) ? loaded.unlockedSkins : ['kunai_crimson'],
        equippedSkin: loaded.equippedSkin || 'kunai_crimson'
      };
    }

    if (this.player.weaponViewModel) {
      this.player.weaponViewModel.equipSkin(this.saveData.equippedSkin);
    }

    this.audio.setEnabled(this.saveData.soundEnabled);
    this.ui.updateSoundButton(this.saveData.soundEnabled);
    this.ui.updateCoins(this.saveData.coins);

    // Загружаем первый уровень на заднем плане меню для красивой 3D-панорамы
    await this._prepareLevel(this.currentLevelIndex);
    this._refreshMenuUI();
    this.ui.showState('menu', this.input.isMobile);
  }

  _refreshMenuUI() {
    this.ui.renderLevelSelector(
      this.levels,
      this.currentLevelIndex,
      this.saveData.bestTimes,
      async (selectedIdx) => {
        this.audio.playClick();
        this.currentLevelIndex = selectedIdx;
        if (this.levels[selectedIdx].id === 4) {
          // Для 4-го уровня можно генерировать свежую вариацию трассы
          this.levels[selectedIdx] = generateProceduralLevel(1000 + Math.floor(Math.random() * 8999));
        }
        await this._prepareLevel(this.currentLevelIndex);
        this._refreshMenuUI();
      }
    );
  }

  /**
   * Загружает геометрию выбранного уровня и инициализирует асинхронных призраков
   */
  async _prepareLevel(index) {
    const levelData = this.levels[index];
    this.level.load(levelData);

    this.activeCheckpointIndex = 0;
    this.activeSpawnPoint.copy(this.level.startPosition);
    this.player.spawnAt(this.activeSpawnPoint);

    // Собираем список призраков:
    // 1) Призраки из ysdk.multiplayer.sessions
    // 2) Личный лучший призрак игрока из localStorage
    // 3) Эталонный бот-спидранер (чтобы в забеге всегда был визуальный ориентир)
    const ghosts = [];
    const cloudGhosts = await this.sdk.initMultiplayerSessions(levelData.id);
    if (cloudGhosts.length > 0) {
      ghosts.push(...cloudGhosts);
    }

    const personalBestFrames = this.ghostRecorder.loadBestLocalGhost(levelData.id);
    if (personalBestFrames) {
      ghosts.push({
        id: 'personal_best',
        name: 'Ваш Рекорд',
        frames: personalBestFrames
      });
    }

    const botGhost = GhostPlayer.createBotGhost(levelData.waypoints, levelData.botTargetTime || 25.0);
    if (botGhost) {
      ghosts.push(botGhost);
    }

    this.ghostPlayer.setGhosts(ghosts);
  }

  /**
   * Старт забега с начала уровня
   */
  async startLevel(resetFromStart = true) {
    this.audio.playClick();

    if (resetFromStart) {
      this.runTimeMs = 0;
      this.activeCheckpointIndex = 0;
      this.level.resetCheckpoints();
      this.activeSpawnPoint.copy(this.level.startPosition);
      this.ghostRecorder.start();
    }

    this.player.spawnAt(this.activeSpawnPoint);
    this.input.resetState();

    this.state = 'playing';
    this.ui.showState('playing', this.input.isMobile);
    this.player.lockPointer(this.input.isMobile);
    this.sdk.gameplayStart();
  }

  /**
   * Продолжение с последнего активированного чекпоинта после просмотра Rewarded Video
   */
  continueFromCheckpointWithReward() {
    this.audio.playClick();
    this.sdk.showRewarded(
      () => {
        // Вознаграждение получено: возвращаем игрока на чекпоинт без сброса таймера
        this.player.spawnAt(this.activeSpawnPoint);
        this.input.resetState();
        this.state = 'playing';
        this.ui.showState('playing', this.input.isMobile);
        this.player.lockPointer(this.input.isMobile);
        this.sdk.gameplayStart();
        this.ui.showToast('Возврат на чекпоинт!');
      },
      () => {}
    );
  }

  /**
   * Полный рестарт уровня (с показом Interstitial рекламы, если прошёл кулдаун)
   */
  restartLevel() {
    this.sdk.showInterstitial(() => {
      this.startLevel(true);
    });
  }

  /**
   * Пауза игры (по Esc, кнопке паузы или потере фокуса окна)
   */
  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.player.unlockPointer();
    this.sdk.gameplayStop();
    this.ui.showState('paused', this.input.isMobile);
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.audio.playClick();
    this.state = 'playing';
    this.input.resetState();
    this.ui.showState('playing', this.input.isMobile);
    this.player.lockPointer(this.input.isMobile);
    this.sdk.gameplayStart();
  }

  goToMainMenu() {
    this.audio.playClick();
    this.state = 'menu';
    this.player.unlockPointer();
    this.sdk.gameplayStop();
    this._refreshMenuUI();
    this.ui.showState('menu', this.input.isMobile);
  }

  /**
   * Обработка смерти (падение в бездну ниже y = -10 или касание блока лавы)
   */
  _handlePlayerDeath(reasonText) {
    this.audio.playDeath();
    this.sdk.gameplayStop();

    // На десктопе при игре без чекпоинта и зажатии R игрок может мгновенно возрождаться,
    // но показываем экран смерти с возможностью продолжить с чекпоинта за рекламу.
    this.state = 'dead';
    this.player.unlockPointer();
    this.ui.configureDeadScreen(reasonText, this.activeCheckpointIndex > 0);
    this.ui.showState('dead', this.input.isMobile);
  }

  /**
   * Обработка достижения финиша
   */
  async _handleLevelFinish() {
    this.audio.playFinish();
    this.state = 'finished';
    this.player.unlockPointer();
    this.sdk.gameplayStop();

    const levelData = this.levels[this.currentLevelIndex];
    const finalTimeMs = Math.round(this.runTimeMs);
    const recordedFrames = this.ghostRecorder.stop();

    // Проверяем, установлен ли новый рекорд на этом уровне
    const prevBest = this.saveData.bestTimes[levelData.id];
    const isNewRecord = !prevBest || finalTimeMs < prevBest;
    if (isNewRecord) {
      this.saveData.bestTimes[levelData.id] = finalTimeMs;
      this.ghostRecorder.saveBestLocalGhost(levelData.id, recordedFrames);
    }

    // Отправляем сессию призрака в облако Яндекс Игр
    this.sdk.pushMultiplayerSession(levelData.id, finalTimeMs, recordedFrames);

    // Начисляем изумруды за прохождение
    this.lastFinishReward = isNewRecord ? 40 : 25;
    this.rewardDoubledThisRun = false;
    this.saveData.coins += this.lastFinishReward;
    this.saveData.unlockedLevel = Math.max(
      this.saveData.unlockedLevel,
      Math.min(this.levels.length - 1, this.currentLevelIndex + 1)
    );

    this.ui.updateCoins(this.saveData.coins);
    await this.sdk.saveProgress(this.saveData);

    // Отправляем результат в лидерборд 'best_time' Яндекс Игр
    await this.sdk.submitScore(finalTimeMs);

    this.ui.configureFinishScreen(
      levelData.name,
      finalTimeMs,
      this.saveData.bestTimes[levelData.id],
      this.lastFinishReward,
      true
    );
    this.ui.showState('finished', this.input.isMobile);
  }

  /**
   * Удвоение награды за просмотр Rewarded рекламы на экране финиша
   */
  doubleFinishReward() {
    if (this.rewardDoubledThisRun) return;
    this.sdk.showRewarded(async () => {
      this.rewardDoubledThisRun = true;
      this.saveData.coins += this.lastFinishReward;
      this.ui.updateCoins(this.saveData.coins);
      await this.sdk.saveProgress(this.saveData);

      const levelData = this.levels[this.currentLevelIndex];
      this.ui.configureFinishScreen(
        levelData.name,
        Math.round(this.runTimeMs),
        this.saveData.bestTimes[levelData.id],
        this.lastFinishReward * 2,
        false
      );
      this.ui.showToast(`Награда удвоена! +${this.lastFinishReward * 2} 💎`);
    });
  }

  /**
   * Открывает Арсенал Ножей CS2 и обрабатывает покупку/экипировку клинков
   */
  openArmory() {
    this.audio.playClick();
    const refreshModal = () => {
      this.ui.showArmoryModal(
        this.saveData.coins,
        this.saveData.unlockedSkins,
        this.saveData.equippedSkin,
        async (skin) => {
          const isOwned = this.saveData.unlockedSkins.includes(skin.id) || skin.price === 0;
          if (isOwned) {
            this.saveData.equippedSkin = skin.id;
            this.player.weaponViewModel?.equipSkin(skin.id);
            this.player.weaponViewModel?.triggerInspect();
            this.audio.playCheckpoint();
            await this.sdk.saveProgress(this.saveData);
            this.ui.showToast(`Экипирован: ${skin.name}`);
            refreshModal();
          } else if (this.saveData.coins >= skin.price) {
            this.saveData.coins -= skin.price;
            this.saveData.unlockedSkins.push(skin.id);
            this.saveData.equippedSkin = skin.id;
            this.player.weaponViewModel?.equipSkin(skin.id);
            this.player.weaponViewModel?.triggerInspect();
            this.audio.playFinish();
            this.ui.updateCoins(this.saveData.coins);
            await this.sdk.saveProgress(this.saveData);
            this.ui.showToast(`Разблокирован: ${skin.name}!`);
            refreshModal();
          } else if (skin.isRewardedUnlock) {
            // VIP-катану можно разблокировать сразу за просмотр Rewarded-видео!
            this.sdk.showRewarded(async () => {
              this.saveData.unlockedSkins.push(skin.id);
              this.saveData.equippedSkin = skin.id;
              this.player.weaponViewModel?.equipSkin(skin.id);
              this.player.weaponViewModel?.triggerInspect();
              this.audio.playFinish();
              await this.sdk.saveProgress(this.saveData);
              this.ui.showToast(`VIP Катана получена!`);
              refreshModal();
            });
          } else {
            this.audio.playDeath();
            this.ui.showToast(`Нужно ещё ${skin.price - this.saveData.coins} 💎 (нажмите +75 💎 сверху!)`);
          }
        }
      );
    };
    refreshModal();
  }

  /**
   * Пополнение баланса изумрудов за просмотр Rewarded-рекламы в Арсенале
   */
  claimFreeArmoryCoins() {
    this.audio.playClick();
    this.sdk.showRewarded(async () => {
      this.saveData.coins += 75;
      this.ui.updateCoins(this.saveData.coins);
      await this.sdk.saveProgress(this.saveData);
      this.audio.playFinish();
      this.ui.showToast('+75 💎 Изумрудов зачислено!');
      this.openArmory();
    });
  }

  /**
   * Переход на следующий уровень
   */
  async nextLevel() {
    this.currentLevelIndex = (this.currentLevelIndex + 1) % this.levels.length;
    if (this.levels[this.currentLevelIndex].id === 4) {
      this.levels[this.currentLevelIndex] = generateProceduralLevel(Date.now() % 10000);
    }
    await this._prepareLevel(this.currentLevelIndex);
    this.sdk.showInterstitial(() => {
      this.startLevel(true);
    });
  }

  /**
   * Авто-пауза при потере фокуса окна или выходе из PointerLock (требование Яндекс Игр)
   */
  _bindWindowBlurPause() {
    window.addEventListener('blur', () => {
      if (this.state === 'playing') {
        this.pauseGame();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') {
        this.pauseGame();
      }
    });

    this.player.controls.addEventListener('unlock', () => {
      if (this.state === 'playing' && !this.input.isMobile) {
        this.pauseGame();
      }
    });
  }

  /**
   * Главный шаг обновления логики игры (вызывается из цикла анимации main.js)
   */
  update(delta, elapsedTime) {
    // 1. Анимируем текстуры материалов и объекты уровня в любом состоянии (даже на фоне меню)
    this.materials.update(delta, elapsedTime);
    this.level.update(delta, elapsedTime);

    if (this.state === 'menu') {
      // Плавный кинематографический пролёт камеры вдоль речного каньона и грибного берега на фоне меню
      const camZ = 4.0 - ((elapsedTime * 3.2) % 45);
      this.camera.position.set(
        Math.sin(elapsedTime * 0.45) * 3.8,
        4.2 + Math.sin(elapsedTime * 0.6) * 0.8,
        camZ
      );
      this.camera.lookAt(0, 1.8, camZ - 16);
      return;
    }

    // Горячая клавиша R — мгновенный рестарт во время игры или с экрана падения
    if (this.input.consumeRestart()) {
      if (this.state === 'playing' || this.state === 'dead' || this.state === 'paused') {
        this.startLevel(true);
        return;
      }
    }

    // Горячая клавиша Esc — переключение паузы
    if (this.input.consumePause()) {
      if (this.state === 'playing') {
        this.pauseGame();
        return;
      } else if (this.state === 'paused') {
        this.resumeGame();
        return;
      }
    }

    if (this.state !== 'playing') return;

    // 2. Секундомер прохождения
    this.runTimeMs += delta * 1000;
    const runTimeSec = this.runTimeMs / 1000;

    // 3. Обновление физики и перемещения игрока
    this.player.update(delta, this.input, this.level, elapsedTime);

    // 4. Запись собственного таймлайна и воспроизведение призраков соперников
    this.ghostRecorder.recordStep(
      delta,
      runTimeSec,
      this.player.position,
      this.player.getYaw()
    );
    this.ghostPlayer.update(runTimeSec);

    // 5. Проверка падения в бездну (y < -12)
    if (this.player.position.y < -12) {
      this._handlePlayerDeath('Вы сорвались в пропасть!');
      return;
    }

    // 6. Проверка триггеров (река/лава, чекпоинты, финиш)
    const triggers = this.physics.checkTriggers(this.player.position, this.level);

    if (triggers.hitHazard) {
      this._handlePlayerDeath(triggers.hazardReason || 'Вы упали в воду!');
      return;
    }

    if (triggers.checkpoint) {
      const cp = triggers.checkpoint;
      if (this.level.activateCheckpoint(cp)) {
        this.activeCheckpointIndex = cp.index;
        this.activeSpawnPoint.copy(cp.spawnPos);
        this.audio.playCheckpoint();
        this.ui.showToast(`Чекпоинт #${cp.index} сохранён!`);
      }
    }

    if (triggers.hitFinish) {
      this._handleLevelFinish();
      return;
    }

    // 7. Обновление HUD
    const currentLevel = this.levels[this.currentLevelIndex];
    const bestMs = this.saveData.bestTimes[currentLevel.id];
    this.ui.updateHUD(
      this.runTimeMs,
      bestMs,
      currentLevel.name,
      this.activeCheckpointIndex,
      this.ghostPlayer.ghosts.length
    );
  }
}
