import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './DigitalTwin3D.css';

export interface DigitalTwin3DProps {
  initialIntervention?: string;
  onInterventionChange?: (id: string) => void;
  className?: string;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  initialIntervention = 'green-wall',
  onInterventionChange,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeIntervention, setActiveIntervention] = useState<string>(initialIntervention);
  const [cameraMode, setCameraMode] = useState<'drone' | 'skyline' | 'street'>('drone');
  const [aqiReduction, setAqiReduction] = useState({ before: 142, after: 68, reduction: 52 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.018);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 500);
    camera.position.set(30, 24, 34);
    camera.lookAt(0, 5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 2. High-Tech Cyber Lighting
    const ambient = new THREE.AmbientLight(0x1e293b, 1.4);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
    mainLight.position.set(35, 50, 25);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 2.5);
    cyanRim.position.set(-30, 15, -20);
    scene.add(cyanRim);

    const groundGlow = new THREE.PointLight(0x00ff9d, 2.5, 45);
    groundGlow.position.set(0, 2, 0);
    scene.add(groundGlow);

    // 3. Ground Plane & Holographic Grid
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050a15,
      roughness: 0.9,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x111c30);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // 4. Procedural Window Emissive Canvas Texture
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 128;
    winCanvas.height = 256;
    const winCtx = winCanvas.getContext('2d');
    if (winCtx) {
      winCtx.fillStyle = '#050c18';
      winCtx.fillRect(0, 0, 128, 256);
      for (let r = 4; r < 256; r += 12) {
        for (let c = 4; c < 128; c += 10) {
          const rand = Math.random();
          if (rand > 0.6) {
            winCtx.fillStyle = rand > 0.85 ? '#00f0ff' : rand > 0.72 ? '#ffb800' : '#ffffff';
            winCtx.fillRect(c, r, 6, 8);
          }
        }
      }
    }
    const windowTexture = new THREE.CanvasTexture(winCanvas);
    windowTexture.wrapS = THREE.RepeatWrapping;
    windowTexture.wrapT = THREE.RepeatWrapping;
    windowTexture.repeat.set(1, 2);

    // 5. Procedural Architectural City Skyline
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x0c1524,
      roughness: 0.25,
      metalness: 0.85,
      emissiveMap: windowTexture,
      emissive: new THREE.Color(0x0a2238),
      emissiveIntensity: 0.75
    });

    const buildingCoords = [
      { x: -16, z: -16 }, { x: -6, z: -18 }, { x: 8, z: -16 }, { x: 18, z: -18 },
      { x: -18, z: -4 },  { x: 18, z: -6 },
      { x: -18, z: 8 },   { x: 18, z: 8 },
      { x: -16, z: 18 },  { x: -6, z: 16 }, { x: 8, z: 18 },  { x: 18, z: 16 }
    ];

    buildingCoords.forEach((coord, idx) => {
      const bHeight = 10 + (idx % 5) * 4 + Math.random() * 6;
      const bWidth = 5.5 + Math.random() * 2;
      const bDepth = 5.5 + Math.random() * 2;

      const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const bMesh = new THREE.Mesh(bGeo, buildingMat);
      bMesh.position.set(coord.x, bHeight / 2, coord.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      buildingsGroup.add(bMesh);

      // Glowing Neon Structural Edges
      const edgeGeo = new THREE.EdgesGeometry(bGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: idx % 2 === 0 ? 0x00f0ff : 0x1e3a8a,
        transparent: true,
        opacity: 0.55
      });
      const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
      edgeLine.position.copy(bMesh.position);
      buildingsGroup.add(edgeLine);

      // Skyscraper Spire for taller towers
      if (bHeight > 18) {
        const spireGeo = new THREE.ConeGeometry(0.3, 4, 8);
        const spireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const spireMesh = new THREE.Mesh(spireGeo, spireMat);
        spireMesh.position.set(coord.x, bHeight + 2, coord.z);
        buildingsGroup.add(spireMesh);
      }
    });

    // 6. Central Eco-Skyscraper Target Tower
    const centralHeight = 22;
    const centralGeo = new THREE.BoxGeometry(8, centralHeight, 8);
    const centralMat = new THREE.MeshStandardMaterial({
      color: 0x081326,
      roughness: 0.2,
      metalness: 0.95,
      emissiveMap: windowTexture,
      emissive: new THREE.Color(0x06334a),
      emissiveIntensity: 0.85
    });
    const centralTower = new THREE.Mesh(centralGeo, centralMat);
    centralTower.position.set(0, centralHeight / 2, 0);
    centralTower.castShadow = true;
    centralTower.receiveShadow = true;
    scene.add(centralTower);

    // Glowing Neon Edges on Central Tower
    const centralEdgeGeo = new THREE.EdgesGeometry(centralGeo);
    const centralEdgeMat = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.95 });
    const centralEdgeLine = new THREE.LineSegments(centralEdgeGeo, centralEdgeMat);
    centralEdgeLine.position.copy(centralTower.position);
    scene.add(centralEdgeLine);

    // Rooftop Spire with Pulsing Aviation Warning Light
    const rooftopSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.2, 5, 8),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    rooftopSpire.position.set(0, centralHeight + 2.5, 0);
    scene.add(rooftopSpire);

    const beaconGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3d6e });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(0, centralHeight + 5, 0);
    scene.add(beaconMesh);

    // 7. High-Fidelity 3D Interventions
    const interventionGroup = new THREE.Group();
    scene.add(interventionGroup);

    // [A] Green Wall (Vertical Living Bio-Canopy on Tower Facade)
    const greenWallGroup = new THREE.Group();
    const greenWallBacking = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 15),
      new THREE.MeshStandardMaterial({
        color: 0x052e16,
        roughness: 0.7,
        metalness: 0.1,
        emissive: 0x024824,
        emissiveIntensity: 0.5
      })
    );
    greenWallBacking.position.set(0, 9.5, 4.05);
    greenWallGroup.add(greenWallBacking);

    // Bioluminescent Foliage Spores
    const foliageCount = 180;
    const foliageGeo = new THREE.BufferGeometry();
    const foliagePositions = new Float32Array(foliageCount * 3);
    for (let i = 0; i < foliageCount; i++) {
      foliagePositions[i * 3] = (Math.random() - 0.5) * 6.8;
      foliagePositions[i * 3 + 1] = 2.5 + Math.random() * 14;
      foliagePositions[i * 3 + 2] = 4.15 + Math.random() * 0.2;
    }
    foliageGeo.setAttribute('position', new THREE.BufferAttribute(foliagePositions, 3));
    const foliageMat = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.25,
      transparent: true,
      opacity: 0.95
    });
    const foliagePoints = new THREE.Points(foliageGeo, foliageMat);
    greenWallGroup.add(foliagePoints);
    greenWallGroup.visible = activeIntervention === 'green-wall';
    interventionGroup.add(greenWallGroup);

    // [B] Direct Air Capture (DAC) Turbine
    const dacGroup = new THREE.Group();
    const dacBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.4, 2.8, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 })
    );
    dacGroup.add(dacBase);

    // Cyan Intake Vortex Ring
    const intakeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.15, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    intakeRing.rotation.x = Math.PI / 2;
    intakeRing.position.y = 1.4;
    dacGroup.add(intakeRing);

    // Aerodynamic 4-Blade Fan
    const fanPivot = new THREE.Group();
    fanPivot.position.y = 1.35;
    const bladeGeo = new THREE.BoxGeometry(3.4, 0.1, 0.35);
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
    blade2.rotation.y = Math.PI / 2;
    fanPivot.add(blade1);
    fanPivot.add(blade2);
    dacGroup.add(fanPivot);

    dacGroup.position.set(0, centralHeight + 1.4, 0);
    dacGroup.visible = activeIntervention === 'direct-air-capture';
    interventionGroup.add(dacGroup);

    // [C] Algae Bioreactor (Glass Cylinder Column)
    const algaeGroup = new THREE.Group();
    const algaeCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 5.5, 32),
      new THREE.MeshStandardMaterial({
        color: 0x059669,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.1,
        emissive: 0x00ff9d,
        emissiveIntensity: 0.8
      })
    );
    algaeGroup.add(algaeCylinder);

    const algaeCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 5.2, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    algaeGroup.add(algaeCore);

    algaeGroup.position.set(5.5, 2.8, 5.5);
    algaeGroup.visible = activeIntervention === 'algae-panel';
    interventionGroup.add(algaeGroup);

    // [D] Cool Roof (High-Albedo Solar / Reflective Grid)
    const coolRoofGroup = new THREE.Group();
    const roofBase = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 7.6),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0x0369a1,
        emissiveIntensity: 0.5
      })
    );
    roofBase.rotation.x = -Math.PI / 2;
    roofBase.position.set(0, centralHeight + 0.08, 0);
    coolRoofGroup.add(roofBase);

    // Photovoltaic Grid Lines
    const solarGrid = new THREE.GridHelper(7.6, 8, 0x00f0ff, 0x0369a1);
    solarGrid.position.set(0, centralHeight + 0.1, 0);
    coolRoofGroup.add(solarGrid);

    coolRoofGroup.visible = activeIntervention === 'cool-roof';
    interventionGroup.add(coolRoofGroup);

    // 8. Animated Road Traffic Photon Streams
    const trafficCount = 120;
    const trafficGeo = new THREE.BufferGeometry();
    const trafficPositions = new Float32Array(trafficCount * 3);
    const trafficSpeeds = new Float32Array(trafficCount);

    for (let i = 0; i < trafficCount; i++) {
      const isXAxis = i % 2 === 0;
      if (isXAxis) {
        trafficPositions[i * 3] = (Math.random() - 0.5) * 70;
        trafficPositions[i * 3 + 1] = 0.15;
        trafficPositions[i * 3 + 2] = (Math.floor(Math.random() * 3) - 1) * 12;
      } else {
        trafficPositions[i * 3] = (Math.floor(Math.random() * 3) - 1) * 12;
        trafficPositions[i * 3 + 1] = 0.15;
        trafficPositions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      }
      trafficSpeeds[i] = 0.2 + Math.random() * 0.3;
    }
    trafficGeo.setAttribute('position', new THREE.BufferAttribute(trafficPositions, 3));
    const trafficMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.45,
      transparent: true,
      opacity: 0.9
    });
    const trafficPoints = new THREE.Points(trafficGeo, trafficMat);
    scene.add(trafficPoints);

    // 9. Volumetric Air Quality Particle Dispersion (Smog vs Oxygen Ions)
    const particleCount = 1200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const pIndex = i * 3;
      particlePositions[pIndex] = (Math.random() - 0.5) * 44;
      particlePositions[pIndex + 1] = Math.random() * 12 + 0.5;
      particlePositions[pIndex + 2] = (Math.random() - 0.5) * 44;

      // Color: Ruby red for smog vs emerald green for clean air
      const isClean = activeIntervention !== 'none' && Math.random() > 0.3;
      if (isClean) {
        particleColors[pIndex] = 0.0;
        particleColors[pIndex + 1] = 1.0;
        particleColors[pIndex + 2] = 0.62;
      } else {
        particleColors[pIndex] = 1.0;
        particleColors[pIndex + 1] = 0.24;
        particleColors[pIndex + 2] = 0.43;
      }
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 10. Mouse Drag Controls & Camera Orbit
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let cameraAngle = { theta: 0.8, phi: 0.55, radius: 46 };

    const updateCameraPosition = () => {
      if (cameraMode === 'drone') {
        camera.position.x = cameraAngle.radius * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
        camera.position.z = cameraAngle.radius * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
        camera.position.y = cameraAngle.radius * Math.cos(cameraAngle.phi);
        camera.lookAt(0, 6, 0);
      } else if (cameraMode === 'skyline') {
        camera.position.set(24, 8, 26);
        camera.lookAt(0, 14, 0);
      } else {
        // Street Canyon
        camera.position.set(0.5, 1.8, 14);
        camera.lookAt(0, 10, 0);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || cameraMode !== 'drone') return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      cameraAngle.theta += dx * 0.006;
      cameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, cameraAngle.phi - dy * 0.005));

      prevMouse = { x: e.clientX, y: e.clientY };
      updateCameraPosition();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (cameraMode !== 'drone') return;
      cameraAngle.radius = Math.max(20, Math.min(70, cameraAngle.radius + e.deltaY * 0.04));
      updateCameraPosition();
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: true });

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // 11. Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous Drone Orbit when not dragging
      if (cameraMode === 'drone' && !isDragging) {
        cameraAngle.theta += 0.002;
        updateCameraPosition();
      }

      // Rotate DAC Turbine Fan
      if (fanPivot) {
        fanPivot.rotation.y += 0.14;
      }

      // Blink Rooftop Warning Beacon
      beaconMesh.visible = Math.sin(elapsedTime * 3) > 0;

      // Move Traffic Streams
      const posArray = trafficGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < trafficCount; i++) {
        if (i % 2 === 0) {
          posArray[i * 3] += trafficSpeeds[i];
          if (posArray[i * 3] > 35) posArray[i * 3] = -35;
        } else {
          posArray[i * 3 + 2] += trafficSpeeds[i];
          if (posArray[i * 3 + 2] > 35) posArray[i * 3 + 2] = -35;
        }
      }
      trafficGeo.attributes.position.needsUpdate = true;

      // Move Air Quality Particles Upward
      const pArray = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pArray[i * 3 + 1] += 0.04;
        if (pArray[i * 3 + 1] > 18) {
          pArray[i * 3 + 1] = 0.5;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    updateCameraPosition();
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      centralGeo.dispose();
      centralMat.dispose();
      windowTexture.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      trafficGeo.dispose();
      trafficMat.dispose();
    };
  }, [activeIntervention, cameraMode]);

  const handleSelectIntervention = (id: string) => {
    setActiveIntervention(id);
    if (onInterventionChange) onInterventionChange(id);

    if (id === 'green-wall') {
      setAqiReduction({ before: 142, after: 68, reduction: 52 });
    } else if (id === 'direct-air-capture') {
      setAqiReduction({ before: 142, after: 44, reduction: 69 });
    } else if (id === 'algae-panel') {
      setAqiReduction({ before: 142, after: 58, reduction: 59 });
    } else if (id === 'cool-roof') {
      setAqiReduction({ before: 142, after: 82, reduction: 42 });
    } else {
      setAqiReduction({ before: 142, after: 142, reduction: 0 });
    }
  };

  return (
    <div className={`twin-3d-wrapper ${className}`}>
      {/* 3D WebGL Canvas Mount */}
      <div 
        ref={mountRef} 
        className="twin-canvas-mount"
        title="Click and drag to orbit camera in 3D. Scroll to zoom."
      />

      {/* Top Left: 3D HUD Badge & Telemetry Card */}
      <div className="twin-hud-top-left">
        <div className="twin-hud-badge">
          <span className="twin-live-dot" />
          <span className="twin-hud-badge-text">
            3D Urban Digital Twin • Real-Time Engine
          </span>
        </div>

        {/* Live Simulation Telemetry Card */}
        <div className="twin-telemetry-card">
          <div className="twin-telemetry-header">
            <span>MICROCLIMATE DELTA</span>
            <span className="twin-telemetry-delta">-{aqiReduction.reduction}% SMOG</span>
          </div>
          <div className="twin-telemetry-metrics">
            <span className="twin-aqi-before">{aqiReduction.before}</span>
            <span className="twin-aqi-arrow">➔</span>
            <span className="twin-aqi-after">
              {aqiReduction.after}
              <span className="twin-aqi-unit">AQI</span>
            </span>
          </div>
          <div className="twin-meter-track">
            <div 
              className="twin-meter-fill"
              style={{ width: `${aqiReduction.reduction}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Right: Camera View Preset Toggles */}
      <div className="twin-hud-top-right">
        <button
          type="button"
          onClick={() => {
            const nextMode = cameraMode === 'drone' ? 'skyline' : cameraMode === 'skyline' ? 'street' : 'drone';
            setCameraMode(nextMode);
          }}
          className="twin-camera-btn"
        >
          {cameraMode === 'drone' ? '🚁 Drone Orbit' : cameraMode === 'skyline' ? '🏙️ Skyline Horizon' : '🚶 Street Canyon'}
        </button>
      </div>

      {/* Bottom Floating Intervention Switcher Dock */}
      <div className="twin-dock-container">
        {[
          { id: 'green-wall', label: '🌿 Green Wall Bio-Canopy', cost: '₹12,000' },
          { id: 'direct-air-capture', label: '🏭 Direct Air Capture (DAC)', cost: '₹80,000' },
          { id: 'algae-panel', label: '🧪 Algae Bioreactor', cost: '₹25,000' },
          { id: 'cool-roof', label: '☀️ High-Albedo Cool Roof', cost: '₹35,000' }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelectIntervention(item.id)}
            className={`twin-dock-btn ${activeIntervention === item.id ? 'active' : ''}`}
          >
            <span>{item.label}</span>
            <span className="twin-dock-cost-badge">{item.cost}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DigitalTwin3D;
