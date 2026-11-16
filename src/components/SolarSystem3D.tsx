import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Pause, Play, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { SOLAR_SYSTEM_BODIES } from '../data/solarSystem';
import { localize, t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createPlanetCanvasTexture(baseHex: string, accentHex: string, id: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 256);

  if (id === 'sun') {
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = i % 2 === 0 ? accentHex : '#EA580C';
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, 3 + Math.random() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'jupiter' || id === 'saturn') {
    for (let y = 0; y < 256; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? accentHex : baseHex;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(0, y, 512, 6);
    }
    if (id === 'jupiter') {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#B91C1C';
      ctx.beginPath();
      ctx.ellipse(240, 155, 28, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'earth') {
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.ellipse(
        50 + (i * 83) % 420,
        45 + (i * 41) % 160,
        18 + (i % 4) * 10,
        12 + (i % 3) * 8,
        i * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 240, 512, 16);
  } else {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = accentHex;
    for (let i = 0; i < 65; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, 4 + Math.random() * 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSpacecraftProbeGroup(): THREE.Group {
  const probe = new THREE.Group();
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xeab308,
    metalness: 0.92,
    roughness: 0.22,
    clearcoat: 0.4,
  });
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.35,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
  const boomMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.5,
    metalness: 0.75,
    roughness: 0.25,
  });

  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 8), goldMat);
  const dish = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.01, 0),
        new THREE.Vector2(0.16, 0.04),
        new THREE.Vector2(0.28, 0.12),
      ],
      20
    ),
    dishMat
  );
  dish.position.y = 0.13;
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.75, 6), boomMat);
  boom.rotation.z = Math.PI / 2;
  boom.position.x = 0.42;

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.35), boomMat);
  wingL.position.set(-0.15, 0, 0.24);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.35), boomMat);
  wingR.position.set(-0.15, 0, -0.24);

  probe.add(bus, dish, boom, wingL, wingR);
  return probe;
}

export function SolarSystem3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedPlanetId = useAtlasStore((s) => s.selectedPlanetId);
  const setSelectedPlanetId = useAtlasStore((s) => s.setSelectedPlanetId);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const quality = useAtlasStore((s) => s.progress.preferences.graphicsQuality);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);

  const [playing, setPlaying] = useState(!reducedMotion);
  const [speedMult, setSpeedMult] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [hudHidden, setHudHidden] = useState(false);

  const playingRef = useRef(playing);
  const speedRef = useRef(speedMult);
  const selectedRef = useRef(selectedPlanetId);
  const orbitsGroupRef = useRef<THREE.Group | null>(null);
  playingRef.current = playing;
  speedRef.current = speedMult;
  selectedRef.current = selectedPlanetId;

  useEffect(() => {
    if (orbitsGroupRef.current) {
      orbitsGroupRef.current.visible = showOrbits;
    }
  }, [showOrbits]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060c);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 400);
    camera.position.set(0, 26, 46);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && quality !== 'low',
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.3));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    let composer: EffectComposer | null = null;
    if (!isSoftwareGl && quality !== 'low') {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(
        new UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.5, 0.8)
      );
    }

    const ambient = new THREE.HemisphereLight(0xcbd5e1, 0x0f172a, 0.45);
    scene.add(ambient);

    const sunLight = new THREE.PointLight(0xfff1d0, 3.2, 180, 0.5);
    scene.add(sunLight);

    // Starfield
    const starCount = quality === 'low' ? 700 : 2000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 90 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xf8fafc, size: 0.18, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Asteroid Belt InstancedMesh between Mars & Jupiter
    const asteroidCount = quality === 'low' ? 180 : 450;
    const astGeo = new THREE.DodecahedronGeometry(0.11, 0);
    const astMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9, metalness: 0.1 });
    const asteroidBelt = new THREE.InstancedMesh(astGeo, astMat, asteroidCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < asteroidCount; i++) {
      const angle = (i / asteroidCount) * Math.PI * 2 + Math.random() * 0.2;
      const rad = 18.2 + Math.random() * 3.2;
      dummy.position.set(Math.cos(angle) * rad, (Math.random() - 0.5) * 0.9, Math.sin(angle) * rad);
      const s = 0.5 + Math.random() * 1.1;
      dummy.scale.set(s, s * 0.8, s);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      dummy.updateMatrix();
      asteroidBelt.setMatrixAt(i, dummy.matrix);
    }
    asteroidBelt.computeBoundingSphere();
    scene.add(asteroidBelt);

    const orbitsGroup = new THREE.Group();
    orbitsGroupRef.current = orbitsGroup;
    scene.add(orbitsGroup);

    const bodyMeshes = new Map<
      string,
      {
        group: THREE.Group;
        planetMesh: THREE.Mesh;
        angle: number;
        orbitRadius: number;
        orbitSpeed: number;
        moonGroup?: THREE.Group;
      }
    >();
    const clickables: THREE.Object3D[] = [];
    const createdTextures: THREE.Texture[] = [];

    SOLAR_SYSTEM_BODIES.forEach((body, index) => {
      const group = new THREE.Group();
      const tex = createPlanetCanvasTexture(body.colorHex, body.accentHex, body.id);
      createdTextures.push(tex);

      const sphereGeo = new THREE.SphereGeometry(body.visualSize, 36, 36);
      const mat =
        body.id === 'sun'
          ? new THREE.MeshBasicMaterial({ map: tex })
          : new THREE.MeshStandardMaterial({
              map: tex,
              roughness: 0.65,
              metalness: 0.08,
            });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.rotation.z = THREE.MathUtils.degToRad(body.axialTiltDeg);
      mesh.userData = { planetId: body.id };
      group.add(mesh);
      clickables.push(mesh);

      if (body.id === 'sun') {
        const coronaGeo = new THREE.SphereGeometry(body.visualSize * 1.24, 32, 32);
        const coronaMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.22,
          side: THREE.BackSide,
        });
        group.add(new THREE.Mesh(coronaGeo, coronaMat));
      }

      if (body.hasRings) {
        const ringGeo = new THREE.RingGeometry(body.visualSize * 1.38, body.visualSize * 2.25, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: body.id === 'saturn' ? 0xe7d3a3 : 0x67e8f9,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: body.id === 'saturn' ? 0.78 : 0.35,
          roughness: 0.8,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 + THREE.MathUtils.degToRad(body.axialTiltDeg * 0.4);
        group.add(ring);
      }

      let moonGroup: THREE.Group | undefined;
      if (body.id === 'earth') {
        moonGroup = new THREE.Group();
        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 })
        );
        moonMesh.position.set(1.5, 0.1, 0);
        moonGroup.add(moonMesh);
        group.add(moonGroup);
      } else if (body.id === 'saturn' || body.id === 'jupiter') {
        moonGroup = new THREE.Group();
        const probe = createSpacecraftProbeGroup();
        probe.position.set(body.visualSize + 1.35, 0.35, 0);
        moonGroup.add(probe);
        group.add(moonGroup);
      }

      if (body.visualOrbitRadius > 0) {
        const orbitGeo = new THREE.RingGeometry(body.visualOrbitRadius - 0.03, body.visualOrbitRadius + 0.03, 128);
        const orbitMat = new THREE.MeshBasicMaterial({
          color: body.type === 'dwarf-planet' ? 0x94a3b8 : 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: body.type === 'dwarf-planet' ? 0.16 : 0.24,
        });
        const orbitLine = new THREE.Mesh(orbitGeo, orbitMat);
        orbitLine.rotation.x = Math.PI / 2;
        orbitsGroup.add(orbitLine);
      }

      const initialAngle = index * 1.15;
      group.position.set(
        Math.cos(initialAngle) * body.visualOrbitRadius,
        0,
        Math.sin(initialAngle) * body.visualOrbitRadius
      );
      scene.add(group);

      bodyMeshes.set(body.id, {
        group,
        planetMesh: mesh,
        angle: initialAngle,
        orbitRadius: body.visualOrbitRadius,
        orbitSpeed: body.orbitSpeed,
        moonGroup,
      });
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4;
    controls.maxDistance = 120;

    // Raycast click to focus planet
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPt = { x: 0, y: 0 };

    const onDown = (e: PointerEvent) => {
      downPt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const pid = hits[0].object.userData.planetId as string;
        setSelectedPlanetId(pid);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) renderer.compile(scene, camera);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    const _targetPos = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);

      if (playingRef.current) {
        asteroidBelt.rotation.y += delta * 0.04 * speedRef.current;
        bodyMeshes.forEach((entry) => {
          entry.planetMesh.rotation.y += delta * 0.35;
          if (entry.moonGroup) entry.moonGroup.rotation.y += delta * 1.8;
          if (entry.orbitRadius > 0) {
            entry.angle += delta * entry.orbitSpeed * 0.22 * speedRef.current;
            entry.group.position.set(
              Math.cos(entry.angle) * entry.orbitRadius,
              0,
              Math.sin(entry.angle) * entry.orbitRadius
            );
          }
        });
      }

      // Smooth camera target follow selected celestial body
      const focused = bodyMeshes.get(selectedRef.current);
      if (focused) {
        _targetPos.copy(focused.group.position);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetPos.x, 4, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetPos.y, 4, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetPos.z, 4, delta);
      }

      controls.update();
      if (composer && !isSoftwareGl) composer.render();
      else renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      createdTextures.forEach((t) => t.dispose());
      starGeo.dispose();
      starMat.dispose();
      astGeo.dispose();
      astMat.dispose();
      composer?.dispose();
      renderer.dispose();
    };
  }, [quality, setSelectedPlanetId]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mountRef} className="h-full w-full" />

      {/* Top scientific scaling notice */}
      <div className="pointer-events-none absolute left-4 top-4 right-4 z-10 flex justify-between items-start gap-4">
        <div className="pointer-events-auto max-w-md rounded-2xl webgl-hud-surface px-3.5 py-2 text-[11px] text-slate-300">
          {t(lang, 'artisticScalingNotice')}
        </div>
        <button
          type="button"
          onClick={() => setHudHidden((h) => !h)}
          className="pointer-events-auto tactile-press rounded-xl webgl-hud-surface px-3 py-1.5 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          {hudHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {hudHidden ? t(lang, 'showControls') : t(lang, 'hideControls')}
        </button>
      </div>

      {/* macOS Dock-Inspired Planetary Control Bar */}
      {!hudHidden && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[min(920px,94vw)] rounded-2xl webgl-hud-surface px-4 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="tactile-press flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_-4px_rgba(128,128,128,0.65)] cursor-pointer"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? 'Pause' : 'Orbit'}
              </button>

              <div className="flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-900/75 p-0.5 text-xs">
                {[0.5, 1, 3, 6].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeedMult(s)}
                    className={`px-2.5 py-1 rounded-lg font-mono-tabular cursor-pointer transition-colors ${
                      speedMult === s ? 'bg-blue-700 text-white font-semibold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowOrbits((o) => !o)}
                className="tactile-press rounded-xl border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-blue-500/60 cursor-pointer"
              >
                Orbits: {showOrbits ? 'On' : 'Off'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlanetId('sun')}
                className="tactile-press rounded-xl border border-slate-700/80 p-1.5 text-slate-300 hover:text-white hover:border-blue-500/60 cursor-pointer"
                title="Focus Sun"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
              {SOLAR_SYSTEM_BODIES.map((body) => {
                const active = selectedPlanetId === body.id;
                return (
                  <button
                    key={body.id}
                    type="button"
                    onClick={() => setSelectedPlanetId(body.id)}
                    className={`tactile-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                      active
                        ? 'bg-blue-700 text-white font-semibold shadow-sm scale-[1.03]'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:-translate-y-0.5'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/25"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${body.accentHex}, ${body.colorHex})`,
                      }}
                    />
                    <span>{localize(body.name, lang).split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
