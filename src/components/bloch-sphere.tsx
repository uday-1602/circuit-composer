
'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface BlochSphereProps {
  theta: number;
  phi: number;
  selectedQubit: number | null;
  numQubits: number;
  onSelectQubit: (qubitIndex: number | null) => void;
}

const BlochSphere: React.FC<BlochSphereProps> = ({ theta, phi, selectedQubit, numQubits, onSelectQubit }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vectorRef = useRef<THREE.ArrowHelper | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: -Math.PI / 6, y: Math.PI / 4 });

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('hsl(var(--card))');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 2.5;
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Sphere
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.15 });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Wireframe
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 })
    );
    scene.add(wireframe);

    // Axes
    const createAxis = (dir: THREE.Vector3, color: number) => {
        const material = new THREE.LineBasicMaterial({ color });
        const points = [dir.clone().multiplyScalar(-1.1), dir.clone().multiplyScalar(1.1)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return new THREE.Line(geometry, material);
    };
    scene.add(createAxis(new THREE.Vector3(1, 0, 0), 0xff0000)); // X-axis (red)
    scene.add(createAxis(new THREE.Vector3(0, 1, 0), 0x00ff00)); // Y-axis (green)
    scene.add(createAxis(new THREE.Vector3(0, 0, 1), 0x0000ff)); // Z-axis (blue)

    // State Vector
    const dir = new THREE.Vector3();
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 1;
    const hex = 0x9D4EDD; // Primary color
    const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex, 0.1, 0.08);
    scene.add(arrowHelper);
    vectorRef.current = arrowHelper;

    // Animation loop
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      requestAnimationFrame(animate);
      sceneRef.current.rotation.x = rotationRef.current.x;
      sceneRef.current.rotation.y = rotationRef.current.y;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    // Mouse handlers for rotation
    const onMouseDown = (e: MouseEvent) => {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;
        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
        isDraggingRef.current = false;
    };
    const onMouseLeave = () => {
        isDraggingRef.current = false;
    }
    
    currentMount.addEventListener('mousedown', onMouseDown);
    currentMount.addEventListener('mousemove', onMouseMove);
    currentMount.addEventListener('mouseup', onMouseUp);
    currentMount.addEventListener('mouseleave', onMouseLeave);

    // Resize handler
    const handleResize = () => {
        if (!renderer || !camera || !currentMount) return;
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentMount) {
        currentMount.removeEventListener('mousedown', onMouseDown);
        currentMount.removeEventListener('mousemove', onMouseMove);
        currentMount.removeEventListener('mouseup', onMouseUp);
        currentMount.removeEventListener('mouseleave', onMouseLeave);
        if (renderer.domElement) {
            currentMount.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (vectorRef.current) {
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(theta);
      const newDir = new THREE.Vector3(x, y, z).normalize();
      vectorRef.current.setDirection(newDir);
    }
  }, [theta, phi]);

  return (
    <Card className="flex-1 flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bloch Sphere</CardTitle>
                <CardDescription>
                    {selectedQubit !== null ? `Visualization for Qubit ${selectedQubit}` : 'Click on a qubit to visualize its state.'}
                </CardDescription>
              </div>
                <Select value={selectedQubit?.toString()} onValueChange={(val) => onSelectQubit(parseInt(val))}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Qubit" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({length: numQubits}).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>Qubit {i}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent className="flex-1 relative cursor-grab active:cursor-grabbing">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-500">|0⟩ (Z+)</div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-500">|1⟩ (Z-)</div>
            <div className="absolute top-1/2 -translate-y-1/2 right-2 text-xs font-bold text-red-500">X+</div>
            <div className="absolute top-1/2 -translate-y-1/2 left-2 text-xs font-bold text-red-500">X-</div>
        </CardContent>
    </Card>
  );
};

export default BlochSphere;
