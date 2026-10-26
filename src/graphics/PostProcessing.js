import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ColorGradeShader } from './Shaders.js';

/**
 * Постобработка сцены:
 * RenderPass -> UnrealBloomPass (мягкое свечение лавы, чекпоинтов и финиша) -> ShaderPass (цветокоррекция).
 * На мобильных устройствах пропускает тяжёлый Bloom или снижает разрешение буфера для стабильных 60 FPS.
 */
export class PostProcessing {
  constructor(renderer, scene, camera, isMobile = false) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.isMobile = isMobile;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // На десктопе включаем UnrealBloomPass для приятного свечения эмиссивных блоков
    if (!this.isMobile) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.42, // strength (0.3–0.6)
        0.4,  // radius
        0.85  // threshold
      );
      this.composer.addPass(this.bloomPass);
    }

    // Шейдер насыщенности (+22%) и контраста
    this.colorPass = new ShaderPass(ColorGradeShader);
    this.composer.addPass(this.colorPass);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  render() {
    this.composer.render();
  }
}
