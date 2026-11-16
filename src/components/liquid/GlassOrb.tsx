import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAtlasStore } from '../../store/useAtlasStore';

const ORB_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    vPosition = position;
    gl_Position = projectionMatrix * mv;
  }
`;

const ORB_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uDark;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.35);

    float bands = sin(vPosition.y * 5.2 + uTime * 0.55 + vPosition.x * 1.8);
    float bands2 = sin(vPosition.z * 6.4 - uTime * 0.42 + vPosition.y * 2.2);
    float flow = 0.5 + 0.5 * (bands * 0.55 + bands2 * 0.45);

    vec3 deep = mix(vec3(0.014, 0.035, 0.09), vec3(0.008, 0.012, 0.03), uDark);
    vec3 irisA = mix(vec3(0.24, 0.52, 1.0), vec3(0.16, 0.42, 1.0), uDark);
    vec3 irisB = mix(vec3(0.62, 0.45, 1.0), vec3(0.54, 0.34, 0.98), uDark);
    vec3 irisC = mix(vec3(0.24, 0.92, 0.9), vec3(0.1, 0.72, 0.76), uDark);

    vec3 iridescence = mix(irisA, irisB, clamp(0.5 + 0.5 * sin(vPosition.x * 2.4 + uTime * 0.3), 0.0, 1.0));
    iridescence = mix(iridescence, irisC, flow * 0.42);

    vec3 color = deep + iridescence * (0.2 + flow * 0.46);
    color += iridescence * fresnel * 1.35;
    color += vec3(1.0) * pow(fresnel, 4.0) * mix(0.36, 0.74, uDark);

    float alpha = mix(0.34, 0.86, fresnel) + flow * 0.09;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.96));
  }
`;

const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float fade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
    gl_FragColor = vec4(uColor, fade * uOpacity);
  }
`;

function cssFallback(dark: boolean) {
  return `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0) 18%),
    radial-gradient(circle at 30% 26%, ${dark ? 'rgba(152,196,255,0.95)' : 'rgba(96,166,255,0.9)'} 0%, ${
      dark ? 'rgba(96,118,255,0.65)' : 'rgba(94,120,235,0.6)'
    } 24%, ${dark ? 'rgba(36,28,86,0.9)' : 'rgba(196,208,255,0.9)'} 54%, ${
      dark ? 'rgba(4,6,18,0.96)' : 'rgba(228,235,255,0.95)'
    } 76%)`;
}

export interface GlassOrbProps {
  className?: string;
  /** Visual presence, 0.5 – 1.4. */
  intensity?: number;
  /** Render only the static frame. */
  static?: boolean;
}

/**
 * A real WebGL glass-surface orb: fresnel refraction shell, iridescent flow,
 * orbital rings, floating particles and pointer parallax.
 */
export function GlassOrb({ className = '', intensity = 1, static: forceStatic = false }: GlassOrbProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const theme = useAtlasStore((s) => s.progress.preferences.theme);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  const quality = useAtlasStore((s) => s.progress.preferences.graphicsQuality);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);

  const pointer = useRef({ x: 0, y: 0 });
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: quality !== 'low', powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.8 : quality === 'balanced' ? 1.4 : 1);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const cameraRig = new THREE.Group();
    const orbGroup = new THREE.Group();
    scene.add(cameraRig);
    cameraRig.add(orbGroup);

    const uniforms = {
      uTime: { value: 0 },
      uDark: { value: themeRef.current === 'dark' ? 1 : 0 },
    };

    const shellMat = new THREE.ShaderMaterial({
      vertexShader: ORB_VERT,
      fragmentShader: ORB_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.92, quality === 'low' ? 48 : 96, quality === 'low' ? 48 : 96), shellMat);
    orbGroup.add(shell);

    const innerMat = new THREE.MeshBasicMaterial({
      color: themeRef.current === 'dark' ? 0x5f9dff : 0x7cb6ff,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 4), innerMat);
    orbGroup.add(inner);

    const wireMat = new THREE.MeshBasicMaterial({
      color: themeRef.current === 'dark' ? 0x9fd4ff : 0x2f6cff,
      wireframe: true,
      transparent: true,
      opacity: 0.032,
      depthWrite: false,
    });
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.97, 2), wireMat);
    orbGroup.add(wire);

    // Orbital rings
    const rings: THREE.Mesh[] = [];
    const ringSpecs: Array<[number, number, number, number]> = [
      [2.62, 0.0045, 0.42, -0.34],
      [2.95, 0.003, -0.62, 0.92],
      [2.28, 0.0035, 1.02, 0.28],
    ];
    const ringColors = [0x79b8ff, 0xb39dff, 0x7fe9e2];
    ringSpecs.forEach(([radius, tube, tiltX, tiltZ], i) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(ringColors[i]) },
          uOpacity: { value: i === 0 ? 0.8 : 0.55 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 220), material);
      ring.rotation.x = Math.PI / 2 + tiltX * 0.35;
      ring.rotation.z = tiltZ;
      orbGroup.add(ring);
      rings.push(ring);
    });

    // Satellites on the rings
    const satellites: Array<{ mesh: THREE.Mesh; radius: number; phase: number; speed: number; tilt: THREE.Euler }> = [];
    const satGeometry = new THREE.SphereGeometry(0.035, 12, 12);
    for (let i = 0; i < 7; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xa9d8ff : i % 3 === 1 ? 0xc9b6ff : 0x9ff6ee,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(satGeometry, material);
      const ring = ringSpecs[i % ringSpecs.length];
      const tilt = new THREE.Euler(Math.PI / 2 + ring[2] * 0.35, 0, ring[3]);
      satellites.push({ mesh, radius: ring[0], phase: (i / 7) * Math.PI * 2, speed: 0.12 + i * 0.026, tilt });
      orbGroup.add(mesh);
    }

    // Ambient dust
    const starCount = quality === 'low' ? 180 : 520;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const r = 3.2 + Math.random() * 4.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: themeRef.current === 'dark' ? 0xbfe0ff : 0x355ea8,
      size: 0.022,
      transparent: true,
      opacity: themeRef.current === 'dark' ? 0.7 : 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Soft halo plane behind the orb
    const haloMat = new THREE.MeshBasicMaterial({
      color: themeRef.current === 'dark' ? 0x2b6cff : 0x9cc7ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), haloMat);
    halo.position.z = -2.2;
    cameraRig.add(halo);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const key = new THREE.DirectionalLight(0xbcd8ff, 2.4);
    key.position.set(3, 4, 5);
    const fill = new THREE.PointLight(0xa78bfa, 18, 16);
    fill.position.set(-4, -2, 3);
    const rim = new THREE.PointLight(0x5eead4, 10, 14);
    rim.position.set(2, -3, -4);
    scene.add(ambient, key, fill, rim);

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();

    const ringMaterials = rings.map((r) => r.material as THREE.ShaderMaterial);
    const clock = new THREE.Clock();
    let raf = 0;
    let disposed = false;
    let smoothX = 0;
    let smoothY = 0;
    let visibleNow = true;

    const renderFrame = (elapsed: number) => {
      const dark = themeRef.current === 'dark';
      uniforms.uTime.value = elapsed;
      uniforms.uDark.value += ((dark ? 1 : 0) - uniforms.uDark.value) * 0.05;
      shellMat.uniforms.uDark.value = uniforms.uDark.value;

      smoothX += (pointer.current.x - smoothX) * 0.055;
      smoothY += (pointer.current.y - smoothY) * 0.055;

      const t = elapsed * 0.1;
      orbGroup.rotation.y = t + smoothX * 0.55;
      orbGroup.rotation.x = -0.12 + smoothY * 0.32 + Math.sin(t * 0.6) * 0.05;
      wire.rotation.y = -t * 0.6;
      inner.rotation.y = t * 0.25;
      inner.rotation.x = t * 0.12;

      rings.forEach((ring, i) => {
        ring.rotation.z += 0.0008 * (i + 1) * 0.4;
      });

      satellites.forEach((sat) => {
        const angle = t * sat.speed * 3.2 + sat.phase;
        const local = new THREE.Vector3(Math.cos(angle) * sat.radius, 0, Math.sin(angle) * sat.radius);
        local.applyEuler(sat.tilt);
        sat.mesh.position.copy(local);
        sat.mesh.scale.setScalar(0.8 + Math.sin(angle * 2.4) * 0.24);
      });

      cameraRig.rotation.y = smoothX * 0.16;
      cameraRig.rotation.x = smoothY * 0.1;
      camera.position.z = 7.2 + Math.sin(elapsed * 0.22) * 0.08;
      camera.lookAt(0, 0, 0);

      haloMat.opacity = (dark ? 0.12 : 0.08) + Math.sin(elapsed * 0.6) * 0.025;
      if (ringMaterials[0]) {
        ringMaterials[0].uniforms.uOpacity.value = 0.65 + Math.sin(elapsed * 0.8) * 0.14;
      }

      const scale = Math.max(0.2, intensity);
      orbGroup.scale.setScalar(scale);
      halo.scale.setScalar(scale);

      renderer.render(scene, camera);
    };

    renderFrame(0);
    if (!reducedMotion && !forceStatic) {
      const loop = () => {
        if (disposed) return;
        if (visibleNow) renderFrame(clock.getElapsedTime());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const onPointer = (event: PointerEvent) => {
      pointer.current.x = event.clientX / window.innerWidth - 0.5;
      pointer.current.y = event.clientY / window.innerHeight - 0.5;
    };
    const onResize = () => resize();
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(host);
    const onVisibility = () => {
      visibleNow = !document.hidden;
      if (visibleNow && !reducedMotion && !forceStatic) clock.start();
    };

    const io = new IntersectionObserver(
      (entries) => {
        visibleNow = entries[0]?.isIntersecting ?? true;
        setVisible(visibleNow);
      },
      { rootMargin: '120px' }
    );
    io.observe(host);

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [quality, reducedMotion, forceStatic, intensity]);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none ${className.includes('absolute') ? '' : 'relative'} ${className}`}
        style={{
          background: cssFallback(theme === 'dark'),
          borderRadius: '9999px',
          filter: 'blur(0.2px)',
          boxShadow:
            theme === 'dark'
              ? '0 40px 120px -30px rgba(10,132,255,0.55), inset 0 0 60px rgba(255,255,255,0.08)'
              : '0 40px 120px -36px rgba(40,86,190,0.45), inset 0 0 60px rgba(255,255,255,0.65)',
        }}
      />
    );
  }

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none ${className.includes('absolute') ? '' : 'relative'} ${className}`}
      style={{ opacity: visible ? 1 : 0.9, transition: 'opacity 600ms ease' }}
    />
  );
}
