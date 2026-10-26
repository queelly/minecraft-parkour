import * as THREE from 'three';

/**
 * Шейдеры в эстетике Minecraft BSL Shaders:
 * 1) WaterShader — анимированная зеркальная речная вода с бликами солнца, волнами и эффектом Френеля (как на референсе 1 и 2).
 * 2) ColorGradeShader — тёплая солнечная цветокоррекция (Vibrant Golden-Hour Shader).
 */

export const WaterShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.45, 0.78, 0.42).normalize() },
    uSkyColor: { value: new THREE.Color(0x7cc4ff) },
    uDeepColor: { value: new THREE.Color(0x0f3d6e) },
    uShallowColor: { value: new THREE.Color(0x1f7a9c) }
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    varying float vWaveHeight;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);

      // Мягкая рябь на поверхности реки
      float wave = sin(worldPosition.x * 1.4 + uTime * 2.2) * 0.035
                 + cos(worldPosition.z * 1.1 - uTime * 1.8) * 0.035;
      worldPosition.y += wave;
      vWaveHeight = wave;
      vWorldPos = worldPosition.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSkyColor;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;

    varying vec3 vWorldPos;
    varying vec2 vUv;
    varying float vWaveHeight;

    void main() {
      // Процедурная микро-нормаль волн для солнечной дорожки и отражений неба
      float nx = cos(vWorldPos.x * 2.6 + uTime * 2.8) * 0.14
               + sin(vWorldPos.z * 3.1 - uTime * 2.1) * 0.08;
      float nz = sin(vWorldPos.z * 2.4 + uTime * 2.3) * 0.14
               + cos(vWorldPos.x * 2.9 + uTime * 1.9) * 0.08;
      vec3 normal = normalize(vec3(nx, 1.0, nz));

      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.6);

      // Перелив глубины и отражения неба/облаков
      vec3 waterBase = mix(uDeepColor, uShallowColor, 0.5 + vWaveHeight * 6.0);
      vec3 reflectedSky = mix(uSkyColor, vec3(0.96, 0.94, 0.98), clamp(normal.x * 2.0 + 0.3, 0.0, 1.0));
      vec3 color = mix(waterBase, reflectedSky, clamp(fresnel * 0.82 + 0.18, 0.0, 0.92));

      // Солнечные блики (Specular highlight)
      vec3 halfVec = normalize(uSunDir + viewDir);
      float spec = pow(max(dot(normal, halfVec), 0.0), 48.0);
      color += vec3(1.0, 0.95, 0.82) * spec * 0.95;

      gl_FragColor = vec4(color, 0.86);
    }
  `
};

export const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.24 },
    contrast: { value: 1.08 },
    warmth: { value: 0.035 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float warmth;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      // Тёплый солнечный оттенок как в BSL Shaders
      color.r += warmth;
      color.g += warmth * 0.45;

      // Мягкий контраст
      color = (color - 0.5) * contrast + 0.5;

      // Сочная насыщенность
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, saturation);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
    }
  `
};
