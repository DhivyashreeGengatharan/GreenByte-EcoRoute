import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './DualCorridor3D.css';

export const DualCorridor3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeMode, setActiveMode] = useState<'compare' | 'smog' | 'airflow'>('compare');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040814);
    scene.fog = new THREE.FogExp2(0x040814, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 26, 38);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Root world group for orbit rotation
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // ── Lighting ──
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const redHazardLight = new THREE.PointLight(0xef4444, 3.5, 35);
    redHazardLight.position.set(-14, 8, 0);
    worldGroup.add(redHazardLight);

    const greenEcoLight = new THREE.PointLight(0x10b981, 3.5, 35);
    greenEcoLight.position.set(14, 8, 0);
    worldGroup.add(greenEcoLight);

    const centerRim = new THREE.DirectionalLight(0x00f0ff, 1.8);
    centerRim.position.set(0, 30, 20);
    scene.add(centerRim);

    // ── Ground & Division ──
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070d1a,
      roughness: 0.85,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    worldGroup.add(ground);

    // Center divider strip with cyber neon line
    const dividerGeo = new THREE.BoxGeometry(0.6, 0.4, 50);
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.y = 0.2;
    worldGroup.add(divider);

    const neonLineGeo = new THREE.PlaneGeometry(0.1, 50);
    const neonLineMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide
    });
    const neonLine = new THREE.Mesh(neonLineGeo, neonLineMat);
    neonLine.rotation.x = -Math.PI / 2;
    neonLine.position.y = 0.42;
    worldGroup.add(neonLine);

    // ── Left Corridor: Toxic Congestion Highway ──
    const leftRoadGeo = new THREE.PlaneGeometry(12, 50);
    const leftRoadMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9
    });
    const leftRoad = new THREE.Mesh(leftRoadGeo, leftRoadMat);
    leftRoad.rotation.x = -Math.PI / 2;
    leftRoad.position.set(-11, 0.05, 0);
    worldGroup.add(leftRoad);

    // Congested vehicles on left road (red brake lights, stopped)
    const carGeo = new THREE.BoxGeometry(1.6, 0.8, 3.2);
    const badCarMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const tailLightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.05);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });

    const leftCars: THREE.Group[] = [];
    const carPositions = [
      { x: -13, z: -18 }, { x: -9, z: -14 },
      { x: -13, z: -10 }, { x: -9, z: -6 },
      { x: -13, z: -2 },  { x: -9, z: 2 },
      { x: -13, z: 6 },   { x: -9, z: 10 },
      { x: -13, z: 14 },  { x: -9, z: 18 }
    ];

    carPositions.forEach((pos) => {
      const carGroup = new THREE.Group();
      const carBody = new THREE.Mesh(carGeo, badCarMat);
      carBody.position.y = 0.5;
      carGroup.add(carBody);

      // Tail lights
      const tl1 = new THREE.Mesh(tailLightGeo, tailLightMat);
      tl1.position.set(-0.5, 0.5, 1.62);
      carGroup.add(tl1);
      const tl2 = new THREE.Mesh(tailLightGeo, tailLightMat);
      tl2.position.set(0.5, 0.5, 1.62);
      carGroup.add(tl2);

      carGroup.position.set(pos.x, 0, pos.z);
      worldGroup.add(carGroup);
      leftCars.push(carGroup);
    });

    // Left Canyon Buildings (Brutal concrete, windowless)
    const buildingGeo = new THREE.BoxGeometry(4.5, 12, 6);
    const badBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e2230,
      roughness: 0.95
    });

    for (let z = -20; z <= 20; z += 9) {
      const bHeight = 8 + Math.random() * 8;
      const bGeo = new THREE.BoxGeometry(5, bHeight, 7);
      const bMesh = new THREE.Mesh(bGeo, badBuildingMat);
      bMesh.position.set(-21, bHeight / 2, z);
      worldGroup.add(bMesh);
    }

    // Smog Particle Cloud (dense amber/red particles hanging over the highway)
    const smogCount = 450;
    const smogGeo = new THREE.BufferGeometry();
    const smogPos = new Float32Array(smogCount * 3);
    const smogCols = new Float32Array(smogCount * 3);

    for (let i = 0; i < smogCount; i++) {
      smogPos[i * 3] = -16 + Math.random() * 10;
      smogPos[i * 3 + 1] = 0.8 + Math.random() * 4.5;
      smogPos[i * 3 + 2] = -24 + Math.random() * 48;

      const isSevere = Math.random() > 0.4;
      smogCols[i * 3] = isSevere ? 0.95 : 0.75;
      smogCols[i * 3 + 1] = isSevere ? 0.25 : 0.45;
      smogCols[i * 3 + 2] = 0.15;
    }
    smogGeo.setAttribute('position', new THREE.BufferAttribute(smogPos, 3));
    smogGeo.setAttribute('color', new THREE.BufferAttribute(smogCols, 3));

    const smogMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const smogParticles = new THREE.Points(smogGeo, smogMat);
    worldGroup.add(smogParticles);

    // ── Right Corridor: EcoRoute Bio-Canopy Corridor ──
    const rightRoadGeo = new THREE.PlaneGeometry(12, 50);
    const rightRoadMat = new THREE.MeshStandardMaterial({
      color: 0x0f1d1f,
      roughness: 0.75
    });
    const rightRoad = new THREE.Mesh(rightRoadGeo, rightRoadMat);
    rightRoad.rotation.x = -Math.PI / 2;
    rightRoad.position.set(11, 0.05, 0);
    worldGroup.add(rightRoad);

    // Smooth moving eco electric car
    const ecoCarMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.8,
      roughness: 0.2,
      emissive: new THREE.Color(0x064e3b),
      emissiveIntensity: 0.5
    });
    const ecoHeadlightGeo = new THREE.BoxGeometry(0.35, 0.15, 0.05);
    const ecoHeadlightMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const ecoCars: { group: THREE.Group; speed: number }[] = [];
    [-15, 0, 15].forEach((zPos, idx) => {
      const carGroup = new THREE.Group();
      const body = new THREE.Mesh(carGeo, ecoCarMat);
      body.position.y = 0.5;
      carGroup.add(body);

      const hl1 = new THREE.Mesh(ecoHeadlightGeo, ecoHeadlightMat);
      hl1.position.set(-0.5, 0.5, -1.62);
      carGroup.add(hl1);
      const hl2 = new THREE.Mesh(ecoHeadlightGeo, ecoHeadlightMat);
      hl2.position.set(0.5, 0.5, -1.62);
      carGroup.add(hl2);

      carGroup.position.set(idx % 2 === 0 ? 9 : 13, 0, zPos);
      worldGroup.add(carGroup);
      ecoCars.push({ group: carGroup, speed: 0.25 + Math.random() * 0.1 });
    });

    // Right Green Architecture (Canopies, bio-towers, trees)
    const greenTowerMat = new THREE.MeshStandardMaterial({
      color: 0x062822,
      roughness: 0.7
    });
    const canopyMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.7
    });

    for (let z = -20; z <= 20; z += 9) {
      const bHeight = 6 + Math.random() * 7;
      const bGeo = new THREE.BoxGeometry(5, bHeight, 7);
      const bMesh = new THREE.Mesh(bGeo, greenTowerMat);
      bMesh.position.set(21, bHeight / 2, z);
      worldGroup.add(bMesh);

      // Living Green Facade panel
      const panelGeo = new THREE.PlaneGeometry(0.1, bHeight * 0.85);
      const panel = new THREE.Mesh(panelGeo, canopyMat);
      panel.position.set(18.4, bHeight * 0.45, z);
      panel.rotation.y = Math.PI / 2;
      worldGroup.add(panel);

      // Avenue Trees along curb
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.8, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2e1e });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(4.5, 0.9, z + 2);
      worldGroup.add(trunk);

      const foliageGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.6,
        emissive: new THREE.Color(0x047857),
        emissiveIntensity: 0.3
      });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.set(4.5, 2.4, z + 2);
      worldGroup.add(foliage);
    }

    // Clean Airflow Streamlines & Sparkling Phytoplankton
    const streamCount = 380;
    const streamGeo = new THREE.BufferGeometry();
    const streamPos = new Float32Array(streamCount * 3);
    const streamCols = new Float32Array(streamCount * 3);

    for (let i = 0; i < streamCount; i++) {
      streamPos[i * 3] = 6 + Math.random() * 10;
      streamPos[i * 3 + 1] = 0.5 + Math.random() * 5;
      streamPos[i * 3 + 2] = -24 + Math.random() * 48;

      const isCyan = Math.random() > 0.5;
      streamCols[i * 3] = isCyan ? 0.0 : 0.06;
      streamCols[i * 3 + 1] = isCyan ? 0.94 : 0.95;
      streamCols[i * 3 + 2] = isCyan ? 1.0 : 0.62;
    }
    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
    streamGeo.setAttribute('color', new THREE.BufferAttribute(streamCols, 3));

    const streamMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const streamParticles = new THREE.Points(streamGeo, streamMat);
    worldGroup.add(streamParticles);

    // ── Mouse Drag Orbit Controls ──
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetRotationY += deltaX * 0.008;
      targetRotationX = Math.max(-0.4, Math.min(0.6, targetRotationX + deltaY * 0.006));
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(22, Math.min(55, camera.position.z + e.deltaY * 0.02));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: true });

    // ── Window Resize ──
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 800;
      height = container.clientHeight || 520;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // ── Animation Loop ──
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth damping on world orbit
      worldGroup.rotation.y += (targetRotationY - worldGroup.rotation.y) * 0.08;
      worldGroup.rotation.x += (targetRotationX - worldGroup.rotation.x) * 0.08;

      // Animate Smog Brownian motion
      const smogPositions = smogGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < smogCount; i++) {
        smogPositions[i * 3 + 1] += Math.sin(elapsed * 2 + i) * 0.004;
        smogPositions[i * 3 + 2] += 0.015; // slow toxic drift
        if (smogPositions[i * 3 + 2] > 24) {
          smogPositions[i * 3 + 2] = -24;
        }
      }
      smogGeo.attributes.position.needsUpdate = true;

      // Animate Clean Airflow forward stream
      const streamPositions = streamGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < streamCount; i++) {
        streamPositions[i * 3 + 2] -= 0.18; // fast laminar flow
        if (streamPositions[i * 3 + 2] < -24) {
          streamPositions[i * 3 + 2] = 24;
        }
      }
      streamGeo.attributes.position.needsUpdate = true;

      // Move Eco cars smoothly
      ecoCars.forEach((item) => {
        item.group.position.z -= item.speed;
        if (item.group.position.z < -24) {
          item.group.position.z = 24;
        }
      });

      // Toxic cars subtle idling engine vibration
      leftCars.forEach((car, idx) => {
        car.position.y = Math.sin(elapsed * 12 + idx) * 0.02;
      });

      // Mode visualization toggles
      if (activeMode === 'smog') {
        smogMat.size = 2.2;
        smogMat.opacity = 0.95;
        streamMat.opacity = 0.15;
      } else if (activeMode === 'airflow') {
        smogMat.opacity = 0.15;
        streamMat.size = 2.0;
        streamMat.opacity = 1.0;
      } else {
        smogMat.size = 1.4;
        smogMat.opacity = 0.65;
        streamMat.size = 1.2;
        streamMat.opacity = 0.85;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      dividerGeo.dispose();
      dividerMat.dispose();
      smogGeo.dispose();
      smogMat.dispose();
      streamGeo.dispose();
      streamMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeMode]);

  return (
    <div className="dual-corridor-wrapper">
      {/* 3D Canvas Viewport */}
      <div ref={mountRef} className="dual-corridor-canvas-container" />

      {/* Top HUD Header */}
      <div className="dual-corridor-hud">
        <div className="hud-title-badge">
          <span className="hud-pulse-dot" />
          <span className="hud-title-text">SPATIAL EXPOSURE DIGITAL TWIN · 3D CORRIDOR LAB</span>
        </div>

        <div className="dual-corridor-modes">
          <button
            type="button"
            className={`mode-btn ${activeMode === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveMode('compare')}
          >
            ⚖️ Dual Comparison
          </button>
          <button
            type="button"
            className={`mode-btn ${activeMode === 'smog' ? 'active' : ''}`}
            onClick={() => setActiveMode('smog')}
          >
            ⚠️ Particulate Cloud
          </button>
          <button
            type="button"
            className={`mode-btn ${activeMode === 'airflow' ? 'active' : ''}`}
            onClick={() => setActiveMode('airflow')}
          >
            🍃 Clean Airflow
          </button>
        </div>
      </div>

      {/* Center Drag Hint */}
      <div className="orbit-hint-pill">
        <span>🖱️ Drag to Orbit 360° · Scroll to Zoom</span>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="dual-corridor-bottom-hud">
        {/* Left: Traditional Route Stats */}
        <div className="corridor-stat-card stat-card-bad">
          <div className="card-header-flex">
            <span className="card-header-title">CONVENTIONAL SHORTEST ROUTE</span>
            <span className="card-tag">IDLING BOTTLENECK</span>
          </div>
          <div className="card-metrics-grid">
            <div className="metric-col">
              <span className="metric-lbl">ESTIMATED AQI</span>
              <span className="metric-val bad-accent">184 HAZARDOUS</span>
            </div>
            <div className="metric-col">
              <span className="metric-lbl">AVG SPEED</span>
              <span className="metric-val">8 km/h (Idling)</span>
            </div>
            <div className="metric-col">
              <span className="metric-lbl">PM2.5 INHALATION</span>
              <span className="metric-val bad-accent">34.2 µg/trip</span>
            </div>
          </div>
        </div>

        {/* Right: EcoRoute Stats */}
        <div className="corridor-stat-card stat-card-good">
          <div className="card-header-flex">
            <span className="card-header-title">ECOROUTE ENVIRONMENTAL BIOPATH</span>
            <span className="card-tag">OPTIMAL CORRIDOR</span>
          </div>
          <div className="card-metrics-grid">
            <div className="metric-col">
              <span className="metric-lbl">ESTIMATED AQI</span>
              <span className="metric-val good-accent">26 PRISTINE</span>
            </div>
            <div className="metric-col">
              <span className="metric-lbl">AVG SPEED</span>
              <span className="metric-val">42 km/h (Flow)</span>
            </div>
            <div className="metric-col">
              <span className="metric-lbl">PM2.5 INHALATION</span>
              <span className="metric-val good-accent">4.8 µg (-86%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualCorridor3D;
