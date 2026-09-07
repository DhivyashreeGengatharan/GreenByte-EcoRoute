import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import earthTextureImg from '../../assets/earth.png';
import './Globe3D.css';

interface CityPoint {
  name: string;
  lat: number;
  lon: number;
  aqi: number;
  status: 'optimal' | 'moderate' | 'hazard';
}

const GLOBAL_CITIES: CityPoint[] = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090, aqi: 186, status: 'hazard' },
  { name: 'London', lat: 51.5074, lon: -0.1278, aqi: 28, status: 'optimal' },
  { name: 'New York', lat: 40.7128, lon: -74.0060, aqi: 45, status: 'optimal' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, aqi: 24, status: 'optimal' },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, aqi: 35, status: 'optimal' },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, aqi: 72, status: 'moderate' },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, aqi: 142, status: 'hazard' }
];

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const Globe3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeCity, setActiveCity] = useState<CityPoint>(GLOBAL_CITIES[0]);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 560;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 13.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Group to hold all globe elements
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x00f0ff, 2.8);
    sunLight.position.set(14, 10, 10);
    scene.add(sunLight);

    const backGlow = new THREE.PointLight(0x00ff9d, 3.2, 35);
    backGlow.position.set(-12, -8, -6);
    scene.add(backGlow);

    // Earth Sphere
    const globeRadius = 4.8;
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(earthTextureImg);
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const sphereGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.6,
      metalness: 0.25,
      emissive: new THREE.Color(0x051b2c),
      emissiveIntensity: 0.4
    });
    const earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(earthMesh);

    // Atmospheric Glow Outer Sphere
    const atmosphereGeo = new THREE.SphereGeometry(globeRadius * 1.15, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          gl_FragColor = vec4(0.0, 0.94, 1.0, 1.0) * intensity * 1.2;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // Dual Orbital Telemetry Rings
    const ringGeo = new THREE.RingGeometry(globeRadius * 1.35, globeRadius * 1.365, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });

    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2.6;
    ring1.rotation.y = Math.PI / 7;
    globeGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = -Math.PI / 3.2;
    ring2.rotation.y = -Math.PI / 5;
    globeGroup.add(ring2);

    // Orbital Satellites
    const satGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const satMat = new THREE.MeshBasicMaterial({ color: 0x00ff9d });
    const sat1 = new THREE.Mesh(satGeo, satMat);
    const sat2 = new THREE.Mesh(satGeo, satMat);
    globeGroup.add(sat1);
    globeGroup.add(sat2);

    // City Beacon Pins & Laser Beacons
    const cityPins: { mesh: THREE.Mesh; beacon: THREE.Mesh; ring: THREE.Mesh; point: CityPoint }[] = [];

    GLOBAL_CITIES.forEach((city) => {
      const pos = latLonToVector3(city.lat, city.lon, globeRadius);

      // Core Marker
      const pinColor = city.status === 'hazard' ? 0xff3d6e : city.status === 'moderate' ? 0xffb800 : 0x00ff9d;
      const pinGeo = new THREE.SphereGeometry(0.09, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: pinColor });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      globeGroup.add(pinMesh);

      // Vertical Laser Pillar
      const beaconHeight = 0.9;
      const beaconGeo = new THREE.CylinderGeometry(0.02, 0.04, beaconHeight, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        transparent: true,
        opacity: 0.65
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.copy(pos.clone().multiplyScalar(1 + beaconHeight / (globeRadius * 2)));
      beaconMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      globeGroup.add(beaconMesh);

      // Pulsing Base Ring
      const pRingGeo = new THREE.RingGeometry(0.1, 0.16, 24);
      const pRingMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const pRingMesh = new THREE.Mesh(pRingGeo, pRingMat);
      pRingMesh.position.copy(pos.clone().multiplyScalar(1.002));
      pRingMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      globeGroup.add(pRingMesh);

      cityPins.push({ mesh: pinMesh, beacon: beaconMesh, ring: pRingMesh, point: city });
    });

    // 3D Great-Circle Flight/AQI Trajectory Arcs
    const flightPairs = [
      [GLOBAL_CITIES[0], GLOBAL_CITIES[1]], // Delhi - London
      [GLOBAL_CITIES[1], GLOBAL_CITIES[2]], // London - NY
      [GLOBAL_CITIES[2], GLOBAL_CITIES[3]], // NY - Tokyo
      [GLOBAL_CITIES[3], GLOBAL_CITIES[4]], // Tokyo - Singapore
      [GLOBAL_CITIES[4], GLOBAL_CITIES[0]], // Singapore - Delhi
      [GLOBAL_CITIES[0], GLOBAL_CITIES[5]]  // Delhi - São Paulo
    ];

    const arcPulses: { curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; progress: number; speed: number }[] = [];

    flightPairs.forEach(([c1, c2]) => {
      const v1 = latLonToVector3(c1.lat, c1.lon, globeRadius);
      const v2 = latLonToVector3(c2.lat, c2.lon, globeRadius);

      const mid = v1.clone().add(v2).multiplyScalar(0.5);
      const distance = v1.distanceTo(v2);
      mid.normalize().multiplyScalar(globeRadius + distance * 0.28);

      const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
      const points = curve.getPoints(50);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
      const curveMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.45
      });
      const curveLine = new THREE.Line(curveGeo, curveMat);
      globeGroup.add(curveLine);

      // Traveling Light Pulse
      const pulseGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00ff9d });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      globeGroup.add(pulseMesh);

      arcPulses.push({
        curve,
        mesh: pulseMesh,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.003
      });
    });

    // Starfield Background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starCoords = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starCoords[i] = (Math.random() - 0.5) * 80;
      starCoords[i + 1] = (Math.random() - 0.5) * 80;
      starCoords[i + 2] = -15 - Math.random() * 50;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.65
    });
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // Interactive Drag Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let rotationVelocity = { x: 0, y: 0.0018 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      globeGroup.rotation.y += deltaX * 0.005;
      globeGroup.rotation.x += deltaY * 0.005;

      rotationVelocity = {
        x: deltaY * 0.002,
        y: deltaX * 0.002
      };

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

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

    // Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Globe Rotation
      if (autoRotate && !isDragging) {
        globeGroup.rotation.y += 0.0018;
      } else if (!isDragging) {
        globeGroup.rotation.y += rotationVelocity.y;
        globeGroup.rotation.x += rotationVelocity.x;
        rotationVelocity.x *= 0.95;
        rotationVelocity.y *= 0.95;
      }

      // Orbiting Satellites
      const orbitAngle1 = elapsedTime * 0.8;
      sat1.position.set(
        Math.cos(orbitAngle1) * (globeRadius * 1.35),
        Math.sin(orbitAngle1) * 2,
        Math.sin(orbitAngle1) * (globeRadius * 1.35)
      );

      const orbitAngle2 = -elapsedTime * 0.6;
      sat2.position.set(
        Math.cos(orbitAngle2) * (globeRadius * 1.35),
        Math.cos(orbitAngle2) * -1.8,
        Math.sin(orbitAngle2) * (globeRadius * 1.35)
      );

      // Trajectory Arcs Light Pulses
      arcPulses.forEach((pulse) => {
        pulse.progress += pulse.speed;
        if (pulse.progress > 1) pulse.progress = 0;
        const pt = pulse.curve.getPoint(pulse.progress);
        pulse.mesh.position.copy(pt);
      });

      // City Rings Pulsing
      const scale = 1 + Math.sin(elapsedTime * 4) * 0.25;
      cityPins.forEach((pin) => {
        pin.ring.scale.set(scale, scale, 1);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      earthTexture.dispose();
    };
  }, [autoRotate]);

  return (
    <div className={`globe-3d-wrapper ${className}`}>
      {/* 3D WebGL Canvas Mount */}
      <div 
        ref={mountRef} 
        className="globe-canvas-mount"
        title="Click and drag to rotate the 3D Planetary Digital Twin"
      />

      {/* Top Left HUD Badge */}
      <div className="globe-hud-top-left">
        <div className="globe-hud-pill">
          <span className="globe-live-dot" />
          <span className="globe-hud-pill-text">3D Planetary Sensor Grid</span>
        </div>
      </div>

      {/* Top Right Live Telemetry */}
      <div className="globe-hud-top-right">
        <span className="globe-telemetry-badge">OSRM GRID ACTIVE</span>
        <span className="globe-telemetry-badge">ORBIT VELOCITY: 27,400 KM/H</span>
      </div>

      {/* Bottom Right Orbit Action Toggle */}
      <div className="globe-hud-bottom-right">
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className="globe-btn-action"
        >
          {autoRotate ? '⏸ Pause Orbit' : '▶ Resume Orbit'}
        </button>
      </div>

      {/* Bottom Left City Sensor Selector */}
      <div className="globe-hud-bottom-left">
        {GLOBAL_CITIES.slice(0, 4).map((city) => (
          <button
            key={city.name}
            type="button"
            onClick={() => setActiveCity(city)}
            className={`globe-city-pill ${activeCity.name === city.name ? 'active' : ''}`}
          >
            <span className="globe-city-name">{city.name}:</span>
            <span className={`globe-aqi-val globe-aqi-${city.status}`}>
              AQI {city.aqi}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Globe3D;
