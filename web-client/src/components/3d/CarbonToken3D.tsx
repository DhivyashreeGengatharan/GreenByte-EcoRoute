import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './CarbonToken3D.css';

export const CarbonToken3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const flipTokenRef = useRef<() => void>(() => {});
  const pulseHashRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 500;
    let height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.z = 16;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    const tokenGroup = new THREE.Group();
    scene.add(tokenGroup);

    // ── Lighting ──
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const goldKey = new THREE.DirectionalLight(0xf59e0b, 3.2);
    goldKey.position.set(10, 15, 12);
    scene.add(goldKey);

    const emeraldRim = new THREE.DirectionalLight(0x10b981, 3.0);
    emeraldRim.position.set(-12, -10, -8);
    scene.add(emeraldRim);

    const cyanGlow = new THREE.PointLight(0x00f0ff, 2.5, 30);
    cyanGlow.position.set(0, 0, 10);
    scene.add(cyanGlow);

    // ── Generate Procedural Textures for Front & Back Faces ──
    // Front Face (Leaf crest, text)
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = 512;
    frontCanvas.height = 512;
    const fCtx = frontCanvas.getContext('2d');
    if (fCtx) {
      // Dark emerald background
      fCtx.fillStyle = '#06281e';
      fCtx.beginPath();
      fCtx.arc(256, 256, 250, 0, Math.PI * 2);
      fCtx.fill();

      // Outer gold border ring
      fCtx.strokeStyle = '#f59e0b';
      fCtx.lineWidth = 14;
      fCtx.stroke();

      // Inner cyan telemetry ring
      fCtx.strokeStyle = '#00f0ff';
      fCtx.lineWidth = 4;
      fCtx.beginPath();
      fCtx.arc(256, 256, 230, 0, Math.PI * 2);
      fCtx.stroke();

      // Eco leaf shape
      fCtx.fillStyle = '#10b981';
      fCtx.beginPath();
      fCtx.moveTo(256, 110);
      fCtx.bezierCurveTo(340, 150, 360, 270, 256, 370);
      fCtx.bezierCurveTo(152, 270, 172, 150, 256, 110);
      fCtx.fill();

      // Leaf central vein
      fCtx.strokeStyle = '#ffffff';
      fCtx.lineWidth = 5;
      fCtx.beginPath();
      fCtx.moveTo(256, 125);
      fCtx.lineTo(256, 350);
      fCtx.stroke();

      // Text around border
      fCtx.fillStyle = '#f59e0b';
      fCtx.font = 'bold 22px monospace';
      fCtx.textAlign = 'center';
      fCtx.fillText('ECOROUTE · VERIFIED CARBON ASSET', 256, 420);
    }
    const frontTexture = new THREE.CanvasTexture(frontCanvas);

    // Back Face (Cryptographic Hash Matrix)
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 512;
    backCanvas.height = 512;
    const bCtx = backCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = '#03141f';
      bCtx.beginPath();
      bCtx.arc(256, 256, 250, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.strokeStyle = '#00f0ff';
      bCtx.lineWidth = 12;
      bCtx.stroke();

      bCtx.fillStyle = '#10b981';
      bCtx.font = 'bold 20px monospace';
      bCtx.textAlign = 'center';
      bCtx.fillText('PROOF OF AVOIDED EMISSION', 256, 170);

      bCtx.fillStyle = '#ffffff';
      bCtx.font = 'bold 42px monospace';
      bCtx.fillText('64.8 kg CO₂', 256, 240);

      bCtx.fillStyle = '#94a3b8';
      bCtx.font = '16px monospace';
      bCtx.fillText('HASH: 0x8F4E2B...91A0C', 256, 300);
      bCtx.fillText('AUDIT STATUS: VERIFIED', 256, 340);
    }
    const backTexture = new THREE.CanvasTexture(backCanvas);

    // ── 3D Minted Coin Geometry ──
    const coinRadius = 4.2;
    const coinThickness = 0.6;
    const coinGeo = new THREE.CylinderGeometry(coinRadius, coinRadius, coinThickness, 64);

    // Materials: [Side edge, Top face, Bottom face]
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.2
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTexture,
      metalness: 0.6,
      roughness: 0.3
    });
    const backMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      metalness: 0.6,
      roughness: 0.3
    });

    const coinMesh = new THREE.Mesh(coinGeo, [edgeMat, frontMat, backMat]);
    coinMesh.rotation.x = Math.PI / 2;
    tokenGroup.add(coinMesh);

    // ── Dual Holographic Orbital Rings ──
    const ring1Geo = new THREE.RingGeometry(coinRadius * 1.35, coinRadius * 1.37, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const holoRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    holoRing1.rotation.x = Math.PI / 3;
    tokenGroup.add(holoRing1);

    const ring2Geo = new THREE.RingGeometry(coinRadius * 1.5, coinRadius * 1.52, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const holoRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    holoRing2.rotation.y = Math.PI / 3;
    tokenGroup.add(holoRing2);

    // Orbiting Satellite Data Node
    const satGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const satMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const satMesh = new THREE.Mesh(satGeo, satMat);
    tokenGroup.add(satMesh);

    // ── Mouse Drag & Momentum Physics ──
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let velocityY = 0.015; // default gentle spin
    let velocityX = 0;

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

      velocityY = dx * 0.005;
      velocityX = dy * 0.005;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Actions
    flipTokenRef.current = () => {
      velocityY += 0.28;
    };

    pulseHashRef.current = () => {
      cyanGlow.intensity = 8.0;
      setTimeout(() => {
        cyanGlow.intensity = 2.5;
      }, 400);
    };

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 500;
      height = container.clientHeight || 480;
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

      // Apply angular velocity with friction damping
      tokenGroup.rotation.y += velocityY;
      tokenGroup.rotation.x += velocityX;

      if (!isDragging) {
        velocityY *= 0.985;
        if (Math.abs(velocityY) < 0.008) {
          velocityY = 0.008; // continuous idle spin
        }
        velocityX *= 0.95;
      }

      // Orbit satellite node around ring
      satMesh.position.x = Math.cos(elapsed * 2.5) * (coinRadius * 1.36);
      satMesh.position.y = Math.sin(elapsed * 2.5) * (coinRadius * 1.36);
      satMesh.position.z = Math.sin(elapsed * 1.5) * 1.2;

      holoRing1.rotation.z = elapsed * 0.4;
      holoRing2.rotation.z = -elapsed * 0.3;

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
      coinGeo.dispose();
      edgeMat.dispose();
      frontMat.dispose();
      backMat.dispose();
      frontTexture.dispose();
      backTexture.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      satGeo.dispose();
      satMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="carbon-token-card">
      <div ref={mountRef} className="token-canvas-container" />

      {/* Top HUD */}
      <div className="token-hud-overlay">
        <div className="token-badge">
          <span className="token-pulse-dot" />
          <span className="token-badge-txt">MINTED PHYSICAL CARBON TOKEN</span>
        </div>

        <div className="token-actions">
          <button
            type="button"
            className="token-action-btn"
            onClick={() => flipTokenRef.current()}
          >
            🔄 Spin Token
          </button>
          <button
            type="button"
            className="token-action-btn"
            onClick={() => pulseHashRef.current()}
          >
            ⚡ Verify Hash
          </button>
        </div>
      </div>

      <div className="token-drag-hint">
        <span>🖱️ Drag to rotate coin 360° · Click Spin for velocity flip</span>
      </div>
    </div>
  );
};

export default CarbonToken3D;
