import gsap from 'gsap';
import {
  FULLSCREEN_VERT_GLSL,
  GLSL_OPTICAL_COMMON,
  createWebGL2Context,
  createProgram,
  getUniformLocations,
  createFullscreenVAO,
  drawFullscreenTriangle,
  createSolidTexture,
  loadImageDecoded,
  createTextureFromImage,
  resizeCanvasToDisplaySize,
  drawImageCover2D,
} from '../webgl/glUtils.js';
import {
  AudioMetrics,
  DesignMatrixConfig,
  DigitalSunConfig,
  FitMode,
  StageVisualMode,
} from '../types/matrix';

const MATRIX_FRAG_GLSL = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uAspectA;
uniform float uAspectB;
uniform float uCanvasAspect;
uniform float uProg;
uniform float uDpr;
uniform float uHasTex;
uniform float uTime;
uniform int uMode;
uniform float uFlipDir; // 1.0 = forward right-to-left, -1.0 = backward left-to-right
uniform float uFitMode;
uniform float uKenBurns;
uniform float uLensStrength;
uniform vec2 uMouse;
uniform float uBass;
uniform float uMids;
uniform float uTreble;
uniform vec3 uBgColor;

// Interactive Draggable & Foldable Page Curl uniforms
uniform float uFoldAnchorY;
uniform float uFoldCornerBias;
uniform float uFoldBend;

// Deeper Design Matrix uniforms
uniform float uSymmetryOrder;
uniform float uRefraction;
uniform float uFractalLattice;

// Photo Styles & Emergence Modes
uniform int uPhotoStyle;
uniform int uEmergenceMode;

// Digital Sun Sovereign Fractal Core & Supernova Shockwave uniforms
uniform int uStageMode; // 0 = slides, 1 = hybrid, 2 = pure digital sun
uniform float uSunDepth;
uniform float uSunArms;
uniform float uSunSpeed;
uniform float uSunBlend;
uniform vec2 uShockwave;
uniform float uShockwaveAge;

#define PI 3.14159265359

${GLSL_OPTICAL_COMMON}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbmNoise(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * valueNoise(p);
    p *= 2.04;
    amp *= 0.5;
  }
  return v;
}

vec2 applyDihedralSymmetry(vec2 uv, float order) {
  if (order < 1.5) return uv;
  vec2 c = (uv - 0.5) * vec2(uCanvasAspect, 1.0);
  float r = length(c);
  float a = atan(c.y, c.x);
  float sector = (2.0 * PI) / order;
  a = mod(a, sector);
  a = abs(a - sector * 0.5);
  vec2 sym = vec2(cos(a), sin(a)) * r;
  return clamp(sym / vec2(uCanvasAspect, 1.0) + 0.5, 0.001, 0.999);
}

vec2 computeFitUV(vec2 topDownUv, float texAspect, float canvasAspect, float fitMode) {
  float safeTex = max(texAspect, 1e-4);
  float safeCanvas = max(canvasAspect, 1e-4);
  if (fitMode < 0.5) {
    vec2 scale = (safeCanvas > safeTex)
      ? vec2(1.0, safeTex / safeCanvas)
      : vec2(safeCanvas / safeTex, 1.0);
    return (topDownUv - 0.5) * scale + 0.5;
  } else {
    vec2 scale = (safeCanvas > safeTex)
      ? vec2(safeCanvas / safeTex, 1.0)
      : vec2(1.0, safeTex / safeCanvas);
    return (topDownUv - 0.5) * scale + 0.5;
  }
}

vec4 sampleFitted(sampler2D tex, vec2 uv, float texAspect, float canvasAspect, float fitMode) {
  vec2 fuv = computeFitUV(uv, texAspect, canvasAspect, fitMode);
  if (fitMode >= 0.5) {
    if (fuv.x < 0.0 || fuv.x > 1.0 || fuv.y < 0.0 || fuv.y > 1.0) {
      return vec4(uBgColor, 1.0);
    }
  }
  return texture(tex, clamp(fuv, 0.001, 0.999));
}

vec3 sampleBlur5Tap(
  sampler2D tex,
  vec2 baseUv,
  float texAspect,
  float canvasAspect,
  float fitMode,
  vec2 stepVec
) {
  vec3 c0 = sampleFitted(tex, baseUv - stepVec * 2.0, texAspect, canvasAspect, fitMode).rgb;
  vec3 c1 = sampleFitted(tex, baseUv - stepVec * 1.0, texAspect, canvasAspect, fitMode).rgb;
  vec3 c2 = sampleFitted(tex, baseUv,                 texAspect, canvasAspect, fitMode).rgb;
  vec3 c3 = sampleFitted(tex, baseUv + stepVec * 1.0, texAspect, canvasAspect, fitMode).rgb;
  vec3 c4 = sampleFitted(tex, baseUv + stepVec * 2.0, texAspect, canvasAspect, fitMode).rgb;
  return c0 * 0.10 + c1 * 0.22 + c2 * 0.36 + c3 * 0.22 + c4 * 0.10;
}

vec2 complexMul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float getFractalDensity(vec2 p, float rot, float arms, float maxDepth) {
  float accum = 0.0;
  float scale = 1.0;
  vec2 z = p;

  float c = cos(rot);
  float s = sin(rot);
  mat2 rotMat = mat2(c, -s, s, c);
  z = rotMat * z;

  for (int i = 0; i < 10; i++) {
    if (float(i) >= maxDepth) break;
    float angle = atan(z.y, z.x);
    float radius = length(z);
    angle = mod(angle + PI / arms, 2.0 * PI / arms) - PI / arms;
    z = vec2(cos(angle), sin(angle)) * radius;

    z = abs(z) - vec2(0.32, 0.14) * (1.0 + uBass * 0.28);
    z = complexMul(z, z) - vec2(0.38, 0.12);

    accum += sin(z.x * 4.0 + uTime * 0.4) * cos(z.y * 4.0 - uTime * 0.25) / scale;
    scale *= 1.4;
  }
  return abs(accum);
}

vec3 evalDigitalSun(vec2 uv) {
  vec2 st = (uv - 0.5) * vec2(uCanvasAspect, 1.0) * 1.45;
  vec2 mouseOffset = (uMouse - 0.5) * 0.25;
  st += mouseOffset;

  float t = uTime * 0.14 * uSunSpeed;
  float r = length(st);
  float coreGlow = 0.075 / (r + 0.04 + uBass * 0.15);
  float depthParam = clamp(uSunDepth, 2.0, 10.0);
  float fractalPattern = getFractalDensity(st, t * 0.42, max(uSunArms, 1.0), depthParam);
  float dust = smoothstep(0.7, 1.0, fract(sin(dot(st * max(r, 0.01), vec2(12.9898, 78.233))) * 43758.5453));

  vec3 colTeal = vec3(0.01, 0.1, 0.22);
  vec3 colOrange = vec3(0.92, 0.52, 0.12);
  vec3 colCore = vec3(1.0, 0.88, 0.55);

  vec3 color = mix(colTeal, colOrange, clamp(fractalPattern * 1.35 + r * 0.4, 0.0, 1.0));
  color += colCore * coreGlow * (1.0 + uBass * 1.4);
  color += vec3(0.6, 0.85, 1.0) * dust * (0.25 + uBass * 0.6);
  float vignette = 1.0 - r * 0.55;
  return color * clamp(vignette, 0.0, 1.0);
}

vec3 applyPhotoStyle(vec3 col, vec2 uv, int style) {
  if (style == 0) return col;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  if (style == 1) {
    float g = (hash21(floor(uv * 900.0) + fract(uTime) * 17.0) - 0.5) * 0.055;
    float s = smoothstep(0.03, 0.97, lum);
    return clamp(mix(vec3(0.05, 0.055, 0.06), vec3(0.97, 0.96, 0.94), s) + g, 0.0, 1.0);
  } else if (style == 2) {
    vec3 warmHi = vec3(1.08, 0.97, 0.86);
    vec3 coolSh = vec3(0.03, 0.09, 0.12);
    vec3 graded = mix(col, col * warmHi + coolSh * (1.0 - lum), 0.72);
    return pow(clamp(graded, 0.0, 1.0), vec3(1.08));
  } else if (style == 3) {
    float c = smoothstep(0.05, 0.95, lum);
    return mix(vec3(0.03, 0.11, 0.28), vec3(0.89, 0.95, 1.0), c);
  } else if (style == 4) {
    vec3 sat = mix(vec3(lum), col, 1.48);
    return smoothstep(vec3(0.03), vec3(0.96), clamp(sat, 0.0, 1.0));
  } else if (style == 5) {
    vec3 ir = vec3(
      clamp(col.g * 1.25 + col.r * 0.35, 0.0, 1.0),
      clamp(col.b * 0.75 + lum * 0.25, 0.0, 1.0),
      clamp(col.r * 0.65 + col.b * 0.35, 0.0, 1.0)
    );
    return mix(vec3(lum * 0.4), ir, 0.88);
  } else if (style == 6) {
    float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.65;
    vec3 sep = vec3(lum * 1.15, lum * 0.95, lum * 0.72);
    return clamp(sep * vig, 0.0, 1.0);
  } else if (style == 7) {
    float metallic = sin(lum * PI * 1.15) * 0.12 + smoothstep(0.05, 0.95, lum);
    vec3 chrome = mix(vec3(0.06, 0.08, 0.16), vec3(0.84, 0.92, 1.0), metallic);
    return mix(col * 0.5 + chrome * 0.55, chrome, 0.45);
  } else {
    vec3 halo = vec3(1.0, 0.84, 0.52) * pow(lum, 2.2) * 0.35;
    return clamp(col * vec3(1.04, 1.0, 0.94) + halo, 0.0, 1.0);
  }
}

void main() {
  vec2 rawUv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 uv = applyDihedralSymmetry(rawUv, uSymmetryOrder);
  vec3 slideCol = uBgColor;

  if (uStageMode != 2 && uHasTex >= 0.5) {
    float kbZoom = 1.0 - (uKenBurns * (0.028 * (0.5 + 0.5 * sin(uTime * 0.35))) + uBass * 0.025);
    vec2 kbPan = vec2(sin(uTime * 0.22), cos(uTime * 0.18)) * (0.012 * uKenBurns);

    vec2 mDelta = uv - uMouse;
    float mDist = length(mDelta);
    vec2 pointerWarp = mDelta * (0.045 * uLensStrength * exp(-mDist * mDist * 14.0));

    vec2 emergeWarp = vec2(0.0);
    if (uEmergenceMode == 2) {
      float wave = sin(mDist * 28.0 - uTime * 4.2) * exp(-mDist * 4.5);
      emergeWarp = normalize(mDelta + 1e-4) * wave * 0.016;
    }

    vec2 sDelta = uv - uShockwave;
    float sDist = length(vec2(sDelta.x * uCanvasAspect, sDelta.y));
    float sRing = exp(-pow(abs(sDist - uShockwaveAge * 0.95) * 18.0, 2.0)) * max(0.0, 1.0 - uShockwaveAge * 0.9);
    vec2 shockWarp = normalize(sDelta + 1e-5) * sRing * 0.026;

    vec2 restUv = 0.5 + (uv - 0.5) * kbZoom + kbPan - pointerWarp - shockWarp - emergeWarp;

    if (uProg <= 0.0005) {
      if (uEmergenceMode == 3 || uRefraction > 0.05) {
        float edgeStr = length(uv - 0.5) * (0.008 * uRefraction + (uEmergenceMode == 3 ? 0.01 : 0.0));
        float rC = sampleFitted(uTexA, restUv + vec2(edgeStr, 0.0), uAspectA, uCanvasAspect, uFitMode).r;
        float gC = sampleFitted(uTexA, restUv, uAspectA, uCanvasAspect, uFitMode).g;
        float bC = sampleFitted(uTexA, restUv - vec2(edgeStr, 0.0), uAspectA, uCanvasAspect, uFitMode).b;
        slideCol = vec3(rC, gC, bC);
      } else {
        slideCol = sampleFitted(uTexA, restUv, uAspectA, uCanvasAspect, uFitMode).rgb;
      }
    } else if (uProg >= 0.9995) {
      slideCol = sampleFitted(uTexB, restUv, uAspectB, uCanvasAspect, uFitMode).rgb;
    } else {
      float p = clamp(uProg, 0.0, 1.0);
      float env = sin(p * PI);
      vec2 delta = restUv - 0.5;

      if (uMode == 0) {
        vec2 warpedUv = 0.5 + delta * (1.0 - 0.22 * uLensStrength * env * exp(-dot(delta, delta) * 3.5));
        vec2 blurStep = vec2(0.7, 0.3) * (0.014 * env * uLensStrength);
        vec3 colA = sampleBlur5Tap(uTexA, warpedUv, uAspectA, uCanvasAspect, uFitMode, blurStep);
        vec3 colB = sampleBlur5Tap(uTexB, warpedUv, uAspectB, uCanvasAspect, uFitMode, blurStep);

        float diag = uv.x * 0.7 + uv.y * 0.3;
        float front = mix(-0.25, 1.25, p);
        float baseMix = smoothstep(front + 0.22, front - 0.22, diag);

        vec2 cellUV = fract(gl_FragCoord.xy / (13.5 * uDpr)) - 0.5;
        float sparkRadius = 1.56 * pow(max(baseMix, 0.0), 0.78);
        float sdMicro = sdGeminiSpark(cellUV, sparkRadius, 0.65);

        float halftoneMask = (baseMix <= 0.001) ? 0.0 : ((baseMix >= 0.999) ? 1.0 : smoothstep(0.065, -0.065, sdMicro));
        float mixWeight = mix(baseMix, halftoneMask, 0.88 * env);
        slideCol = mix(colA, colB, mixWeight);

        float waveActivity = 4.0 * baseMix * (1.0 - baseMix) * env;
        float edgeGlint = exp(-abs(sdMicro) / 0.085) * waveActivity;
        vec3 glintTint = mix(COL_CYAN_ICE, COL_WHITE, clamp(edgeGlint * 1.15, 0.0, 1.0));
        slideCol = mix(slideCol, glintTint, clamp(edgeGlint * 0.45 + waveActivity * 0.075, 0.0, 0.58));
      } else if (uMode == 1) {
        vec2 aspectDelta = vec2(delta.x * uCanvasAspect, delta.y);
        float irisRadius = mix(0.0, 1.95 * max(uCanvasAspect, 1.0), smoothstep(0.0, 1.0, p));
        float sd = sdGeminiSpark(aspectDelta, max(irisRadius, 0.001), 0.64);
        float maskB = smoothstep(0.035, -0.035, sd);
        vec2 uvA = 0.5 + delta * (1.0 + p * 0.14);
        vec2 uvB = 0.5 + delta * (1.12 - p * 0.12);
        vec3 colA = sampleFitted(uTexA, uvA, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, uvB, uAspectB, uCanvasAspect, uFitMode).rgb;
        slideCol = mix(colA, colB, maskB);
        float rim = exp(-abs(sd) / 0.045) * env;
        slideCol += mix(COL_CORE_BLUE, COL_CYAN_ICE, 0.6) * rim * 0.85;
      } else if (uMode == 2) {
        float waveX = sin(uv.y * 12.0 + uTime * 3.0 + p * 6.0) * 0.035 * env * uLensStrength;
        float waveY = cos(uv.x * 10.0 - uTime * 2.5 + p * 5.0) * 0.035 * env * uLensStrength;
        vec2 gelUvA = restUv + vec2(waveX, waveY) * p;
        vec2 gelUvB = restUv - vec2(waveX, waveY) * (1.0 - p);
        vec3 colA = sampleFitted(uTexA, gelUvA, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, gelUvB, uAspectB, uCanvasAspect, uFitMode).rgb;
        float radial = length(delta);
        float maskB = smoothstep(p * 1.4 - 0.35, p * 1.4, radial + sin(uv.x * 8.0 + uv.y * 8.0) * 0.08);
        slideCol = mix(colB, colA, maskB);
        vec3 pastelPink = vec3(0.96, 0.45, 0.71);
        vec3 pastelCyan = vec3(0.22, 0.74, 0.97);
        float rim = exp(-abs(radial - p * 0.85) * 14.0) * env;
        slideCol += mix(pastelPink, pastelCyan, 0.5 + 0.5 * sin(uv.x * 6.0 + uTime)) * rim * 0.65;
      } else if (uMode == 3) {
        vec2 z = delta * 2.1;
        float accum = 0.0;
        float scale = 1.0;
        for (int i = 0; i < 5; i++) {
          float angle = atan(z.y, z.x);
          float rad = length(z);
          angle = mod(angle + PI / 3.0 + uTime * 0.15, 2.0 * PI / 3.0) - PI / 3.0;
          z = vec2(cos(angle), sin(angle)) * rad;
          z = abs(z) - vec2(0.26, 0.14);
          z = complexMul(z, z) - vec2(0.36, 0.07);
          accum += sin(z.x * 4.5 + p * 3.0) * cos(z.y * 4.5 - p * 3.0) / scale;
          scale *= 1.28;
        }
        float pattern = clamp(abs(accum) * 0.85 + length(delta) * 0.35, 0.0, 1.0);
        float threshold = mix(-0.18, 1.18, p);
        float maskB = smoothstep(threshold + 0.14, threshold - 0.14, pattern);
        vec3 colA = sampleFitted(uTexA, restUv, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, restUv, uAspectB, uCanvasAspect, uFitMode).rgb;
        slideCol = mix(colA, colB, maskB);
        float ember = exp(-abs(pattern - threshold) * 18.0) * env;
        slideCol += vec3(1.0, 0.68, 0.22) * ember * 0.95;
      } else if (uMode == 4) {
        float split = smoothstep(0.0, 1.0, p);
        float distFromCenter = abs(uv.y - 0.5) * 2.0;
        float maskB = step(distFromCenter, split);
        vec2 uvA = 0.5 + delta * (1.0 + p * 0.06);
        vec2 uvB = 0.5 + delta * (1.06 - p * 0.06);
        vec3 colA = sampleFitted(uTexA, uvA, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, uvB, uAspectB, uCanvasAspect, uFitMode).rgb;
        slideCol = mix(colA, colB, maskB);
        float seam = exp(-abs(distFromCenter - split) * 140.0) * env;
        slideCol += vec3(0.85, 0.93, 1.0) * seam * 0.85;
      } else if (uMode == 5) {
        float numBlades = 6.0;
        float bladeIdx = floor(uv.x * numBlades);
        float localX = fract(uv.x * numBlades);
        float delay = bladeIdx / numBlades * 0.42;
        float bp = clamp((p - delay) / 0.58, 0.0, 1.0);
        float smoothBp = smoothstep(0.0, 1.0, bp);
        float maskB = step(localX, smoothBp);
        vec2 shiftUvA = restUv + vec2(smoothBp * 0.04, 0.0);
        vec2 shiftUvB = restUv - vec2((1.0 - smoothBp) * 0.04, 0.0);
        vec3 colA = sampleFitted(uTexA, shiftUvA, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, shiftUvB, uAspectB, uCanvasAspect, uFitMode).rgb;
        slideCol = mix(colA, colB, maskB);
        float seam = exp(-abs(localX - smoothBp) * 95.0) * sin(bp * PI);
        slideCol += vec3(0.2, 0.82, 0.98) * seam * 0.7;
      } else if (uMode == 6) {
        float angle = p * PI;
        float cosA = cos(angle);
        float absCos = max(abs(cosA), 0.025);
        vec2 flipUv = vec2(0.5 + (uv.x - 0.5) / absCos, uv.y);
        float tilt = (uv.x - 0.5) * sin(angle) * 0.14;
        flipUv.y = 0.5 + (flipUv.y - 0.5) * (1.0 + tilt);
        if (flipUv.x < 0.0 || flipUv.x > 1.0 || flipUv.y < 0.0 || flipUv.y > 1.0) {
          slideCol = uBgColor;
        } else {
          if (p < 0.5) {
            slideCol = sampleFitted(uTexA, flipUv, uAspectA, uCanvasAspect, uFitMode).rgb;
          } else {
            vec2 mirrored = vec2(1.0 - flipUv.x, flipUv.y);
            slideCol = sampleFitted(uTexB, mirrored, uAspectB, uCanvasAspect, uFitMode).rgb;
          }
          slideCol *= (0.45 + 0.55 * absCos);
        }
        float edgeFlash = pow(sin(angle), 6.0);
        slideCol += vec3(0.55, 0.78, 1.0) * edgeFlash * 0.25;
      } else if (uMode == 7) {
        float r = length(delta);
        float swirl = 5.5 * uLensStrength * exp(-r * 2.8) * env;
        float s = sin(swirl);
        float c = cos(swirl);
        mat2 rot = mat2(c, -s, s, c);
        vec2 uvA = 0.5 + rot * (delta * (1.0 + p * 0.65));
        vec2 uvB = 0.5 + transpose(rot) * (delta * (1.35 - p * 0.35));
        vec3 colA = sampleFitted(uTexA, uvA, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, uvB, uAspectB, uCanvasAspect, uFitMode).rgb;
        float maskB = smoothstep(p * 1.45 - 0.25, p * 1.45, r);
        slideCol = mix(colB, colA, maskB);
        float halo = exp(-abs(r - p * 0.9) * 16.0) * env;
        slideCol += vec3(0.95, 0.45, 0.8) * halo * 0.75;
      } else if (uMode == 8) {
        float easeOut = 1.0 - pow(1.0 - p, 3.0);
        vec2 offsetA = vec2(-easeOut, 0.0);
        vec2 offsetB = vec2(1.0 - easeOut, 0.0);
        float vel = (1.0 - p) * (1.0 - p) * 0.028 * uLensStrength;
        vec2 blurVec = vec2(vel, 0.0);
        if (uv.x < 1.0 - easeOut) {
          vec2 sampleUv = clamp(restUv - offsetA * 0.35, 0.001, 0.999);
          slideCol = sampleBlur5Tap(uTexA, sampleUv, uAspectA, uCanvasAspect, uFitMode, blurVec);
        } else {
          vec2 sampleUv = clamp(restUv - offsetB * 0.35, 0.001, 0.999);
          slideCol = sampleBlur5Tap(uTexB, sampleUv, uAspectB, uCanvasAspect, uFitMode, blurVec);
        }
        float boundary = exp(-abs(uv.x - (1.0 - easeOut)) * 120.0) * env;
        slideCol += vec3(0.3, 0.85, 1.0) * boundary * 0.65;
      } else if (uMode == 9) {
        float blockIntensity = sin(p * PI);
        float gridCount = mix(240.0, 18.0, blockIntensity);
        vec2 voxelUv = (floor(restUv * gridCount) + 0.5) / gridCount;
        vec2 cellLocal = fract(restUv * gridCount) - 0.5;
        vec3 colA = sampleFitted(uTexA, voxelUv, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, voxelUv, uAspectB, uCanvasAspect, uFitMode).rgb;
        float stagger = fract(sin(dot(floor(restUv * gridCount), vec2(12.9898, 78.233))) * 43758.5453);
        float maskB = smoothstep(p * 1.3 - 0.3, p * 1.3, stagger);
        slideCol = mix(colA, colB, maskB);
        float bevel = smoothstep(0.42, 0.5, max(abs(cellLocal.x), abs(cellLocal.y))) * blockIntensity;
        slideCol = mix(slideCol, vec3(0.96, 0.65, 0.85), bevel * 0.25);
      } else if (uMode == 10) {
        // 11. Interactive Draggable & Foldable Page Curl
        float dir = (uFlipDir >= 0.0) ? 1.0 : -1.0;
        vec2 pageUv = (dir > 0.0) ? uv : vec2(1.0 - uv.x, uv.y);

        // Anchor-driven organic fold diagonal: dragging from bottom lifts bottom corner, top lifts top corner
        float tiltSlope = clamp(uFoldCornerBias + (0.5 - uFoldAnchorY) * 0.42, -0.45, 0.45);
        float diagProj = pageUv.x + (pageUv.y - uFoldAnchorY) * tiltSlope;
        float curlCenter = mix(1.36, -0.28, p);
        float bendFactor = clamp(uFoldBend, 0.5, 1.8);
        float radius = mix(0.06, 0.145, sin(p * PI)) * bendFactor;
        float d = diagProj - curlCenter;

        vec3 colIncoming = sampleFitted(uTexB, uv, uAspectB, uCanvasAspect, uFitMode).rgb;

        if (d < -radius) {
          slideCol = colIncoming;
        } else if (d < 0.0) {
          float theta = asin(clamp(-d / max(radius, 1e-4), -0.999, 0.999));
          float arcDist = radius * (PI - theta);
          float sampleX = clamp(curlCenter + arcDist - (pageUv.y - uFoldAnchorY) * tiltSlope, 0.0, 1.0);
          float liftY = sin(theta) * radius * 0.22;
          vec2 backRaw = vec2(sampleX, clamp(pageUv.y - liftY, 0.0, 1.0));
          vec2 backUv = (dir > 0.0) ? backRaw : vec2(1.0 - backRaw.x, backRaw.y);

          vec3 backTex = sampleFitted(uTexA, backUv, uAspectA, uCanvasAspect, uFitMode).rgb;
          vec3 paperTint = mix(vec3(0.93, 0.92, 0.89), backTex, 0.24);
          float shade = 0.7 + 0.35 * cos(theta);
          float foldRidge = pow(sin(theta), 4.0) * 0.25;
          slideCol = clamp(paperTint * shade + vec3(foldRidge), 0.0, 1.0);
        } else if (d < radius) {
          float theta = asin(clamp(d / max(radius, 1e-4), 0.0, 0.999));
          float arcDist = radius * theta;
          float sampleX = clamp(curlCenter + arcDist - (pageUv.y - uFoldAnchorY) * tiltSlope, 0.0, 1.0);
          vec2 frontRaw = vec2(sampleX, pageUv.y);
          vec2 frontUv = (dir > 0.0) ? frontRaw : vec2(1.0 - frontRaw.x, frontRaw.y);
          vec3 frontTex = sampleFitted(uTexA, frontUv, uAspectA, uCanvasAspect, uFitMode).rgb;
          float specular = pow(sin(theta), 2.5) * 0.16;
          slideCol = clamp(frontTex * (0.9 + 0.12 * cos(theta)) + vec3(specular), 0.0, 1.0);
        } else {
          slideCol = sampleFitted(uTexA, restUv, uAspectA, uCanvasAspect, uFitMode).rgb;
        }

        if (d < 0.0) {
          float shadowFalloff = exp(d * 6.5) * 0.44 * max(0.25, env);
          slideCol *= (1.0 - shadowFalloff);
        }
      } else if (uMode == 11) {
        float organic = fbmNoise(uv * 5.2 + vec2(uTime * 0.06, -uTime * 0.04));
        float radial = length(delta) * 0.75;
        float inkField = mix(organic, radial + organic * 0.45, 0.55);
        float thresh = mix(-0.18, 1.25, p);
        float maskB = smoothstep(thresh + 0.18, thresh - 0.14, inkField);
        vec3 colA = sampleFitted(uTexA, restUv, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, restUv, uAspectB, uCanvasAspect, uFitMode).rgb;
        slideCol = mix(colA, colB, maskB);
        float wetEdge = exp(-abs(inkField - thresh) * 22.0) * env;
        slideCol = mix(slideCol, vec3(0.32, 0.88, 0.82), wetEdge * 0.55);
      } else if (uMode == 12) {
        vec2 grid = restUv * vec2(10.0 * uCanvasAspect, 10.0);
        vec2 ip = floor(grid);
        vec2 fp = fract(grid);
        float minD = 8.0;
        vec2 bestId = ip;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 nb = vec2(float(x), float(y));
            vec2 pt = vec2(hash21(ip + nb), hash21(ip + nb + 13.7));
            float dist = length(nb + pt - fp);
            if (dist < minD) {
              minD = dist;
              bestId = ip + nb;
            }
          }
        }
        float cellOrder = hash21(bestId);
        float maskB = smoothstep(cellOrder - 0.18, cellOrder + 0.12, p * 1.25 - 0.1);
        vec2 refractOff = (vec2(hash21(bestId + 3.1), hash21(bestId + 7.4)) - 0.5) * 0.055 * env;
        vec3 colA = sampleFitted(uTexA, restUv + refractOff * p, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, restUv - refractOff * (1.0 - p), uAspectB, uCanvasAspect, uFitMode).rgb;
        slideCol = mix(colA, colB, maskB);
        float facetGlow = exp(-abs(maskB - 0.5) * 14.0) * env;
        slideCol += vec3(0.75, 0.65, 1.0) * facetGlow * 0.45;
      } else {
        vec2 cellUv = uv * vec2(6.0 * uCanvasAspect, 6.0);
        float f1 = fbmNoise(cellUv + vec2(sin(uTime * 0.3), cos(uTime * 0.2)));
        float f2 = fbmNoise(cellUv * 2.1 - vec2(uTime * 0.15));
        float vacuole = smoothstep(0.15, 0.85, f1 * 0.65 + f2 * 0.35);
        float threshold = mix(-0.1, 1.1, p);
        float maskB = smoothstep(threshold + 0.12, threshold - 0.12, vacuole);
        vec2 organicStretch = restUv + vec2(f1 - 0.5, f2 - 0.5) * 0.035 * env;
        vec3 colA = sampleFitted(uTexA, organicStretch, uAspectA, uCanvasAspect, uFitMode).rgb;
        vec3 colB = sampleFitted(uTexB, organicStretch, uAspectB, uCanvasAspect, uFitMode).rgb;
        slideCol = mix(colA, colB, maskB);
        float membrane = exp(-abs(vacuole - threshold) * 28.0) * env;
        slideCol += vec3(0.42, 0.92, 0.72) * membrane * 0.65;
      }
    }
  }

  vec3 finalCol = slideCol;

  if (uStageMode != 2) {
    finalCol = applyPhotoStyle(finalCol, uv, uPhotoStyle);
  }

  if (uStageMode != 2) {
    if (uEmergenceMode == 1) {
      float dEdge = length((rawUv - 0.5) * vec2(uCanvasAspect, 1.0));
      float pulse = 0.5 + 0.5 * sin(uTime * 1.4);
      finalCol += vec3(0.22, 0.55, 0.95) * smoothstep(0.32, 0.95, dEdge) * (0.1 + 0.12 * pulse);
    } else if (uEmergenceMode == 4) {
      float lum = dot(finalCol, vec3(0.3, 0.5, 0.2));
      float caus = pow(max(0.0, sin(uv.x * 16.0 + uTime) * cos(uv.y * 16.0 - uTime * 0.8)), 3.0);
      finalCol += vec3(0.18, 0.82, 0.68) * caus * (1.0 - lum) * 0.25;
    }
  }

  // Deeper Design Matrix: Micro-Fractal Glass Tessellation & Hyper-Symmetric Reticle
  if (uFractalLattice > 0.02) {
    vec2 g1 = abs(fract(rawUv * vec2(12.0 * uCanvasAspect, 12.0) - 0.5) - 0.5);
    vec2 g2 = abs(fract(rawUv * vec2(36.0 * uCanvasAspect, 36.0) - 0.5) - 0.5);
    float line1 = smoothstep(0.47, 0.495, max(g1.x, g1.y));
    float line2 = smoothstep(0.48, 0.498, max(g2.x, g2.y));
    float symCross = exp(-min(abs(rawUv.x - 0.5), abs(rawUv.y - 0.5)) * 180.0);
    float lattice = (line1 * 0.18 + line2 * 0.08 + symCross * 0.14) * uFractalLattice;
    finalCol += vec3(0.38, 0.78, 0.98) * lattice;
  }

  if (uStageMode == 2) {
    finalCol = evalDigitalSun(rawUv);
  } else if (uStageMode == 1) {
    vec3 sunCol = evalDigitalSun(rawUv);
    finalCol = mix(finalCol, 1.0 - (1.0 - finalCol) * (1.0 - sunCol * 0.85), clamp(uSunBlend, 0.0, 1.0));
    finalCol += sunCol * (uSunBlend * 0.25);
  }

  vec2 scDelta = vec2((rawUv.x - uShockwave.x) * uCanvasAspect, rawUv.y - uShockwave.y);
  float shockDist = length(scDelta);
  float shockRing = exp(-pow(abs(shockDist - uShockwaveAge * 0.95) * 28.0, 2.0)) * max(0.0, 1.0 - uShockwaveAge * 0.85);
  finalCol += vec3(0.38, 0.82, 1.0) * shockRing * 0.95;

  outColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
`;

const UNIFORM_NAMES = [
  'uTexA',
  'uTexB',
  'uAspectA',
  'uAspectB',
  'uCanvasAspect',
  'uProg',
  'uDpr',
  'uHasTex',
  'uTime',
  'uMode',
  'uFlipDir',
  'uFitMode',
  'uKenBurns',
  'uLensStrength',
  'uMouse',
  'uBass',
  'uMids',
  'uTreble',
  'uBgColor',
  'uFoldAnchorY',
  'uFoldCornerBias',
  'uFoldBend',
  'uSymmetryOrder',
  'uRefraction',
  'uFractalLattice',
  'uPhotoStyle',
  'uEmergenceMode',
  'uStageMode',
  'uSunDepth',
  'uSunArms',
  'uSunSpeed',
  'uSunBlend',
  'uShockwave',
  'uShockwaveAge',
];

interface TextureEntry {
  texture: WebGLTexture | null;
  width: number;
  height: number;
  aspect: number;
  img: HTMLImageElement;
  url: string;
}

export class TransitionMatrixEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private fallbackTex: WebGLTexture | null = null;

  private textureCache = new Map<string, TextureEntry>();
  private inflightMap = new Map<string, Promise<TextureEntry | null>>();

  private entryA: TextureEntry | null = null;
  private entryB: TextureEntry | null = null;
  private pendingUrl = '';
  private currentUrl = '';
  private tweenState = { prog: 0 };
  private activeTween: gsap.core.Tween | null = null;
  private activeTweenResolve: (() => void) | null = null;
  private opToken = 0;
  private destroyed = false;
  private rafId = 0;
  private startTime = performance.now();
  private lastFrameTime = performance.now();

  private mode = 10;
  private flipDir = 1.0;
  private foldAnchorY = 0.65;
  private fitMode: FitMode = 'cover';
  private kenBurns = true;
  private lensStrength = 1.0;
  private audioReactivity = 0.7;
  private photoStyleIndex = 0;
  private emergenceModeIndex = 0;
  private resScale = 1.0;
  private stageMode: StageVisualMode = 'slides';
  private sunConfig: DigitalSunConfig = { depth: 6.0, arms: 3.0, speed: 1.0, blend: 0.55 };
  private designConfig: DesignMatrixConfig = {
    symmetryOrder: 0,
    refraction: 0.25,
    fractalLattice: 0.14,
    foldCurlTension: 1.0,
    foldCornerBias: 0.0,
  };

  private mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  private shockwave = { x: 0.5, y: 0.5, triggeredAt: -10000 };
  private audioMetrics: AudioMetrics = { bass: 0, mids: 0, treble: 0, beatDetected: false };
  private bgColor: [number, number, number] = [0.027, 0.035, 0.059];

  private onContextStatus?: (lost: boolean) => void;
  private onFrameDelta?: (deltaMs: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onContextStatus?: (lost: boolean) => void,
    onFrameDelta?: (deltaMs: number) => void
  ) {
    this.canvas = canvas;
    this.onContextStatus = onContextStatus;
    this.onFrameDelta = onFrameDelta;
    this.initContext();
    this.attachEvents();
    this.startLoop();
  }

  private initContext() {
    this.gl = createWebGL2Context(this.canvas, { alpha: false, isScreenshotMode: true });
    if (this.gl) {
      this.program = createProgram(this.gl, FULLSCREEN_VERT_GLSL, MATRIX_FRAG_GLSL, 'TransitionMatrix');
      this.vao = createFullscreenVAO(this.gl);
      this.uniforms = getUniformLocations(this.gl, this.program, UNIFORM_NAMES);
      this.fallbackTex = createSolidTexture(this.gl, [7, 9, 15, 255]);
      this.gl.disable(this.gl.DEPTH_TEST);
      this.gl.disable(this.gl.BLEND);
    } else {
      this.ctx2d = this.canvas.getContext('2d');
    }
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.onContextStatus?.(true);
  };

  private handleContextRestored = () => {
    this.textureCache.clear();
    this.entryA = null;
    this.entryB = null;
    this.initContext();
    if (this.currentUrl) {
      void this.setImmediate(this.currentUrl);
    }
    this.onContextStatus?.(false);
  };

  private attachEvents() {
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  public setPointerNormalized(nx: number, ny: number) {
    this.mouse.targetX = Math.max(0, Math.min(1, nx));
    this.mouse.targetY = Math.max(0, Math.min(1, ny));
  }

  public triggerShockwave(nx = 0.5, ny = 0.5) {
    this.shockwave.x = Math.max(0, Math.min(1, nx));
    this.shockwave.y = Math.max(0, Math.min(1, ny));
    this.shockwave.triggeredAt = performance.now();
  }

  public setStageMode(mode: StageVisualMode) {
    this.stageMode = mode;
  }

  public setSunConfig(next: Partial<DigitalSunConfig>) {
    this.sunConfig = { ...this.sunConfig, ...next };
  }

  public setDesignConfig(next: Partial<DesignMatrixConfig>) {
    this.designConfig = { ...this.designConfig, ...next };
  }

  public setResolutionScale(scale: number) {
    this.resScale = Math.max(0.5, Math.min(1.0, scale));
  }

  public setParameters(opts: {
    fitMode?: FitMode;
    kenBurns?: boolean;
    lensStrength?: number;
    audioReactivity?: number;
    photoStyleIndex?: number;
    emergenceModeIndex?: number;
  }) {
    if (opts.fitMode !== undefined) this.fitMode = opts.fitMode;
    if (opts.kenBurns !== undefined) this.kenBurns = opts.kenBurns;
    if (opts.lensStrength !== undefined) this.lensStrength = opts.lensStrength;
    if (opts.audioReactivity !== undefined) this.audioReactivity = opts.audioReactivity;
    if (opts.photoStyleIndex !== undefined) this.photoStyleIndex = opts.photoStyleIndex;
    if (opts.emergenceModeIndex !== undefined) this.emergenceModeIndex = opts.emergenceModeIndex;
  }

  public setAudioMetrics(metrics: AudioMetrics) {
    this.audioMetrics = metrics;
  }

  public getLiveTelemetry() {
    return {
      prog: Number(this.tweenState.prog.toFixed(3)),
      mode: this.mode,
      flipDir: this.flipDir,
      foldAnchorY: Number(this.foldAnchorY.toFixed(2)),
      foldCornerBias: Number(this.designConfig.foldCornerBias.toFixed(2)),
      isTransitioning: Boolean(this.activeTween) || (this.tweenState.prog > 0.002 && this.tweenState.prog < 0.998),
    };
  }

  /**
   * Frame Sequence Scrubbing: lets the user hold/scrub a frozen frame along the event
   */
  public setScrubProgress(targetUrl: string, modeIndex: number, prog: number, dir: 1 | -1 = 1) {
    this.killActiveTween();
    this.mode = Math.max(0, Math.min(13, modeIndex));
    this.flipDir = dir;
    void this.ensureTexture(targetUrl).then((entry) => {
      if (entry && !this.destroyed) {
        this.entryB = entry;
      }
    });
    this.tweenState.prog = Math.max(0, Math.min(0.998, prog));
  }

  /**
   * Interactive Draggable & Foldable Page Turn (real-time finger/mouse curl)
   */
  public async beginInteractiveFold(
    targetUrl: string,
    dir: 1 | -1,
    anchorYNorm: number
  ): Promise<void> {
    if (!targetUrl || this.destroyed) return;
    const token = ++this.opToken;
    this.killActiveTween();
    this.pendingUrl = targetUrl;
    this.mode = 10; // Natural Page Curl
    this.flipDir = dir;
    this.foldAnchorY = Math.max(0.08, Math.min(0.92, anchorYNorm));

    const entry = await this.ensureTexture(targetUrl);
    if (this.destroyed || token !== this.opToken || !entry) return;
    this.entryB = entry;
  }

  public updateInteractiveFold(progress: number, pointerYNorm: number) {
    this.tweenState.prog = Math.max(0.01, Math.min(0.995, progress));
    this.foldAnchorY = Math.max(0.08, Math.min(0.92, pointerYNorm));
  }

  public async releaseInteractiveFold(commitFlip: boolean, durationSec = 0.45): Promise<boolean> {
    const token = ++this.opToken;
    this.killActiveTween();

    if (commitFlip) {
      const targetEntry = this.entryB || (this.pendingUrl ? await this.ensureTexture(this.pendingUrl) : null);
      if (!targetEntry || this.destroyed || token !== this.opToken) return false;
      this.currentUrl = this.pendingUrl || targetEntry.url;
      this.entryB = targetEntry;

      await new Promise<void>((resolve) => {
        this.activeTweenResolve = resolve;
        this.activeTween = gsap.to(this.tweenState, {
          prog: 1,
          duration: Math.max(0.2, durationSec * (1 - this.tweenState.prog * 0.5)),
          ease: 'power2.out',
          onComplete: () => {
            this.activeTween = null;
            this.activeTweenResolve = null;
            if (!this.destroyed && token === this.opToken) {
              this.entryA = targetEntry;
              this.entryB = targetEntry;
              this.tweenState.prog = 0;
            }
            resolve();
          },
        });
      });
      return true;
    } else {
      await new Promise<void>((resolve) => {
        this.activeTweenResolve = resolve;
        this.activeTween = gsap.to(this.tweenState, {
          prog: 0,
          duration: Math.max(0.18, durationSec * Math.max(0.25, this.tweenState.prog)),
          ease: 'power2.out',
          onComplete: () => {
            this.activeTween = null;
            this.activeTweenResolve = null;
            if (!this.destroyed && token === this.opToken) {
              this.entryB = this.entryA;
              this.tweenState.prog = 0;
            }
            resolve();
          },
        });
      });
      return false;
    }
  }

  public async ensureTexture(url: string): Promise<TextureEntry | null> {
    if (!url || this.destroyed) return null;
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url) || null;
    }
    if (this.inflightMap.has(url)) {
      return this.inflightMap.get(url) || null;
    }

    const promise = (async () => {
      try {
        const img = await loadImageDecoded(url);
        if (this.destroyed) return null;
        let entry: TextureEntry;
        if (this.gl) {
          const created = createTextureFromImage(this.gl, img, { mipmaps: true });
          entry = { ...created, url };
        } else {
          const w = img.naturalWidth || img.width || 1;
          const h = img.naturalHeight || img.height || 1;
          entry = {
            texture: null,
            width: w,
            height: h,
            aspect: w / Math.max(h, 1),
            img,
            url,
          };
        }
        this.textureCache.set(url, entry);
        return entry;
      } catch (err) {
        console.warn('[TransitionMatrixEngine] Texture load failed:', url, err);
        return null;
      } finally {
        this.inflightMap.delete(url);
      }
    })();

    this.inflightMap.set(url, promise);
    return promise;
  }

  public async preload(urls: string[]) {
    await Promise.all(urls.filter(Boolean).map((u) => this.ensureTexture(u)));
  }

  public async setImmediate(url: string) {
    if (!url || this.destroyed) return;
    const token = ++this.opToken;
    this.killActiveTween();
    this.currentUrl = url;

    const entry = await this.ensureTexture(url);
    if (this.destroyed || token !== this.opToken || !entry) return;

    this.entryA = entry;
    this.entryB = entry;
    this.tweenState.prog = 0;
  }

  public async transitionTo(
    url: string,
    modeIndex: number,
    durationSec = 0.85,
    flipDirection: 1 | -1 = 1
  ): Promise<void> {
    if (!url || this.destroyed) return;
    if (url === this.currentUrl && this.entryA) return;

    if (!this.entryA || durationSec <= 0) {
      await this.setImmediate(url);
      return;
    }

    const token = ++this.opToken;
    if (this.activeTween && this.tweenState.prog > 0.5 && this.entryB) {
      this.entryA = this.entryB;
    }
    this.killActiveTween();
    this.currentUrl = url;
    this.mode = Math.max(0, Math.min(13, modeIndex));
    this.flipDir = flipDirection;
    this.foldAnchorY = 0.65;

    const nextEntry = await this.ensureTexture(url);
    if (this.destroyed || token !== this.opToken || !nextEntry) return;

    this.entryB = nextEntry;
    this.tweenState.prog = 0;

    const easeCurve =
      this.mode === 10
        ? 'power2.inOut'
        : this.mode === 6 || this.mode === 8
          ? 'power3.inOut'
          : 'expo.out';

    await new Promise<void>((resolve) => {
      this.activeTweenResolve = resolve;
      this.activeTween = gsap.to(this.tweenState, {
        prog: 1,
        duration: durationSec,
        ease: easeCurve,
        onComplete: () => {
          this.activeTween = null;
          this.activeTweenResolve = null;
          if (!this.destroyed && token === this.opToken) {
            this.entryA = nextEntry;
            this.entryB = nextEntry;
            this.tweenState.prog = 0;
          }
          resolve();
        },
      });
    });
  }

  private killActiveTween() {
    if (this.activeTween) {
      this.activeTween.kill();
      this.activeTween = null;
    }
    if (this.activeTweenResolve) {
      const r = this.activeTweenResolve;
      this.activeTweenResolve = null;
      r();
    }
  }

  private renderFrame = (now: number) => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.renderFrame);

    const frameDelta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.onFrameDelta?.(frameDelta);

    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.1;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.1;

    const metrics = resizeCanvasToDisplaySize(this.canvas, 2 * this.resScale);

    if (!this.gl || !this.program) {
      if (this.ctx2d) {
        const w = metrics.width;
        const h = metrics.height;
        this.ctx2d.fillStyle = '#07090f';
        this.ctx2d.fillRect(0, 0, w, h);
        if (this.entryA?.img && this.tweenState.prog < 0.999) {
          this.ctx2d.globalAlpha = 1;
          drawImageCover2D(this.ctx2d, this.entryA.img, w, h);
        }
        if (this.entryB?.img && this.tweenState.prog > 0.001) {
          this.ctx2d.globalAlpha = Math.min(1, Math.max(0, this.tweenState.prog));
          drawImageCover2D(this.ctx2d, this.entryB.img, w, h);
        }
        this.ctx2d.globalAlpha = 1;
      }
      return;
    }

    const gl = this.gl;
    const { width, height, dpr, aspect } = metrics;
    const hasTex = Boolean(this.entryA || this.entryB);
    const activeA = this.entryA || this.entryB;
    const activeB = this.entryB || this.entryA;
    const elapsed = (now - this.startTime) * 0.001;
    const shockAge = (now - this.shockwave.triggeredAt) * 0.001;
    const stageInt = this.stageMode === 'fractal' ? 2 : this.stageMode === 'hybrid' ? 1 : 0;

    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, activeA?.texture || this.fallbackTex);
    gl.uniform1i(this.uniforms.uTexA, 0);
    gl.uniform1f(this.uniforms.uAspectA, activeA ? activeA.aspect : aspect);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, activeB?.texture || this.fallbackTex);
    gl.uniform1i(this.uniforms.uTexB, 1);
    gl.uniform1f(this.uniforms.uAspectB, activeB ? activeB.aspect : aspect);

    gl.uniform1f(this.uniforms.uCanvasAspect, aspect);
    gl.uniform1f(this.uniforms.uProg, this.tweenState.prog);
    gl.uniform1f(this.uniforms.uDpr, dpr);
    gl.uniform1f(this.uniforms.uHasTex, hasTex ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.uTime, elapsed);
    gl.uniform1i(this.uniforms.uMode, this.mode);
    gl.uniform1f(this.uniforms.uFlipDir, this.flipDir);
    gl.uniform1f(this.uniforms.uFitMode, this.fitMode === 'contain' ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.uKenBurns, this.kenBurns ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.uLensStrength, this.lensStrength);
    gl.uniform2f(this.uniforms.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uniforms.uBass, this.audioMetrics.bass * this.audioReactivity);
    gl.uniform1f(this.uniforms.uMids, this.audioMetrics.mids * this.audioReactivity);
    gl.uniform1f(this.uniforms.uTreble, this.audioMetrics.treble * this.audioReactivity);
    gl.uniform3f(this.uniforms.uBgColor, this.bgColor[0], this.bgColor[1], this.bgColor[2]);

    gl.uniform1f(this.uniforms.uFoldAnchorY, this.foldAnchorY);
    gl.uniform1f(this.uniforms.uFoldCornerBias, this.designConfig.foldCornerBias);
    gl.uniform1f(this.uniforms.uFoldBend, this.designConfig.foldCurlTension);
    gl.uniform1f(this.uniforms.uSymmetryOrder, this.designConfig.symmetryOrder);
    gl.uniform1f(this.uniforms.uRefraction, this.designConfig.refraction);
    gl.uniform1f(this.uniforms.uFractalLattice, this.designConfig.fractalLattice);

    gl.uniform1i(this.uniforms.uPhotoStyle, this.photoStyleIndex);
    gl.uniform1i(this.uniforms.uEmergenceMode, this.emergenceModeIndex);
    gl.uniform1i(this.uniforms.uStageMode, stageInt);
    gl.uniform1f(this.uniforms.uSunDepth, this.sunConfig.depth);
    gl.uniform1f(this.uniforms.uSunArms, this.sunConfig.arms);
    gl.uniform1f(this.uniforms.uSunSpeed, this.sunConfig.speed);
    gl.uniform1f(this.uniforms.uSunBlend, this.sunConfig.blend);
    gl.uniform2f(this.uniforms.uShockwave, this.shockwave.x, this.shockwave.y);
    gl.uniform1f(this.uniforms.uShockwaveAge, shockAge);

    drawFullscreenTriangle(gl, this.vao);
  };

  private startLoop() {
    this.rafId = requestAnimationFrame(this.renderFrame);
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.killActiveTween();

    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    if (this.gl) {
      for (const entry of this.textureCache.values()) {
        if (entry.texture) this.gl.deleteTexture(entry.texture);
      }
      if (this.fallbackTex) this.gl.deleteTexture(this.fallbackTex);
      if (this.vao) this.gl.deleteVertexArray(this.vao);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.textureCache.clear();
    this.inflightMap.clear();
  }
}
