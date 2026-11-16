import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAtlasStore } from '../../store/useAtlasStore';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uDark;
  uniform vec2 uMouse;
  uniform vec2 uRes;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = rot * p * 2.03 + 11.7;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - 0.5;
    p.x *= uRes.x / max(uRes.y, 1.0);

    float t = uTime * 0.018;
    vec2 m = (uMouse - 0.5) * 0.22;

    vec2 q = p * 1.25 + m;
    float n1 = fbm(q * 1.15 + vec2(t * 0.7, -t * 0.28));
    float n2 = fbm(q * 2.1 + vec2(-t * 0.42, t * 0.55) + n1 * 1.35);
    float n3 = fbm(q * 3.4 + vec2(t * 0.22, n2 * 0.85) + m * 1.6);

    float field = smoothstep(0.18, 0.92, n1 * 0.62 + n2 * 0.28 + n3 * 0.16);

    vec3 base = mix(vec3(0.949, 0.956, 0.973), vec3(0.017, 0.021, 0.036), uDark);
    vec3 c1 = mix(vec3(0.48, 0.64, 0.96), vec3(0.12, 0.28, 0.72), uDark);
    vec3 c2 = mix(vec3(0.78, 0.71, 0.98), vec3(0.34, 0.21, 0.62), uDark);
    vec3 c3 = mix(vec3(0.55, 0.9, 0.92), vec3(0.06, 0.36, 0.44), uDark);

    vec3 col = base;
    col += c1 * (n1 * 0.42) * (0.32 + 0.68 * field);
    col += c2 * (n2 * 0.26) * (0.4 + 0.6 * field);
    col += c3 * (n3 * 0.18);

    // thin caustic filaments
    float lines = sin((n1 + n2) * 17.0 + uTime * 0.32);
    float caustic = smoothstep(0.86, 1.0, lines) * 0.14;
    col += mix(vec3(0.55, 0.7, 0.95), vec3(0.7, 0.9, 1.0), uDark) * caustic;

    // centre bloom
    float bloom = smoothstep(1.25, 0.0, length(p * vec2(0.9, 1.15)));
    col += c1 * bloom * (0.16 + 0.08 * uDark);

    // gentle vignette, stronger in dark mode
    float vig = smoothstep(1.35, 0.2, length(p * vec2(0.95, 1.05)));
    col *= mix(1.0, mix(0.78, 0.66, uDark), 1.0 - vig);

    // film grain
    float g = hash(uv * uRes * 0.85 + uTime) - 0.5;
    col += g * 0.022;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Full-viewport WebGL "liquid light" field.
 * One plane, one shader, pointer parallax, zero layout impact.
 */
export function LiquidBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const theme = useAtlasStore((s) => s.progress.preferences.theme);
  const reducedMotion = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  const quality = useAtlasStore((s) => s.progress.preferences.graphicsQuality);
  const [failed, setFailed] = useState(false);

  const pointer = useRef({ x: 0.5, y: 0.5 });
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setFailed(true);
      return;
    }

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      quality === 'high' ? 1.75 : quality === 'balanced' ? 1.35 : 1
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uDark: { value: themeRef.current === 'dark' ? 1 : 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(1, 1) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    const resize = () => {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      uniforms.uRes.value.set(width * pixelRatio, height * pixelRatio);
    };
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    let disposed = false;
    let smoothX = 0.5;
    let smoothY = 0.5;

    const render = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();
      uniforms.uTime.value = elapsed;

      smoothX += (pointer.current.x - smoothX) * 0.035;
      smoothY += (pointer.current.y - smoothY) * 0.035;
      uniforms.uMouse.value.set(smoothX, smoothY);
      uniforms.uDark.value += ((themeRef.current === 'dark' ? 1 : 0) - uniforms.uDark.value) * 0.05;

      renderer.render(scene, camera);
      if (!reducedMotion) {
        raf = requestAnimationFrame(render);
      }
    };

    render();
    if (reducedMotion) {
      // one static frame is enough when motion is reduced
      uniforms.uTime.value = 12;
      renderer.render(scene, camera);
    }

    const onPointer = (event: PointerEvent) => {
      pointer.current.x = event.clientX / window.innerWidth;
      pointer.current.y = event.clientY / window.innerHeight;
    };
    const onResize = () => resize();
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reducedMotion) {
        raf = requestAnimationFrame(render);
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [quality, reducedMotion]);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        className="liquid-mesh pointer-events-none fixed inset-0 z-0 opacity-70 animate-drift"
      />
    );
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ contain: 'strict' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(255,255,255,0.16),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_50%_115%,rgba(10,132,255,0.1),transparent_58%)]" />
    </div>
  );
}
