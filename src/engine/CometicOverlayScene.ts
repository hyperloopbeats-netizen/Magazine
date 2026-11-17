import * as THREE from 'three';
import { AudioMetrics, HardwareTier, LiquidObjectType, OverlayConfig } from '../types/matrix';

const isSoftwareGl = (() => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

const _vec3 = new THREE.Vector3();
const _axis = new THREE.Vector3(0, 1, 0);
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

interface SwarmBoid {
  angle: number;
  radius: number;
  speed: number;
  yOffset: number;
  phase: number;
}

interface AwarenessNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  phase: number;
}

export interface LiquidHitResult {
  type: LiquidObjectType;
  label: string;
}

export class CometicOverlayScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  private motePoints: THREE.Points;
  private moteVelocities: Float32Array;
  private moteMat: THREE.PointsMaterial;
  private maxMotes = 900;
  private activeMoteCount = 480;

  private swarmInstanced: THREE.InstancedMesh;
  private swarmMat: THREE.MeshBasicMaterial;
  private boids: SwarmBoid[] = [];

  private awarenessMesh: THREE.InstancedMesh;
  private awarenessMat: THREE.MeshBasicMaterial;
  private awarenessNodes: AwarenessNode[] = [];
  private maxAwarenessNodes = 128;

  private gelCoreMesh: THREE.Mesh;
  private gelShaderMat: THREE.ShaderMaterial;

  private horizonGrid: THREE.Mesh;
  private horizonMat: THREE.MeshBasicMaterial;

  public readonly hardwareTier: HardwareTier;

  private config: OverlayConfig = {
    motes: true,
    swarm: false,
    gelCore: false,
    horizonGrid: false,
    intensity: 0.85,
  };

  private audioMetrics: AudioMetrics = { bass: 0, mids: 0, treble: 0, beatDetected: false };
  private transitionBurst = 0;
  private energyPulseTimer = 0;
  private targetPointer = { x: 0, y: 0 };
  private smoothPointer = { x: 0, y: 0 };
  private frameId = 0;
  private destroyed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isSoftwareGl || isMobile || cores <= 2) {
      this.hardwareTier = 'eco';
      this.activeMoteCount = 260;
    } else if (cores <= 6) {
      this.hardwareTier = 'balanced';
      this.activeMoteCount = 480;
    } else {
      this.hardwareTier = 'high';
      this.activeMoteCount = 900;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 200);
    this.camera.position.set(0, 1.5, 24);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(
      isSoftwareGl || this.hardwareTier === 'eco' ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    // 1. Cometic Spark Motes
    const positions = new Float32Array(this.maxMotes * 3);
    this.moteVelocities = new Float32Array(this.maxMotes * 3);
    for (let i = 0; i < this.maxMotes; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 38;
      positions[i3 + 1] = (Math.random() - 0.5) * 22;
      positions[i3 + 2] = (Math.random() - 0.5) * 18;
      this.moteVelocities[i3] = (Math.random() - 0.5) * 0.03;
      this.moteVelocities[i3 + 1] = 0.008 + Math.random() * 0.025;
      this.moteVelocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    moteGeo.setDrawRange(0, this.activeMoteCount);
    this.moteMat = new THREE.PointsMaterial({
      color: 0x96d0ff,
      size: 0.19,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.motePoints = new THREE.Points(moteGeo, this.moteMat);
    this.scene.add(this.motePoints);

    // 2. Interactive Awareness Nodes (touchable via Liquid Touch raycast!)
    const nodeGeo = new THREE.OctahedronGeometry(0.42, 0);
    this.awarenessMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    });
    this.awarenessMesh = new THREE.InstancedMesh(nodeGeo, this.awarenessMat, this.maxAwarenessNodes);
    this.awarenessMesh.frustumCulled = false;
    this.spawnAwarenessNodes(24);
    this.scene.add(this.awarenessMesh);

    // 3. Autonomous Evo-Matrix Orbital Swarm
    const swarmCount = 48;
    const boidGeo = new THREE.OctahedronGeometry(0.28, 0);
    this.swarmMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    });
    this.swarmInstanced = new THREE.InstancedMesh(boidGeo, this.swarmMat, swarmCount);
    this.swarmInstanced.frustumCulled = false;
    for (let i = 0; i < swarmCount; i++) {
      this.boids.push({
        angle: (i / swarmCount) * Math.PI * 2,
        radius: 9.5 + (i % 5) * 1.4,
        speed: (0.28 + (i % 7) * 0.07) * (i % 2 === 0 ? 1 : -1),
        yOffset: ((i % 9) - 4) * 1.1,
        phase: i * 0.65,
      });
    }
    this.swarmInstanced.visible = this.config.swarm;
    this.scene.add(this.swarmInstanced);

    // 4. Cometic Gel Core Wireframe Aura
    const gelGeo = new THREE.IcosahedronGeometry(5.6, 2);
    this.gelShaderMat = new THREE.ShaderMaterial({
      transparent: true,
      wireframe: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uOpacity: { value: 0.35 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBass;
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vNormal = normal;
          vUv = uv;
          vec3 pos = position;
          float squish = sin(pos.x * 2.2 + uTime * 2.1) * cos(pos.y * 2.2 + uTime * 1.9) * (0.25 + uBass * 0.85);
          pos += normal * squish;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vec3 pink = vec3(0.96, 0.45, 0.71);
          vec3 cyan = vec3(0.22, 0.74, 0.97);
          vec3 col = mix(pink, cyan, 0.5 + 0.5 * sin(vUv.x * 6.0 + uTime));
          gl_FragColor = vec4(col, uOpacity);
        }
      `,
    });
    this.gelCoreMesh = new THREE.Mesh(gelGeo, this.gelShaderMat);
    this.gelCoreMesh.visible = this.config.gelCore;
    this.scene.add(this.gelCoreMesh);

    // 5. Marshmallow Horizon Wireframe Grid
    const gridGeo = new THREE.PlaneGeometry(76, 76, 26, 26);
    this.horizonMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this.horizonGrid = new THREE.Mesh(gridGeo, this.horizonMat);
    this.horizonGrid.rotation.x = Math.PI / 2;
    this.horizonGrid.position.y = -7.5;
    this.horizonGrid.visible = this.config.horizonGrid;
    this.scene.add(this.horizonGrid);

    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Liquid Touch Raycaster: detects if the user tapped an interactive 3D object
   * (Gel Core, Awareness Node, or Swarm Boid) to trigger contextual object actions.
   */
  public hitTest(clientX: number, clientY: number): LiquidHitResult | null {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_ndc, this.camera);

    const targets: THREE.Object3D[] = [];
    if (this.gelCoreMesh.visible) targets.push(this.gelCoreMesh);
    if (this.awarenessMesh.visible) targets.push(this.awarenessMesh);
    if (this.swarmInstanced.visible) targets.push(this.swarmInstanced);

    if (!targets.length) return null;
    const hits = _raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;

    const first = hits[0];
    if (first.object === this.gelCoreMesh) {
      return { type: 'core', label: 'Gel Core Sphere' };
    }
    if (first.object === this.awarenessMesh) {
      return {
        type: 'node',
        label: `Spatial Node #${(first.instanceId ?? 0) + 1}`,
      };
    }
    if (first.object === this.swarmInstanced) {
      return {
        type: 'swarm',
        label: `Swarm Boid #${(first.instanceId ?? 0) + 1}`,
      };
    }
    return null;
  }

  public getStats() {
    let velMag = 0;
    for (let i = 0; i < this.awarenessNodes.length; i++) {
      const n = this.awarenessNodes[i];
      velMag += Math.abs(n.vx) + Math.abs(n.vy);
    }
    const entropy = this.awarenessNodes.length
      ? Math.min(0.99, velMag / (this.awarenessNodes.length * 4.5))
      : 0.12;
    return {
      particleCount: this.activeMoteCount,
      awarenessNodes: this.awarenessNodes.length,
      entropy: Number(entropy.toFixed(2)),
      tier: this.hardwareTier,
    };
  }

  public spawnAwarenessNodes(count = 4): number {
    for (let i = 0; i < count; i++) {
      if (this.awarenessNodes.length >= this.maxAwarenessNodes) break;
      this.awarenessNodes.push({
        x: (Math.random() - 0.5) * 24,
        y: (Math.random() - 0.5) * 13,
        z: (Math.random() - 0.5) * 10 - 2,
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        vz: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.awarenessMesh.count = this.awarenessNodes.length;
    return this.awarenessNodes.length;
  }

  public triggerEnergyPulse() {
    this.energyPulseTimer = 1.6;
    this.transitionBurst = 1.2;
  }

  public triggerGravityShift() {
    for (let i = 0; i < this.awarenessNodes.length; i++) {
      this.awarenessNodes[i].vy += (Math.random() > 0.3 ? 1 : -1) * 5.2;
      this.awarenessNodes[i].vx += (Math.random() - 0.5) * 3.0;
    }
    for (let i = 0; i < this.moteVelocities.length; i += 3) {
      this.moteVelocities[i + 1] = -this.moteVelocities[i + 1] * 1.4;
    }
  }

  public shedLod() {
    this.activeMoteCount = Math.max(160, Math.floor(this.activeMoteCount * 0.72));
    this.motePoints.geometry.setDrawRange(0, this.activeMoteCount);
    this.renderer.setPixelRatio(1);
    return this.activeMoteCount;
  }

  public forceHeal() {
    this.activeMoteCount =
      this.hardwareTier === 'eco' ? 260 : this.hardwareTier === 'balanced' ? 480 : 900;
    this.motePoints.geometry.setDrawRange(0, this.activeMoteCount);
    this.renderer.setPixelRatio(
      isSoftwareGl || this.hardwareTier === 'eco' ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    return this.activeMoteCount;
  }

  private handleResize = () => {
    if (this.destroyed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setConfig(next: Partial<OverlayConfig>) {
    this.config = { ...this.config, ...next };
    this.motePoints.visible = this.config.motes;
    this.awarenessMesh.visible = this.config.motes || this.config.swarm;
    this.swarmInstanced.visible = this.config.swarm;
    this.gelCoreMesh.visible = this.config.gelCore;
    this.horizonGrid.visible = this.config.horizonGrid;
  }

  public setPointerNormalized(nx: number, ny: number) {
    this.targetPointer.x = (nx - 0.5) * 2;
    this.targetPointer.y = -(ny - 0.5) * 2;
  }

  public setAudioMetrics(metrics: AudioMetrics) {
    this.audioMetrics = metrics;
  }

  public triggerTransitionPulse() {
    this.transitionBurst = 1.0;
  }

  private tick = () => {
    if (this.destroyed) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.transitionBurst = THREE.MathUtils.damp(this.transitionBurst, 0, 3.8, delta);
    this.energyPulseTimer = Math.max(0, this.energyPulseTimer - delta);
    this.smoothPointer.x = THREE.MathUtils.damp(this.smoothPointer.x, this.targetPointer.x, 5, delta);
    this.smoothPointer.y = THREE.MathUtils.damp(this.smoothPointer.y, this.targetPointer.y, 5, delta);

    this.camera.position.x = this.smoothPointer.x * 1.4;
    this.camera.position.y = 1.5 + this.smoothPointer.y * 0.9;
    this.camera.lookAt(0, 0, 0);

    const bassBoost = this.audioMetrics.bass * 1.8 + this.transitionBurst * 1.4;

    if (this.config.motes) {
      const posAttr = this.motePoints.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const speedMult = 1 + bassBoost * 1.8;
      const limit = this.activeMoteCount * 3;
      for (let i = 0; i < limit; i += 3) {
        arr[i] += this.moteVelocities[i] * speedMult;
        arr[i + 1] += this.moteVelocities[i + 1] * speedMult;
        arr[i + 2] += this.moteVelocities[i + 2] * speedMult;
        if (Math.abs(arr[i]) > 20) this.moteVelocities[i] *= -1;
        if (arr[i + 1] > 13) arr[i + 1] = -13;
        if (arr[i + 1] < -13) arr[i + 1] = 13;
        if (Math.abs(arr[i + 2]) > 10) this.moteVelocities[i + 2] *= -1;
      }
      posAttr.needsUpdate = true;
      this.motePoints.rotation.y = elapsed * 0.03;
      this.moteMat.opacity = Math.min(
        0.92,
        (0.45 + this.audioMetrics.treble * 0.4 + this.transitionBurst * 0.35) * this.config.intensity
      );
      this.moteMat.color.setHex(this.energyPulseTimer > 0 ? 0xc084fc : 0x96d0ff);
    }

    if (this.awarenessMesh.visible) {
      const pulseScale = this.energyPulseTimer > 0 ? 1 + Math.sin(elapsed * 12) * 0.55 + 0.55 : 1;
      this.awarenessMat.color.setHex(this.energyPulseTimer > 0 ? 0xc084fc : 0x38bdf8);
      this.awarenessMat.opacity = Math.min(0.85, 0.45 * this.config.intensity + bassBoost * 0.2);

      for (let i = 0; i < this.awarenessNodes.length; i++) {
        const n = this.awarenessNodes[i];
        n.x += n.vx * delta * (1 + bassBoost * 0.6);
        n.y += n.vy * delta * (1 + bassBoost * 0.6);
        n.z += n.vz * delta;
        n.vx *= 0.996;
        n.vy *= 0.996;
        if (Math.abs(n.x) > 13) n.vx *= -1;
        if (Math.abs(n.y) > 7.5) n.vy *= -1;
        if (Math.abs(n.z) > 6) n.vz *= -1;

        _vec3.set(n.x, n.y, n.z);
        _quat.setFromAxisAngle(_axis, elapsed * 0.9 + n.phase);
        const s = (0.72 + this.audioMetrics.bass * 0.5) * pulseScale;
        _scale.set(s, s, s);
        _mat4.compose(_vec3, _quat, _scale);
        this.awarenessMesh.setMatrixAt(i, _mat4);
      }
      this.awarenessMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.config.swarm) {
      for (let i = 0; i < this.boids.length; i++) {
        const b = this.boids[i];
        b.angle += b.speed * delta * (1 + this.audioMetrics.mids * 1.5);
        const rad = b.radius + Math.sin(elapsed * 1.5 + b.phase) * 0.8 + this.transitionBurst * 1.6;
        const s = 0.85 + Math.sin(elapsed * 3 + b.phase) * 0.25 + this.audioMetrics.bass * 0.5;
        _scale.set(s, s, s);
        _quat.setFromAxisAngle(_axis, elapsed * 1.5 + b.phase);
        _vec3.set(
          Math.cos(b.angle) * rad,
          b.yOffset + Math.sin(elapsed * 2 + b.phase) * 0.9,
          Math.sin(b.angle) * rad * 0.45
        );
        _mat4.compose(_vec3, _quat, _scale);
        this.swarmInstanced.setMatrixAt(i, _mat4);
      }
      this.swarmInstanced.instanceMatrix.needsUpdate = true;
    }

    if (this.config.gelCore) {
      this.gelShaderMat.uniforms.uTime.value = elapsed;
      this.gelShaderMat.uniforms.uBass.value = this.audioMetrics.bass + this.transitionBurst * 0.6;
      this.gelShaderMat.uniforms.uOpacity.value = 0.32 * this.config.intensity;
      this.gelCoreMesh.rotation.x = elapsed * 0.14;
      this.gelCoreMesh.rotation.y = elapsed * 0.22;
    }

    if (this.config.horizonGrid) {
      this.horizonGrid.position.z = (elapsed * 2.5) % 3;
      this.horizonMat.opacity = (0.18 + this.audioMetrics.bass * 0.25) * this.config.intensity;
    }

    this.renderer.render(this.scene, this.camera);

    if (isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.destroyed) {
          this.frameId = requestAnimationFrame(this.tick);
        }
      });
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    this.frameId = requestAnimationFrame(this.tick);
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);

    this.motePoints.geometry.dispose();
    this.moteMat.dispose();
    this.awarenessMesh.geometry.dispose();
    this.awarenessMat.dispose();
    this.swarmInstanced.geometry.dispose();
    this.swarmMat.dispose();
    this.gelCoreMesh.geometry.dispose();
    this.gelShaderMat.dispose();
    this.horizonGrid.geometry.dispose();
    this.horizonMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
