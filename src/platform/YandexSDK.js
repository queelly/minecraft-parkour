/**
 * Обёртка над официальным Yandex Games SDK v2.
 * Обеспечивает:
 * - Инициализацию SDK и отправку LoadingAPI.ready()
 * - Показ Interstitial и Rewarded рекламы с кулдауном и паузой звука
 * - Облачное сохранение прогресса через ysdk.player.setData() + fallback в localStorage
 * - Работу с лидербордом ('best_time') с поддержкой обоих вариантов сигнатур API разных версий SDK
 * - Асинхронный мультиплеер (ysdk.multiplayer.sessions) для записи и загрузки «призраков»
 */
export class YandexSDK {
  constructor(onPauseCallback, onResumeCallback) {
    this.ysdk = null;
    this.player = null;
    this.leaderboards = null;
    this.isAvailable = false;
    this.lastInterstitialTime = 0;
    this.interstitialCooldownMs = 65000; // Не чаще раза в 65 секунд во избежание троттлинга площадки

    this.onPauseCallback = onPauseCallback;
    this.onResumeCallback = onResumeCallback;

    this.storageKey = 'mc_parkour_save_v1';
    this.localLeaderboardKey = 'mc_parkour_lb_v1';
  }

  /**
   * Инициализация SDK Яндекс Игр
   */
  async init() {
    try {
      if (typeof window !== 'undefined' && window.YaGames) {
        this.ysdk = await window.YaGames.init();
        this.isAvailable = true;

        // Подписка на системные события паузы/возобновления от Яндекс Игр (например, при открытии оверлея платформы)
        if (typeof this.ysdk.on === 'function') {
          this.ysdk.on('game_api_pause', () => {
            if (this.onPauseCallback) this.onPauseCallback();
          });
          this.ysdk.on('game_api_resume', () => {
            if (this.onResumeCallback) this.onResumeCallback();
          });
        }

        // Инициализация объекта игрока (lite: false позволяет читать имя/аватар при наличии авторизации)
        try {
          this.player = await this.ysdk.getPlayer({ scopes: false });
        } catch (playerErr) {
          console.warn('[YandexSDK] getPlayer fallback:', playerErr);
        }

        // Инициализация таблицы лидеров:
        // Примечание по версиям SDK: в новых версиях v2 методы вызываются напрямую через ysdk.leaderboards.setScore,
        // а в ранних ревизиях требовался вызов await ysdk.getLeaderboards(). Поддерживаем оба варианта.
        if (this.ysdk.leaderboards) {
          this.leaderboards = this.ysdk.leaderboards;
        } else if (typeof this.ysdk.getLeaderboards === 'function') {
          this.leaderboards = await this.ysdk.getLeaderboards();
        }

        // Сообщаем платформе, что игра загружена и готова к взаимодействию
        if (this.ysdk.features && this.ysdk.features.LoadingAPI) {
          this.ysdk.features.LoadingAPI.ready();
        }
      } else {
        console.info('[YandexSDK] YaGames не обнаружен. Активирован локальный режим разработки.');
      }
    } catch (err) {
      console.warn('[YandexSDK] Ошибка инициализации SDK, переход в автономный режим:', err);
      this.isAvailable = false;
    }
  }

  /**
   * Уведомление GameplayAPI о старте/остановке активного геймплея
   */
  gameplayStart() {
    try {
      this.ysdk?.features?.GameplayAPI?.start();
    } catch (_) {}
  }

  gameplayStop() {
    try {
      this.ysdk?.features?.GameplayAPI?.stop();
    } catch (_) {}
  }

  /**
   * Показ полноэкранной рекламы (Interstitial) между уровнями или при рестарте
   */
  showInterstitial(onComplete) {
    const now = Date.now();
    if (now - this.lastInterstitialTime < this.interstitialCooldownMs) {
      if (onComplete) onComplete();
      return;
    }

    if (!this.isAvailable || !this.ysdk?.adv) {
      this.lastInterstitialTime = now;
      if (onComplete) onComplete();
      return;
    }

    this.ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => {
          if (this.onPauseCallback) this.onPauseCallback();
        },
        onClose: (wasShown) => {
          if (wasShown) this.lastInterstitialTime = Date.now();
          if (this.onResumeCallback) this.onResumeCallback();
          if (onComplete) onComplete();
        },
        onError: (err) => {
          console.warn('[YandexSDK] Ошибка showFullscreenAdv:', err);
          if (this.onResumeCallback) this.onResumeCallback();
          if (onComplete) onComplete();
        }
      }
    });
  }

  /**
   * Показ рекламы за вознаграждение (Rewarded Video)
   * Используется для продолжения с чекпоинта или удвоения изумрудов на финише.
   */
  showRewarded(onRewarded, onClose) {
    if (!this.isAvailable || !this.ysdk?.adv) {
      // Локальный симулятор вознаграждения, чтобы все кнопки работали при проверке без SDK
      if (this.onPauseCallback) this.onPauseCallback();
      setTimeout(() => {
        if (onRewarded) onRewarded();
        if (this.onResumeCallback) this.onResumeCallback();
        if (onClose) onClose(true);
      }, 250);
      return;
    }

    let rewarded = false;
    this.ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => {
          if (this.onPauseCallback) this.onPauseCallback();
        },
        onRewarded: () => {
          rewarded = true;
          if (onRewarded) onRewarded();
        },
        onClose: () => {
          if (this.onResumeCallback) this.onResumeCallback();
          if (onClose) onClose(rewarded);
        },
        onError: (err) => {
          console.warn('[YandexSDK] Ошибка showRewardedVideo:', err);
          if (this.onResumeCallback) this.onResumeCallback();
          if (onClose) onClose(false);
        }
      }
    });
  }

  /**
   * Сохранение прогресса игрока в облако Яндекс Игр + дублирование в localStorage
   */
  async saveProgress(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (_) {}

    if (this.player && typeof this.player.setData === 'function') {
      try {
        await this.player.setData(data, true);
      } catch (err) {
        console.warn('[YandexSDK] Не удалось сохранить данные в облако:', err);
      }
    }
  }

  /**
   * Загрузка прогресса игрока из облака или localStorage
   */
  async loadProgress() {
    let localData = null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) localData = JSON.parse(raw);
    } catch (_) {}

    if (this.player && typeof this.player.getData === 'function') {
      try {
        const cloudData = await this.player.getData();
        if (cloudData && Object.keys(cloudData).length > 0) {
          return cloudData;
        }
      } catch (err) {
        console.warn('[YandexSDK] Не удалось загрузить облачные сохранения:', err);
      }
    }

    return localData || {
      bestTimes: {},
      unlockedLevel: 0,
      coins: 0,
      soundEnabled: true
    };
  }

  /**
   * Отправка лучшего времени прохождения (в миллисекундах) в лидерборд 'best_time'
   */
  async submitScore(timeMs) {
    const scoreInt = Math.max(100, Math.round(timeMs));

    // Сохраняем в локальный топ для оффлайн-режима
    this._saveLocalLeaderboardScore(scoreInt);

    if (!this.leaderboards || typeof this.leaderboards.setScore !== 'function') {
      return;
    }

    try {
      await this.leaderboards.setScore('best_time', scoreInt);
    } catch (err) {
      console.warn('[YandexSDK] Не удалось отправить рекорд в лидерборд best_time:', err);
    }
  }

  /**
   * Загрузка топ-10 записей лидерборда 'best_time'
   * Поддерживает как строковый первый аргумент `getEntries('best_time', opts)`,
   * так и объектный `getEntries({ leaderboardName: 'best_time', ... })`.
   */
  async getLeaderboard() {
    if (this.leaderboards && typeof this.leaderboards.getEntries === 'function') {
      try {
        let res;
        try {
          res = await this.leaderboards.getEntries('best_time', {
            quantityTop: 10,
            includeUser: true,
            quantityAround: 3
          });
        } catch (_) {
          // Fallback для альтернативной сигнатуры с единым объектом параметров
          res = await this.leaderboards.getEntries({
            leaderboardName: 'best_time',
            quantityTop: 10,
            includeUser: true
          });
        }

        if (res && Array.isArray(res.entries) && res.entries.length > 0) {
          return res.entries.map((entry) => ({
            rank: entry.rank,
            name: entry.player?.publicName || 'Спидранер',
            score: entry.score
          }));
        }
      } catch (err) {
        console.warn('[YandexSDK] getLeaderboard fallback:', err);
      }
    }

    return this._getLocalLeaderboard();
  }

  _saveLocalLeaderboardScore(scoreMs) {
    try {
      const list = this._getLocalLeaderboard();
      const existingPlayer = list.find((item) => item.isUser);
      if (existingPlayer) {
        existingPlayer.score = Math.min(existingPlayer.score, scoreMs);
      } else {
        list.push({ rank: 1, name: 'Вы (Личный рекорд)', score: scoreMs, isUser: true });
      }
      list.sort((a, b) => a.score - b.score);
      list.forEach((item, idx) => {
        item.rank = idx + 1;
      });
      localStorage.setItem(this.localLeaderboardKey, JSON.stringify(list.slice(0, 10)));
    } catch (_) {}
  }

  _getLocalLeaderboard() {
    try {
      const raw = localStorage.getItem(this.localLeaderboardKey);
      if (raw) return JSON.parse(raw);
    } catch (_) {}

    return [
      { rank: 1, name: 'ShadowRunner', score: 18420 },
      { rank: 2, name: 'PixelPro_YT', score: 21150 },
      { rank: 3, name: 'CraftMaster', score: 24800 },
      { rank: 4, name: 'NoobSlayer99', score: 29340 },
      { rank: 5, name: 'BlockJumper', score: 34900 }
    ];
  }

  /**
   * Инициализация асинхронных мультиплеерных сессий («призраки» соперников)
   * Вызывает ysdk.multiplayer.sessions.init() и возвращает массив записанных таймлайнов.
   */
  async initMultiplayerSessions(levelId) {
    if (this.isAvailable && this.ysdk?.multiplayer?.sessions) {
      try {
        const opponents = await this.ysdk.multiplayer.sessions.init({
          count: 3,
          isEventBased: false,
          maxOpponentTurnTime: 200,
          meta: {
            meta1: { min: levelId, max: levelId },
            meta2: { min: 0, max: 999999 },
            meta3: { min: 0, max: 999999 }
          }
        });

        if (Array.isArray(opponents) && opponents.length > 0) {
          return opponents
            .map((opp, index) => ({
              id: opp.id || `ghost_${index}`,
              name: opp.player?.publicName || `Призрак #${index + 1}`,
              frames: this._extractFramesFromSession(opp)
            }))
            .filter((g) => g.frames.length > 1);
        }
      } catch (err) {
        console.warn('[YandexSDK] sessions.init недоступен или нет записанных сессий:', err);
      }
    }

    return [];
  }

  _extractFramesFromSession(sessionObj) {
    if (!sessionObj || !Array.isArray(sessionObj.turns)) return [];
    const frames = [];
    for (const turn of sessionObj.turns) {
      if (Array.isArray(turn.transactions)) {
        for (const tx of turn.transactions) {
          if (tx && tx.payload && Array.isArray(tx.payload.frames)) {
            frames.push(...tx.payload.frames);
          } else if (tx && tx.payload && typeof tx.payload.t === 'number') {
            frames.push(tx.payload);
          }
        }
      }
    }
    return frames;
  }

  /**
   * Сохранение записанной сессии заезда игрока в облако мультиплеера Яндекс Игр
   */
  pushMultiplayerSession(levelId, timeMs, frames) {
    if (!this.isAvailable || !this.ysdk?.multiplayer?.sessions) return;

    try {
      // Передаём пачку ключевых кадров в транзакцию и фиксируем сессию методом push
      if (typeof this.ysdk.multiplayer.sessions.commit === 'function') {
        this.ysdk.multiplayer.sessions.commit({ frames });
      }
      if (typeof this.ysdk.multiplayer.sessions.push === 'function') {
        this.ysdk.multiplayer.sessions.push({
          meta1: levelId,
          meta2: Math.round(timeMs),
          meta3: frames.length
        });
      }
    } catch (err) {
      console.warn('[YandexSDK] Ошибка сохранения сессии призрака:', err);
    }
  }
}
