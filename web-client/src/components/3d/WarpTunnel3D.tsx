import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './WarpTunnel3D.css';

export const WarpTunnel3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.025);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 300);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Tunnel Rings (Hexagonal or Cylindrical)
    const ringCount = 30;
    const tunnelGroup = new THREE.Group();
    scene.add(tunnelGroup);

    const ringGeo = new THREE.RingGeometry(12, 12.18, 6); // hexagonal ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < ringCount; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = -i * 5;
      ring.rotation.z = i * 0.1;
      tunnelGroup.add(ring);
      rings.push(ring);
    }

    // Hyperspace Streaks / Particles
    const streakCount = 450;
    const streakGeo = new THREE.BufferGeometry();
    const streakPos = new Float32Array(streakCount * 3);
    const streakCols = new Float32Array(streakCount * 3);

    for (let i = 0; i < streakCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 8;
      streakPos[i * 3] = Math.cos(angle) * radius;
      streakPos[i * 3 + 1] = Math.sin(angle) * radius;
      streakPos[i * 3 + 2] = -Math.random() * 120;

      const isEmerald = Math.random() > 0.45;
      streakCols[i * 3] = isEmerald ? 0.06 : 0.0;
      streakCols[i * 3 + 1] = isEmerald ? 0.95 : 0.94;
      streakCols[i * 3 + 2] = isEmerald ? 0.62 : 1.0;
    }

    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
    streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCols, 3));

    const streakMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const streaks = new THREE.Points(streakGeo, streakMat);
    scene.add(streaks);

    // Glowing Central Singularity Core
    const coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.z = -80;
    scene.add(core);

    // Interactive cursor parallax
    let targetCamX = 0;
    let targetCamY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetCamX = (e.clientX / window.innerWidth - 0.5) * 4;
      targetCamY = (e.clientY / window.innerHeight - 0.5) * -3;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || 450;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animId: number;
    const speed = 0.45;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Camera parallax
      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, -50);

      // Animate rings moving forward
      rings.forEach((ring) => {
        ring.position.z += speed;
        ring.rotation.z += 0.003;
        if (ring.position.z > 20) {
          ring.position.z = -ringCount * 5 + 20;
        }
      });

      // Animate streaks moving forward
      const pos = streakGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < streakCount; i++) {
        pos[i * 3 + 2] += speed * 2.2;
        if (pos[i * 3 + 2] > 20) {
          pos[i * 3 + 2] = -120;
        }
      }
      streakGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      streakGeo.dispose();
      streakMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={mountRef} className="warp-tunnel-container">
      <div className="warp-tunnel-vignette" />
    </div>
  );
};

export default WarpTunnel3D;
