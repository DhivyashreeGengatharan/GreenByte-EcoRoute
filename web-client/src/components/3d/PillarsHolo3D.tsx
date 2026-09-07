import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WindIcon, ZapIcon, ShieldCheckIcon, ThermometerIcon } from '../ui/Icons';
import './PillarsHolo3D.css';

type PillarKey = 'aqi' | 'flow' | 'density' | 'thermal';

interface PillarMeta {
  key: PillarKey;
  name: string;
  weight: string;
  desc: string;
  formula: string;
  icon: React.ReactNode;
}

const PILLARS: PillarMeta[] = [
  {
    key: 'aqi',
    name: 'Air Quality Index (AQI)',
    weight: '40% WEIGHT',
    desc: 'Atmospheric telemetry measuring PM2.5 & PM10 particulates from Open-Meteo along route vectors.',
    formula: 'W_aqi = 0.40 × (PM2.5 / Baseline_Limit)',
    icon: <WindIcon size={20} color="#10b981" />
  },
  {
    key: 'flow',
    name: 'Segment Flow Velocity',
    weight: '30% WEIGHT',
    desc: 'OSRM per-segment speed annotations compared against free-flow baselines to penalize idling combustion.',
    formula: 'W_flow = 0.30 × (1 - V_actual / V_freeflow)',
    icon: <ZapIcon size={20} color="#00f0ff" />
  },
  {
    key: 'density',
    name: 'Urban Building Density',
    weight: '20% WEIGHT',
    desc: 'Mapbox structural footprint index identifying architectural canyons that trap vehicle exhausts.',
    formula: 'W_dense = 0.20 × Canyon_Aspect_Ratio',
    icon: <ShieldCheckIcon size={20} color="#38bdf8" />
  },
  {
    key: 'thermal',
    name: 'Thermal Exposure Index',
    weight: '10% WEIGHT',
    desc: 'Microclimate surface temperatures revealing urban heat islands that spike ozone formation.',
    formula: 'W_therm = 0.10 × (T_surface - T_ambient)',
    icon: <ThermometerIcon size={20} color="#f59e0b" />
  }
];

export const PillarsHolo3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedPillar, setSelectedPillar] = useState<PillarKey>('aqi');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 600;
    let height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 10, 26);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Dynamic lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0x00f0ff, 2.5, 40);
    pointLight.position.set(10, 15, 10);
    scene.add(pointLight);

    const rimLight = new THREE.PointLight(0x10b981, 2.0, 30);
    rimLight.position.set(-10, -5, -10);
    scene.add(rimLight);

    // Objects to animate & clean up
    let animUpdate: (elapsed: number) => void = () => {};

    // ── Build 3D Visualizer per Selected Pillar ──
    if (selectedPillar === 'aqi') {
      // Atmospheric PM2.5 Dispersal Vortex
      const particleCount = 1000;
      const vGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(particleCount * 3);
      const cols = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const r = 5.5 + Math.random() * 2.2;
        pos[i * 3] = r * Math.cos(u);
        pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
        pos[i * 3 + 2] = r * Math.sin(u);

        const isClean = Math.random() > 0.35;
        cols[i * 3] = isClean ? 0.06 : 0.95;
        cols[i * 3 + 1] = isClean ? 0.95 : 0.25;
        cols[i * 3 + 2] = isClean ? 0.62 : 0.15;
      }
      vGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      vGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

      const vMat = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const vPoints = new THREE.Points(vGeo, vMat);
      modelGroup.add(vPoints);

      // Outer Sensor Boundary Rings
      const ringGeo = new THREE.TorusGeometry(6.5, 0.08, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      modelGroup.add(ring);

      animUpdate = (elapsed) => {
        vPoints.rotation.y = elapsed * 0.45;
        ring.rotation.z = elapsed * 0.1;
      };
    } else if (selectedPillar === 'flow') {
      // Flow Velocity Streamlines
      const curveCount = 8;
      const linesGroup = new THREE.Group();
      modelGroup.add(linesGroup);

      const pulseSpheres: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; speed: number; offset: number }[] = [];

      for (let i = 0; i < curveCount; i++) {
        const yPos = (i - 4) * 1.5;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-12, yPos, (Math.random() - 0.5) * 4),
          new THREE.Vector3(-4, yPos + Math.sin(i) * 2, (Math.random() - 0.5) * 6),
          new THREE.Vector3(4, yPos - Math.cos(i) * 2, (Math.random() - 0.5) * 6),
          new THREE.Vector3(12, yPos, (Math.random() - 0.5) * 4)
        ]);

        const pts = curve.getPoints(50);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: i % 2 === 0 ? 0x00f0ff : 0x10b981,
          transparent: true,
          opacity: 0.6
        });
        const line = new THREE.Line(geo, mat);
        linesGroup.add(line);

        const sphereGeo = new THREE.SphereGeometry(0.25, 12, 12);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        linesGroup.add(sphere);

        pulseSpheres.push({
          mesh: sphere,
          curve,
          speed: 0.15 + Math.random() * 0.15,
          offset: Math.random()
        });
      }

      animUpdate = (elapsed) => {
        pulseSpheres.forEach((p) => {
          const t = (elapsed * p.speed + p.offset) % 1;
          const pos = p.curve.getPoint(t);
          p.mesh.position.copy(pos);
        });
      };
    } else if (selectedPillar === 'density') {
      // Urban Canyon Wind Blockage Mesh
      const buildingsGroup = new THREE.Group();
      modelGroup.add(buildingsGroup);

      for (let x = -8; x <= 8; x += 4) {
        for (let z = -8; z <= 8; z += 4) {
          const h = 4 + Math.random() * 7;
          const bGeo = new THREE.BoxGeometry(2.4, h, 2.4);
          const edges = new THREE.EdgesGeometry(bGeo);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
          );
          line.position.set(x, h / 2 - 4, z);
          buildingsGroup.add(line);
        }
      }

      animUpdate = (elapsed) => {
        buildingsGroup.rotation.y = elapsed * 0.15;
      };
    } else {
      // Thermal Microclimate Mesh
      const planeGeo = new THREE.PlaneGeometry(16, 16, 24, 24);
      const posAttr = planeGeo.attributes.position;
      const count = posAttr.count;
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const dist = Math.sqrt(x * x + y * y);
        // Heat island in center (amber/red), cooler on edges (cyan)
        if (dist < 4.5) {
          colors[i * 3] = 0.96;
          colors[i * 3 + 1] = 0.45;
          colors[i * 3 + 2] = 0.1;
        } else {
          colors[i * 3] = 0.0;
          colors[i * 3 + 1] = 0.85;
          colors[i * 3 + 2] = 0.95;
        }
      }
      planeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const planeMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        wireframe: true,
        roughness: 0.3
      });
      const thermalMesh = new THREE.Mesh(planeGeo, planeMat);
      thermalMesh.rotation.x = -Math.PI / 2.8;
      modelGroup.add(thermalMesh);

      animUpdate = (elapsed) => {
        const p = planeGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < count; i++) {
          const x = p.getX(i);
          const y = p.getY(i);
          const z = Math.sin(x * 0.6 + elapsed * 2) * Math.cos(y * 0.6 + elapsed * 2) * 1.2;
          p.setZ(i, z);
        }
        p.needsUpdate = true;
        thermalMesh.rotation.z = elapsed * 0.08;
      };
    }

    // ── Mouse Drag Orbit Controls ──
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotY = 0;
    let rotX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      rotY += dx * 0.01;
      rotX = Math.max(-0.5, Math.min(0.5, rotX + dy * 0.01));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 600;
      height = container.clientHeight || 460;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // ── Render Loop ──
    let animId: number;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const elapsed = clock.getElapsedTime();

      modelGroup.rotation.y += (rotY - modelGroup.rotation.y) * 0.1;
      modelGroup.rotation.x += (rotX - modelGroup.rotation.x) * 0.1;

      animUpdate(elapsed);
      renderer.render(scene, camera);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [selectedPillar]);

  return (
    <div className="pillars-holo-container">
      {/* 3D Holo Viewport */}
      <div className="holo-viewport-card">
        <div ref={mountRef} className="holo-canvas-ref" />

        <div className="holo-viewport-overlay">
          <div className="holo-status-pill">
            <span className="holo-dot" />
            <span>ALGORITHMIC PHYSICS ENGINE · LIVE 3D TELEMETRY</span>
          </div>
        </div>

        <div className="holo-rotate-hint">
          <span>🖱️ Click & Drag to inspect 3D geometry</span>
        </div>
      </div>

      {/* Pillar Selector List */}
      <div className="pillar-selector-list">
        {PILLARS.map((p) => {
          const isActive = selectedPillar === p.key;
          return (
            <button
              key={p.key}
              type="button"
              className={`pillar-item-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedPillar(p.key)}
            >
              <div className="pillar-info-left">
                <div className="pillar-icon-box">{p.icon}</div>
                <div>
                  <div className="pillar-title-text">{p.name}</div>
                  <div className="pillar-desc-text">{p.desc}</div>
                </div>
              </div>
              <span className="pillar-badge-weight">{p.weight}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PillarsHolo3D;
