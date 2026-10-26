import { generateBiomeThumbnailDataURL } from '../graphics/Textures.js';
import { WEAPON_SKINS, generateWeaponIconDataURL } from '../graphics/WeaponViewModel.js';

/**
 * Управление всеми HTML/CSS оверлеями:
 * - Главное меню с иллюстрированными карточками биомов и входом в Арсенал Ножей CS2
 * - Модальное окно Арсенала Ножей (покупка за изумруды, разблокировка VIP-катаны за рекламу, выбор активного скина)
 * - Игровой HUD, экраны паузы, падения, финиша и лидерборда
 */
export class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.thumbCache = {};
    this.weaponIconCache = {};

    this.screenMenu = document.getElementById('screen-menu');
    this.screenPause = document.getElementById('screen-pause');
    this.screenDead = document.getElementById('screen-dead');
    this.screenFinish = document.getElementById('screen-finish');
    this.screenLeaderboard = document.getElementById('screen-leaderboard');
    this.screenArmory = document.getElementById('screen-armory');

    this.hud = document.getElementById('hud');
    this.crosshair = document.getElementById('crosshair');
    this.mobileControls = document.getElementById('mobile-controls');
    this.desktopHint = document.getElementById('desktop-hint');
    this.toastBanner = document.getElementById('toast-banner');

    this.hudLevelName = document.getElementById('hud-level-name');
    this.hudCheckpoint = document.getElementById('hud-checkpoint');
    this.hudGhostStatus = document.getElementById('hud-ghost-status');
    this.hudTimer = document.getElementById('hud-timer');
    this.hudBest = document.getElementById('hud-best');

    this.levelListEl = document.getElementById('level-list');
    this.menuCoinsEl = document.getElementById('menu-coins');
    this.armoryCoinsEl = document.getElementById('armory-coins');
    this.armoryListEl = document.getElementById('armory-list');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');

    this.deadReasonEl = document.getElementById('dead-reason');
    this.btnDeadCheckpoint = document.getElementById('btn-dead-checkpoint');
    this.finishLevelTitle = document.getElementById('finish-level-title');
    this.finishTimeEl = document.getElementById('finish-time');
    this.finishBestEl = document.getElementById('finish-best');
    this.finishRewardEl = document.getElementById('finish-reward');
    this.btnFinishDouble = document.getElementById('btn-finish-double');

    this.leaderboardEntriesEl = document.getElementById('leaderboard-entries');

    this._toastTimeout = null;
    this._bindButtons();
  }

  _bindButtons() {
    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.callbacks.onPlayClicked?.();
    });

    document.getElementById('btn-armory')?.addEventListener('click', () => {
      this.callbacks.onArmoryClicked?.();
    });

    document.getElementById('btn-armory-close')?.addEventListener('click', () => {
      this.screenArmory?.classList.remove('active');
    });

    document.getElementById('btn-armory-free-coins')?.addEventListener('click', () => {
      this.callbacks.onFreeCoinsRewarded?.();
    });

    document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
      this.callbacks.onLeaderboardClicked?.();
    });

    this.btnSoundToggle?.addEventListener('click', () => {
      this.callbacks.onSoundToggleClicked?.();
    });

    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.callbacks.onResumeClicked?.();
    });

    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      this.callbacks.onRestartClicked?.();
    });

    document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
      this.callbacks.onMenuClicked?.();
    });

    this.btnDeadCheckpoint?.addEventListener('click', () => {
      this.callbacks.onContinueCheckpointRewarded?.();
    });

    document.getElementById('btn-dead-restart')?.addEventListener('click', () => {
      this.callbacks.onRestartClicked?.();
    });

    document.getElementById('btn-dead-menu')?.addEventListener('click', () => {
      this.callbacks.onMenuClicked?.();
    });

    this.btnFinishDouble?.addEventListener('click', () => {
      this.callbacks.onDoubleRewardClicked?.();
    });

    document.getElementById('btn-finish-next')?.addEventListener('click', () => {
      this.callbacks.onNextLevelClicked?.();
    });

    document.getElementById('btn-finish-replay')?.addEventListener('click', () => {
      this.callbacks.onRestartClicked?.();
    });

    document.getElementById('btn-finish-menu')?.addEventListener('click', () => {
      this.callbacks.onMenuClicked?.();
    });

    document.getElementById('btn-lb-close')?.addEventListener('click', () => {
      this.screenLeaderboard.classList.remove('active');
    });
  }

  formatTime(ms) {
    if (ms === undefined || ms === null || !Number.isFinite(ms)) {
      return '--:--.--';
    }
    const totalSeconds = ms / 1000;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((ms % 1000) / 10);

    const mStr = String(mins).padStart(2, '0');
    const sStr = String(secs).padStart(2, '0');
    const hStr = String(hundredths).padStart(2, '0');
    return `${mStr}:${sStr}.${hStr}`;
  }

  renderLevelSelector(levels, selectedIndex, bestTimes, onSelectLevel) {
    if (!this.levelListEl) return;
    this.levelListEl.innerHTML = '';

    levels.forEach((lvl, idx) => {
      const btn = document.createElement('button');
      btn.className = `lvl-card ${idx === selectedIndex ? 'selected' : ''}`;
      const bestMs = bestTimes[lvl.id];
      const timeText = bestMs ? `⚡ Рекорд: ${this.formatTime(bestMs)}` : '★ Новая карта';

      const thumbType = lvl.biomeThumb || 'garden';
      if (!this.thumbCache[thumbType]) {
        this.thumbCache[thumbType] = generateBiomeThumbnailDataURL(thumbType);
      }

      btn.innerHTML = `
        <img class="lvl-thumb" src="${this.thumbCache[thumbType]}" alt="${lvl.name}" />
        <div class="lvl-info">
          <div class="lvl-title">${lvl.name}</div>
          <div class="lvl-desc">${lvl.subtitle || 'Воксельная трасса'}</div>
          <span class="lvl-time">${timeText}</span>
        </div>
      `;
      btn.addEventListener('click', () => onSelectLevel(idx));
      this.levelListEl.appendChild(btn);
    });
  }

  /**
   * Рендерит магазин и инвентарь 3D-ножей CS2
   */
  showArmoryModal(coins, unlockedSkins, equippedSkin, onSelectOrBuySkin) {
    if (!this.armoryListEl) return;
    if (this.armoryCoinsEl) this.armoryCoinsEl.textContent = String(coins);
    this.armoryListEl.innerHTML = '';

    WEAPON_SKINS.forEach((skin) => {
      const isOwned = unlockedSkins.includes(skin.id) || skin.price === 0;
      const isEquipped = equippedSkin === skin.id;

      if (!this.weaponIconCache[skin.id]) {
        this.weaponIconCache[skin.id] = generateWeaponIconDataURL(skin);
      }

      const card = document.createElement('button');
      card.className = `lvl-card ${isEquipped ? 'selected' : ''}`;

      let statusHTML = '';
      if (isEquipped) {
        statusHTML = `<span class="lvl-time" style="color:#4ade80;">✔ В РУКАХ</span>`;
      } else if (isOwned) {
        statusHTML = `<span class="lvl-time" style="color:#38bdf8;">ВЗЯТЬ В РУКИ</span>`;
      } else if (skin.isRewardedUnlock) {
        statusHTML = `<span class="lvl-time" style="color:#fde047;">🎬 ${skin.price} 💎 или Реклама</span>`;
      } else {
        statusHTML = `<span class="lvl-time" style="color:#fde047;">Купить за ${skin.price} 💎</span>`;
      }

      card.innerHTML = `
        <img class="lvl-thumb" src="${this.weaponIconCache[skin.id]}" alt="${skin.name}" />
        <div class="lvl-info">
          <div class="lvl-title">${skin.name}</div>
          <div class="lvl-desc" style="color:${skin.color}; font-weight:800;">${skin.rarity}</div>
          ${statusHTML}
        </div>
      `;

      card.addEventListener('click', () => onSelectOrBuySkin(skin));
      this.armoryListEl.appendChild(card);
    });

    this.screenArmory?.classList.add('active');
  }

  updateCoins(coins) {
    if (this.menuCoinsEl) this.menuCoinsEl.textContent = String(coins);
    if (this.armoryCoinsEl) this.armoryCoinsEl.textContent = String(coins);
  }

  updateSoundButton(enabled) {
    if (this.btnSoundToggle) {
      this.btnSoundToggle.textContent = enabled ? '🔊 Звук: ВКЛ' : '🔇 Звук: ВЫКЛ';
    }
  }

  showState(state, isMobile = false) {
    this.screenMenu.classList.remove('active');
    this.screenPause.classList.remove('active');
    this.screenDead.classList.remove('active');
    this.screenFinish.classList.remove('active');
    this.screenLeaderboard.classList.remove('active');
    this.screenArmory?.classList.remove('active');

    const isPlaying = state === 'playing';
    this.hud.style.display = isPlaying ? 'block' : 'none';
    this.crosshair.style.display = isPlaying ? 'block' : 'none';
    this.mobileControls.style.display = isPlaying && isMobile ? 'block' : 'none';
    if (this.desktopHint) {
      this.desktopHint.style.display = isMobile ? 'none' : 'flex';
    }

    if (state === 'menu') {
      this.screenMenu.classList.add('active');
    } else if (state === 'paused') {
      this.screenPause.classList.add('active');
    } else if (state === 'dead') {
      this.screenDead.classList.add('active');
    } else if (state === 'finished') {
      this.screenFinish.classList.add('active');
    }
  }

  updateHUD(timeMs, bestMs, levelName, checkpointIndex, ghostCount) {
    if (this.hudTimer) this.hudTimer.textContent = this.formatTime(timeMs);
    if (this.hudBest) this.hudBest.textContent = `Рекорд: ${this.formatTime(bestMs)}`;
    if (this.hudLevelName && levelName) this.hudLevelName.textContent = levelName;
    if (this.hudCheckpoint) {
      this.hudCheckpoint.textContent =
        checkpointIndex > 0 ? `Чекпоинт: #${checkpointIndex}` : 'Чекпоинт: Старт';
    }
    if (this.hudGhostStatus) {
      this.hudGhostStatus.textContent =
        ghostCount > 0 ? `👻 Призраков на карте: ${ghostCount}` : '👻 Одиночный забег';
    }
  }

  configureDeadScreen(reasonText, hasCheckpoint) {
    if (this.deadReasonEl) this.deadReasonEl.textContent = reasonText;
    if (this.btnDeadCheckpoint) {
      this.btnDeadCheckpoint.style.display = hasCheckpoint ? 'flex' : 'none';
    }
  }

  configureFinishScreen(levelName, timeMs, bestMs, rewardCoins, canDouble) {
    if (this.finishLevelTitle) this.finishLevelTitle.textContent = `${levelName} пройден!`;
    if (this.finishTimeEl) this.finishTimeEl.textContent = this.formatTime(timeMs);
    if (this.finishBestEl) this.finishBestEl.textContent = this.formatTime(bestMs);
    if (this.finishRewardEl) this.finishRewardEl.textContent = `+${rewardCoins} 💎`;
    if (this.btnFinishDouble) {
      this.btnFinishDouble.style.display = canDouble ? 'flex' : 'none';
    }
  }

  showToast(message) {
    if (!this.toastBanner) return;
    this.toastBanner.textContent = message;
    this.toastBanner.classList.add('visible');

    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      this.toastBanner.classList.remove('visible');
    }, 1800);
  }

  showLeaderboardModal(entries) {
    if (!this.leaderboardEntriesEl) return;
    this.leaderboardEntriesEl.innerHTML = '';

    if (!entries || entries.length === 0) {
      this.leaderboardEntriesEl.innerHTML = '<div style="padding:12px;text-align:center;">Записей пока нет</div>';
    } else {
      entries.forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'lb-row';
        row.innerHTML = `
          <span class="lb-rank">#${entry.rank}</span>
          <span class="lb-name">${entry.name}</span>
          <span class="lb-score">${this.formatTime(entry.score)}</span>
        `;
        this.leaderboardEntriesEl.appendChild(row);
      });
    }

    this.screenLeaderboard.classList.add('active');
  }
}
