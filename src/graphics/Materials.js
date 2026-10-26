import * as THREE from 'three';
import {
  createGrassTexture,
  createGrassSideTexture,
  createDirtTexture,
  createPlanksTexture,
  createBirchPlanksTexture,
  createStoneBricksTexture,
  createStoneTexture,
  createEmeraldBlockTexture,
  createGoldBlockTexture,
  createGlowstoneTexture,
  createYellowWoolTexture,
  createRedWoolTexture,
  createOrangeTerracottaTexture,
  createSandTexture,
  createHayBaleTexture,
  createPrismarineTexture,
  createBambooTexture,
  createOakLogTexture,
  createBirchLogTexture,
  createLeavesTexture,
  createIceTexture,
  createLavaTexture,
  createCheckpointTexture,
  createFinishTexture,
  createSkyPanoramaTexture
} from './Textures.js';
import { WaterShader } from './Shaders.js';

/**
 * Менеджер материалов с поддержкой всех блоков из 5 новых референсов:
 * - Изумрудный блок, Золотой блок, Светокамень, Жёлтая/Красная шерсть, Оранжевая терракота,
 *   Каменные кирпичи, Берёзовые/Акациевые доски, Сноп сена, Призмарин, Бамбук.
 */
export class Materials {
  constructor() {
    this.grassTopTex = createGrassTexture(16);
    this.grassSideTex = createGrassSideTexture(16);
    this.dirtTex = createDirtTexture(16);
    this.planksTex = createPlanksTexture(16);
    this.birchPlanksTex = createBirchPlanksTexture(16);
    this.stoneBricksTex = createStoneBricksTexture(16);
    this.stoneTex = createStoneTexture(16);
    this.emeraldTex = createEmeraldBlockTexture(16);
    this.goldTex = createGoldBlockTexture(16);
    this.glowstoneTex = createGlowstoneTexture(16);
    this.yellowWoolTex = createYellowWoolTexture(16);
    this.redWoolTex = createRedWoolTexture(16);
    this.terracottaTex = createOrangeTerracottaTexture(16);
    this.sandTex = createSandTexture(16);
    this.hayTex = createHayBaleTexture(16);
    this.prismarineTex = createPrismarineTexture(16);
    this.bambooTex = createBambooTexture(16);
    this.oakLogTex = createOakLogTexture(16);
    this.birchLogTex = createBirchLogTexture(16);
    this.leavesTex = createLeavesTexture(16);
    this.iceTex = createIceTexture(16);
    this.lavaTex = createLavaTexture(16);
    this.checkpointTex = createCheckpointTexture(16);
    this.finishTex = createFinishTexture(16);
    this.skyPanoramaTex = createSkyPanoramaTexture();

    const grassSideMat = new THREE.MeshStandardMaterial({ map: this.grassSideTex, roughness: 0.8 });
    const grassTopMat = new THREE.MeshStandardMaterial({ map: this.grassTopTex, roughness: 0.78 });
    const dirtMat = new THREE.MeshStandardMaterial({ map: this.dirtTex, roughness: 0.9 });

    this.grassMaterial = [grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat];
    this.dirtMaterial = dirtMat;

    this.planksMaterial = new THREE.MeshStandardMaterial({ map: this.planksTex, roughness: 0.7 });
    this.birchPlanksMaterial = new THREE.MeshStandardMaterial({ map: this.birchPlanksTex, roughness: 0.7 });
    this.stoneBricksMaterial = new THREE.MeshStandardMaterial({ map: this.stoneBricksTex, roughness: 0.8 });
    this.stoneMaterial = new THREE.MeshStandardMaterial({ map: this.stoneTex, roughness: 0.85 });

    // Блестящие ювелирные блоки (Изумруд и Золото с лёгким глянцевым бликом как в шейдерах реф 3 и 4)
    this.emeraldMaterial = new THREE.MeshStandardMaterial({
      map: this.emeraldTex,
      roughness: 0.28,
      metalness: 0.25,
      emissive: new THREE.Color(0x059669),
      emissiveIntensity: 0.15
    });

    this.goldMaterial = new THREE.MeshStandardMaterial({
      map: this.goldTex,
      roughness: 0.25,
      metalness: 0.45,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.12
    });

    this.glowstoneMaterial = new THREE.MeshStandardMaterial({
      map: this.glowstoneTex,
      emissive: new THREE.Color(0xfacc15),
      emissiveMap: this.glowstoneTex,
      emissiveIntensity: 0.95,
      roughness: 0.4
    });

    this.yellowWoolMaterial = new THREE.MeshStandardMaterial({ map: this.yellowWoolTex, roughness: 0.85 });
    this.redWoolMaterial = new THREE.MeshStandardMaterial({ map: this.redWoolTex, roughness: 0.85 });
    this.terracottaMaterial = new THREE.MeshStandardMaterial({ map: this.terracottaTex, roughness: 0.82 });
    this.sandMaterial = new THREE.MeshStandardMaterial({ map: this.sandTex, roughness: 0.85 });
    this.hayMaterial = new THREE.MeshStandardMaterial({ map: this.hayTex, roughness: 0.8 });
    this.prismarineMaterial = new THREE.MeshStandardMaterial({ map: this.prismarineTex, roughness: 0.75 });
    this.bambooMaterial = new THREE.MeshStandardMaterial({ map: this.bambooTex, roughness: 0.65 });

    this.oakLogMaterial = new THREE.MeshStandardMaterial({ map: this.oakLogTex, roughness: 0.85 });
    this.birchLogMaterial = new THREE.MeshStandardMaterial({ map: this.birchLogTex, roughness: 0.8 });
    this.leavesMaterial = new THREE.MeshStandardMaterial({ map: this.leavesTex, roughness: 0.75 });
    this.iceMaterial = new THREE.MeshStandardMaterial({ map: this.iceTex, roughness: 0.22, metalness: 0.15 });

    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(WaterShader.uniforms),
      vertexShader: WaterShader.vertexShader,
      fragmentShader: WaterShader.fragmentShader,
      transparent: true
    });

    this.lavaMaterial = new THREE.MeshStandardMaterial({
      map: this.lavaTex,
      emissive: new THREE.Color(0xff4800),
      emissiveMap: this.lavaTex,
      emissiveIntensity: 1.25,
      roughness: 0.4
    });

    this.checkpointMaterial = new THREE.MeshStandardMaterial({
      map: this.checkpointTex,
      emissive: new THREE.Color(0x22c55e),
      emissiveIntensity: 0.8,
      roughness: 0.3
    });

    this.checkpointActiveMaterial = new THREE.MeshStandardMaterial({
      map: this.checkpointTex,
      color: new THREE.Color(0x86efac),
      emissive: new THREE.Color(0x4ade80),
      emissiveIntensity: 1.4,
      roughness: 0.2
    });

    this.finishMaterial = new THREE.MeshStandardMaterial({
      map: this.finishTex,
      emissive: new THREE.Color(0xf59e0b),
      emissiveMap: this.finishTex,
      emissiveIntensity: 1.15,
      roughness: 0.25
    });
  }

  getMaterial(type) {
    switch (type) {
      case 'grass': return this.grassMaterial;
      case 'dirt': return this.dirtMaterial;
      case 'planks':
      case 'decor': return this.planksMaterial;
      case 'birch_planks': return this.birchPlanksMaterial;
      case 'stone_bricks': return this.stoneBricksMaterial;
      case 'stone': return this.stoneMaterial;
      case 'emerald': return this.emeraldMaterial;
      case 'gold': return this.goldMaterial;
      case 'glowstone':
      case 'lamp': return this.glowstoneMaterial;
      case 'yellow_wool': return this.yellowWoolMaterial;
      case 'red_wool': return this.redWoolMaterial;
      case 'terracotta': return this.terracottaMaterial;
      case 'sand': return this.sandMaterial;
      case 'hay': return this.hayMaterial;
      case 'prismarine': return this.prismarineMaterial;
      case 'bamboo': return this.bambooMaterial;
      case 'oak_log': return this.oakLogMaterial;
      case 'birch_log': return this.birchLogMaterial;
      case 'leaves': return this.leavesMaterial;
      case 'ice': return this.iceMaterial;
      case 'lava': return this.lavaMaterial;
      case 'checkpoint': return this.checkpointMaterial;
      case 'finish': return this.finishMaterial;
      default: return this.grassMaterial;
    }
  }

  update(delta, elapsedTime) {
    if (this.waterMaterial?.uniforms?.uTime) {
      this.waterMaterial.uniforms.uTime.value = elapsedTime;
    }
    this.lavaTex.offset.x = (this.lavaTex.offset.x + delta * 0.16) % 1;
    this.lavaTex.offset.y = (this.lavaTex.offset.y + delta * 0.12) % 1;
    this.checkpointMaterial.emissiveIntensity = 0.65 + Math.sin(elapsedTime * 4.0) * 0.25;
  }
}
