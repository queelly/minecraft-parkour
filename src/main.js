import * as THREE from 'three';
import { Materials } from './graphics/Materials.js';
import { PostProcessing } from './graphics/PostProcessing.js';
import { WeaponViewModel } from './graphics/WeaponViewModel.js';
import { Level } from './level/Level.js';
import { Physics } from './core/Physics.js';
import { Input } from './core/Input.js';
import { Player } from './core/Player.js';
import { Game } from './core/Game.js';
import { UIManager } from './ui/UIManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { YandexSDK } from './platform/YandexSDK.js';
import { GhostRecorder } from './multiplayer/GhostRecorder.js';
import { GhostPlayer } from './multiplayer/GhostPlayer.js';

/**
 * Точка входа в приложение.
 * Настраивает солнечное шейдерное освещение (4K 60FPS BSL Shader style),
 * мягкие тени, туман горизонта и отдельный проход рендеринга 3D-ножей CS2 в руках игрока.
 */
async function bootstrap() {
  const container = document.getElementById('game-container');
  const input = new Input();
  const isMobile = input.isMobile;

  // 1. Создание сцены, панорамного неба с облаками и чистого солнечного горизонта
  const scene = new THREE.Scene();
  const materials = new Materials();
  scene.background = materials.skyPanoramaTex;
  scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0048);

  // 2. Камера от первого лица (FOV 75)
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    260
  );
  scene.add(camera);

  // 3. WebGLRenderer с сочной цветопередачей ACESFilmicToneMapping
  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2.0));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  container.appendChild(renderer.domElement);

  // 4. Яркое солнечное освещение в стиле шейдеров из референсов 3, 4 и 5
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 0.9);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
  dirLight.position.set(35, 68, 25);
  dirLight.castShadow = true;

  const shadowMapRes = isMobile ? 1024 : 2048;
  dirLight.shadow.mapSize.width = shadowMapRes;
  dirLight.shadow.mapSize.height = shadowMapRes;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 210;
  const d = 85;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // 5. Инициализация модулей графики, 3D-ножей CS2, физики, звука и мультиплеера
  const postProcessing = new PostProcessing(renderer, scene, camera, isMobile);
  const weaponViewModel = new WeaponViewModel();
  const physics = new Physics();
  const level = new Level(scene, materials, physics);
  const audio = new AudioManager();
  const player = new Player(camera, renderer.domElement, physics, audio, weaponViewModel);
  const ghostRecorder = new GhostRecorder();
  const ghostPlayer = new GhostPlayer(scene);

  renderer.domElement.addEventListener('click', () => {
    if (game.state === 'playing') {
      player.lockPointer(isMobile);
    }
  });

  // 6. Инициализация YandexSDK
  let game = null;
  const yandexSDK = new YandexSDK(
    () => {
      audio.setPlatformMute(true);
      if (game && game.state === 'playing') {
        game.pauseGame();
      }
    },
    () => {
      audio.setPlatformMute(false);
    }
  );

  game = new Game({
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
  });

  const ui = new UIManager({
    onPlayClicked: () => game.startLevel(true),
    onArmoryClicked: () => game.openArmory(),
    onFreeCoinsRewarded: () => game.claimFreeArmoryCoins(),
    onResumeClicked: () => game.resumeGame(),
    onRestartClicked: () => game.restartLevel(),
    onMenuClicked: () => game.goToMainMenu(),
    onContinueCheckpointRewarded: () => game.continueFromCheckpointWithReward(),
    onDoubleRewardClicked: () => game.doubleFinishReward(),
    onNextLevelClicked: () => game.nextLevel(),
    onSoundToggleClicked: async () => {
      const enabled = audio.toggleSound();
      game.saveData.soundEnabled = enabled;
      ui.updateSoundButton(enabled);
      await yandexSDK.saveProgress(game.saveData);
    },
    onLeaderboardClicked: async () => {
      audio.playClick();
      const entries = await yandexSDK.getLeaderboard();
      ui.showLeaderboardModal(entries);
    }
  });

  game.attachUI(ui);

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    postProcessing.setSize(w, h);
    weaponViewModel.onResize(w, h);
  });

  await yandexSDK.init();
  await game.initProgress();

  // 9. Главный игровой цикл
  const clock = new THREE.Clock();
  let elapsedTime = 0;

  function animate() {
    requestAnimationFrame(animate);

    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, 0.05);
    elapsedTime += delta;

    const maxSubStep = 1 / 60;
    let remaining = delta;
    while (remaining > 0.0001) {
      const step = Math.min(remaining, maxSubStep);
      game.update(step, elapsedTime);
      remaining -= step;
      if (game.state !== 'playing') break;
    }

    // Рендерим мир с шейдерной постобработкой
    postProcessing.render();

    // Во время активного забега рендерим поверх экрана 3D-модель выбранного ножа CS2 в руке игрока!
    if (game.state === 'playing') {
      weaponViewModel.render(renderer);
    }
  }

  animate();
}

bootstrap();
