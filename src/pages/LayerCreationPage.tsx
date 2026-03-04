import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  useAppStore,
  type PalletConfig,
  type BoxConfig,
  type Layer,
  type SavedLayout,
  type LayoutItem
} from '../store/store';
import { useNavigate } from 'react-router-dom';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Box as DreiBox, Text, ContactShadows, Environment, Edges, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import HeightIcon from '@mui/icons-material/Height';
import StraightenIcon from '@mui/icons-material/Straighten';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';

import {
  Container,
  Typography,
  Button,
  Box as MuiBox,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';

// ---------- Theme helpers ----------
const COLORS = {
  deepBlue: '#1e3a8a',
  slateDark: '#334155',
  slateMid: '#475569',
  slate: '#64748b',
  bgLight: '#f1f5f9',
  cardBg: '#f8fafc',
};
const gradient = (a: string, b: string) => `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
const softGradient = gradient(COLORS.slate, COLORS.deepBlue);

// ---------- Types / helpers ----------
type RotDeg = { rotationXDeg: number; rotationYDeg: number; rotationZDeg: number; };
const norm = (d: number) => ((d % 360) + 360) % 360;
const toRad = (d: number) => THREE.MathUtils.degToRad(d);
const rotDegToRadArray = ({ rotationXDeg = 0, rotationYDeg = 0, rotationZDeg = 0 }: Partial<RotDeg>) =>
  [toRad(norm(rotationXDeg || 0)), toRad(norm(rotationYDeg || 0)), toRad(norm(rotationZDeg || 0))] as [number, number, number];

const EPS = 1e-4;
const MARGIN = 0;
const gridSize = 0.5;

const projectedFootprintXZ = (w: number, h: number, d: number, rot: Partial<RotDeg>) => {
  const [rx, ry, rz] = rotDegToRadArray(rot);
  const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
  const m4 = new THREE.Matrix4().makeRotationFromEuler(euler);

  const ux = new THREE.Vector3().setFromMatrixColumn(m4, 0);
  const uy = new THREE.Vector3().setFromMatrixColumn(m4, 1);
  const uz = new THREE.Vector3().setFromMatrixColumn(m4, 2);

  const ex = w / 2, ey = h / 2, ez = d / 2;
  const halfX = Math.abs(ux.x) * ex + Math.abs(uy.x) * ey + Math.abs(uz.x) * ez;
  const halfZ = Math.abs(ux.z) * ex + Math.abs(uy.z) * ey + Math.abs(uz.z) * ez;
  const halfY = Math.abs(ux.y) * ex + Math.abs(uy.y) * ey + Math.abs(uz.y) * ez;

  return { footW: 2 * halfX, footD: 2 * halfZ, halfY };
};

const checkCollisionInLayer = (
  newBox: (LayoutItem & Partial<RotDeg> & { layerId?: number }),
  existing: (LayoutItem & Partial<RotDeg> & { layerId?: number })[],
  layerId: number
) => {
  const boxesInLayer = existing.filter(b => b.layerId === layerId);
  const fpN = projectedFootprintXZ(newBox.width, newBox.height, newBox.depth, newBox);
  const nL = newBox.position[0] - fpN.footW / 2;
  const nR = newBox.position[0] + fpN.footW / 2;
  const nF = newBox.position[2] - fpN.footD / 2;
  const nB = newBox.position[2] + fpN.footD / 2;

  return boxesInLayer.some(b => {
    if (b.id === newBox.id) return false;
    const fpB = projectedFootprintXZ(b.width, b.height, b.depth, b);
    const eL = b.position[0] - fpB.footW / 2;
    const eR = b.position[0] + fpB.footW / 2;
    const eF = b.position[2] - fpB.footD / 2;
    const eB = b.position[2] + fpB.footD / 2;
    const colX = nL < eR - EPS && nR > eL + EPS;
    const colZ = nF < eB - EPS && nB > eF + EPS;
    return colX && colZ;
  });
};

const isWithinPalletBoundsStanding = (
  box: LayoutItem & Partial<RotDeg>,
  pallet: PalletConfig
) => {
  const { footW, footD, halfY } = projectedFootprintXZ(box.width, box.height, box.depth, box);
  const halfW = pallet.width / 2;
  const halfD = pallet.depth / 2;
  const topY = pallet.height / 2;

  const withinX = Math.abs(box.position[0]) <= (halfW - footW / 2 - MARGIN + EPS);
  const withinZ = Math.abs(box.position[2]) <= (halfD - footD / 2 - MARGIN + EPS);
  const bottomY = box.position[1] - halfY;
  const withinY = bottomY >= topY - 1e-6 - EPS; // bottom sits on/above pallet top

  return withinX && withinZ && withinY;
};

const snapTo = (v: number, g: number) => g === 0 ? v : Math.round(v / g) * g;

type PlacementResult = { position: [number, number, number]; rotDeg: RotDeg } | null;
const ROT_CANDIDATES: RotDeg[] = [
  { rotationXDeg: 0, rotationYDeg: 0, rotationZDeg: 0 },
  { rotationXDeg: 0, rotationYDeg: 90, rotationZDeg: 0 },
  { rotationXDeg: 0, rotationYDeg: 180, rotationZDeg: 0 },
  { rotationXDeg: 0, rotationYDeg: 270, rotationZDeg: 0 },
  { rotationXDeg: 90, rotationYDeg: 0, rotationZDeg: 0 }, // stand on depth
  { rotationXDeg: 0, rotationYDeg: 0, rotationZDeg: 90 }, // stand on width
];

// ---- Label helpers ----
type BoxSide = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
type LabelTemplate = 'none' | 'barcode-small' | 'barcode-medium' | 'barcode-large';

const LABEL_EPS = 0.002;

function makeBarcodeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  let x = 8;
  while (x < c.width - 8) {
    const w = Math.max(1, Math.floor(1 + Math.random() * 4));
    const gap = Math.max(1, Math.floor(1 + Math.random() * 3));
    ctx.fillStyle = '#111';
    ctx.fillRect(x, 8, w, c.height - 16);
    x += w + gap;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function sizeFromTemplate(tpl: LabelTemplate | undefined, faceWidth: number, boxHeight: number) {
  const map = {
    'barcode-small': { wFactor: 0.5, hFactor: 0.20 },
    'barcode-medium': { wFactor: 0.7, hFactor: 0.28 },
    'barcode-large': { wFactor: 0.9, hFactor: 0.36 },
  } as const;
  const key: keyof typeof map = tpl && tpl !== 'none' ? tpl : 'barcode-small';
  const { wFactor, hFactor } = map[key];
  const width = faceWidth * wFactor;
  const height = Math.min(boxHeight * 0.9, boxHeight * hFactor);
  return { width, height };
}

function faceTransform(side: BoxSide, box: { width: number; height: number; depth: number }) {
  switch (side) {
    case 'front': return { pos: new THREE.Vector3(0, 0, box.depth / 2 + LABEL_EPS), rot: new THREE.Euler(0, 0, 0) };
    case 'back': return { pos: new THREE.Vector3(0, 0, -box.depth / 2 - LABEL_EPS), rot: new THREE.Euler(0, Math.PI, 0) };
    case 'right': return { pos: new THREE.Vector3(box.width / 2 + LABEL_EPS, 0, 0), rot: new THREE.Euler(0, -Math.PI / 2, 0) };
    case 'left': return { pos: new THREE.Vector3(-box.width / 2 - LABEL_EPS, 0, 0), rot: new THREE.Euler(0, Math.PI / 2, 0) };
    case 'top': return { pos: new THREE.Vector3(0, box.height / 2 + LABEL_EPS, 0), rot: new THREE.Euler(-Math.PI / 2, 0, 0) };
    case 'bottom': return { pos: new THREE.Vector3(0, -box.height / 2 - LABEL_EPS, 0), rot: new THREE.Euler(Math.PI / 2, 0, 0) };
  }
}

// --- Spiral search around a target grid cell to find a valid placement ---
function* gridSpiralOffsets(step: number, maxRadiusSteps: number) {
  // (0,0), (±1,0), (0,±1), (±1,±1), (±2,0), ... outward
  console.log(step)
  yield [0, 0];
  for (let r = 1; r <= maxRadiusSteps; r++) {
    for (let dx = -r; dx <= r; dx++) {
      const dz1 = -r, dz2 = r;
      yield [dx, dz1];
      if (dz2 !== dz1) yield [dx, dz2];
    }
    for (let dz = -r + 1; dz <= r - 1; dz++) {
      const dx1 = -r, dx2 = r;
      yield [dx1, dz];
      if (dx2 !== dx1) yield [dx2, dz];
    }
  }
}

function findPlacementNearPoint(
  item: BoxConfig,
  pallet: PalletConfig,
  layerItems: (LayoutItem & Partial<RotDeg>)[],
  layerId: number,
  targetX: number,
  targetZ: number,
  step = gridSize,
  maxRadiusSteps = 40 
): PlacementResult {

  for (const rot of ROT_CANDIDATES) {
    const fp = projectedFootprintXZ(item.width, item.height, item.depth, rot);
    const y = pallet.height / 2 + fp.halfY;

    for (const [gx, gz] of gridSpiralOffsets(step, maxRadiusSteps)) {
      const x = snapTo(targetX + gx * step, step);
      const z = snapTo(targetZ + gz * step, step);

      const pos: [number, number, number] = [x, y, z];
      const candidate: any = {
        ...item,
        id: 'candidate',
        position: pos,
        ...rot,
        rotation: rotDegToRadArray(rot),
        layerId
      };

      const okBounds = isWithinPalletBoundsStanding(candidate, pallet);
      const okCollide = !checkCollisionInLayer(candidate, layerItems as any, layerId);

      if (okBounds && okCollide) {
        return { position: pos, rotDeg: rot };
      }
    }
  }
  return null;
}


const BoxLabels: React.FC<{
  box: { width: number; height: number; depth: number; labelTemplate?: LabelTemplate; labelSides?: BoxSide[] };
  translucent?: boolean;
}> = ({ box, translucent }) => {
  if (box.labelTemplate === 'none') return null;

  const tex = React.useMemo(() => makeBarcodeTexture(), [box.labelTemplate]);
  const sides = (box.labelSides && box.labelSides.length ? box.labelSides : ['front', 'back', 'left', 'right', 'top', 'bottom']) as BoxSide[];

  return (
    <group>
      {sides.map((side) => {
        const { pos, rot } = faceTransform(side, box);
        const faceWidth =
          side === 'left' || side === 'right' ? box.depth :
            side === 'top' || side === 'bottom' ? box.width :
              box.width;
        const { width: lw, height: lh } = sizeFromTemplate(box.labelTemplate, faceWidth, box.height);
        return (
          <mesh key={side} position={pos} rotation={rot}>
            <planeGeometry args={[lw, lh]} />
            <meshBasicMaterial
              map={tex}
              side={THREE.DoubleSide}
              transparent={!!translucent}
              opacity={translucent ? 0.85 : 1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- 3D pieces ----------
const PlacedBox: React.FC<any> = ({
  box, allOtherBoxes, isSelected, onSelect, onUpdate, palletDimensions, transformMode, gridSize, orbitControlsRef
}) => {
  const boxRef = useRef<THREE.Mesh>(null);
  const isDragging = useRef(false);
  const { camera, gl, raycaster } = useThree();
  const dragOffset = useRef(new THREE.Vector3());
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current || !boxRef.current) return;
    if (transformMode !== 'translate') return;

    const mouse = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersection);

    const newPos = intersection.sub(dragOffset.current);
    newPos.x = snapTo(newPos.x, gridSize);
    newPos.z = snapTo(newPos.z, gridSize);
    boxRef.current.position.copy(newPos);
  }, [camera, gl.domElement, gridSize, raycaster, transformMode]);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current || !boxRef.current) return;
    isDragging.current = false;
    document.removeEventListener('pointermove', onPointerMove as any);
    document.removeEventListener('pointerup', onPointerUp as any);
    if (orbitControlsRef.current) (orbitControlsRef.current as any).enabled = true;

    const mesh = boxRef.current!;
    const finalPos: [number, number, number] = [mesh.position.x, mesh.position.y, mesh.position.z];

    const updated: any = { ...box, position: finalPos };
    const collide = checkCollisionInLayer(updated, allOtherBoxes as any, (box as any).layerId ?? 1);
    const inBounds = isWithinPalletBoundsStanding(updated, palletDimensions);

    if (!collide && inBounds) onUpdate(box.id, { position: finalPos });
    else mesh.position.fromArray(box.position);
  }, [allOtherBoxes, box, onPointerMove, onUpdate, orbitControlsRef, palletDimensions]);

  const onPointerDown = useCallback((e: any) => {
    e.stopPropagation();
    onSelect(box.id);
    isDragging.current = true;
    if (orbitControlsRef.current) (orbitControlsRef.current as any).enabled = false;

    const planeNormal = new THREE.Vector3(0, 1, 0);
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, boxRef.current!.position);

    const mouse = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane.current, hit)) {
      dragOffset.current.copy(hit).sub(boxRef.current!.position);
    }

    document.addEventListener('pointermove', onPointerMove as any, { passive: true });
    document.addEventListener('pointerup', onPointerUp as any, { once: true });
  }, [camera, gl.domElement, onPointerMove, onPointerUp, onSelect, orbitControlsRef, raycaster, box.id]);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.position.fromArray(box.position);
      const [rx, ry, rz] = rotDegToRadArray(box);
      boxRef.current.rotation.set(rx, ry, rz);
    }
  }, [box.position, box.rotationXDeg, box.rotationYDeg, box.rotationZDeg]);

  return (
    <DreiBox ref={boxRef} args={[box.width, box.height, box.depth]} onPointerDown={onPointerDown} castShadow receiveShadow>
      <meshStandardMaterial
        color={isSelected ? '#d3954f' : '#d1873f'}
        roughness={0.9}
        metalness={0.05}
        transparent={isDragging.current}
        opacity={isDragging.current ? 0.85 : 1}
      />
      <Edges scale={1} color={isSelected ? '#7a4e24' : '#8a5a2b'} lineWidth={isSelected ? 2 : 1} />
      <BoxLabels box={box} />
      <Text position={[0, box.height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1} color="#3b2a1d" anchorX="center" anchorY="middle">
        {box.name || 'Box'}
      </Text>
      <Text position={[0, box.height / 2 + 0.01, 0.8]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.9} color="#5b4634" anchorX="center" anchorY="middle">
        {box.width}" × {box.depth}" × {box.height}"
      </Text>
    </DreiBox>
  );
};

const PreviewBox: React.FC<{ previewBox: any; isValidPosition: boolean }> = ({ previewBox, isValidPosition }) => {
  if (!previewBox) return null;
  return (
    <DreiBox args={[previewBox.width, previewBox.height, previewBox.depth]} position={previewBox.position} rotation={previewBox.rotation}>
      <meshStandardMaterial color={isValidPosition ? '#10b981' : '#ef4444'} transparent opacity={0.35} roughness={0.8} metalness={0.1} />
      <Edges scale={1} color={isValidPosition ? '#10b981' : '#ef4444'} lineWidth={2} />
      <BoxLabels box={previewBox} translucent />
    </DreiBox>
  );
};

const WoodenPallet: React.FC<{ dims: PalletConfig }> = ({ dims }) => {
  const wood = useTexture('/wood_texture.jpg');
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.repeat.set(2, 2);
  wood.anisotropy = 8;

  const h = dims.height;
  const top = h * 0.25;
  const bearer = h * 0.35;
  const gap = (dims.depth * 0.04);
  const slatCount = 7;
  const slatDepth = (dims.depth - gap * (slatCount - 1)) / slatCount;

  const bearerWidth = dims.width * 0.15;
  const bearerY = -h / 2 + bearer / 2;
  const topY = -h / 2 + bearer + top / 2;

  const mat = (<meshStandardMaterial map={wood} roughness={0.6} metalness={0.05} />);

  return (
    <group>
      <DreiBox args={[bearerWidth, bearer, dims.depth]} position={[-dims.width / 2 + bearerWidth / 2, bearerY, 0]}>{mat}</DreiBox>
      <DreiBox args={[bearerWidth, bearer, dims.depth]} position={[0, bearerY, 0]}>{mat}</DreiBox>
      <DreiBox args={[bearerWidth, bearer, dims.depth]} position={[dims.width / 2 - bearerWidth / 2, bearerY, 0]}>{mat}</DreiBox>
      {Array.from({ length: slatCount }).map((_, i) => {
        const z = -dims.depth / 2 + slatDepth / 2 + i * (slatDepth + gap);
        return <DreiBox key={i} args={[dims.width, top, slatDepth]} position={[0, topY, z]}>{mat}</DreiBox>;
      })}
    </group>
  );
};

const Scene: React.FC<any> = ({
  dimensions, boxes, selectedBoxId, setSelectedBoxId, onUpdateBox, transformMode, previewBox, isValidPosition
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const woodTex = useTexture('/wood_texture.jpg');

  useEffect(() => {
    if (woodTex) {
      woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
      woodTex.repeat.set(Math.max(1, Math.round(dimensions.width / 12)), Math.max(1, Math.round(dimensions.depth / 12)));
      woodTex.anisotropy = 8;
    }
  }, [woodTex, dimensions.width, dimensions.depth]);

  return (
    <>
      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight position={[15, 25, 10]} intensity={0.25} castShadow />
      <spotLight position={[-20, 40, -20]} angle={0.3} penumbra={0.5} intensity={0.25} castShadow color="#ffdcb6" />
      <ContactShadows position={[0, -dimensions.height / 2, 0]} opacity={0.35} scale={100} blur={2.5} far={10} />
      <Environment preset="apartment" background={false} environmentIntensity={0.7} />

      <group onPointerDown={(e) => { if ((e.object as any).uuid === (e.currentTarget as any)?.uuid) setSelectedBoxId(null); }}>
        <WoodenPallet dims={dimensions} />
        <Text position={[0, dimensions.height / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="#6b4f2a" anchorX="center" anchorY="middle">
          {dimensions.name}
        </Text>
      </group>

      <PreviewBox previewBox={previewBox} isValidPosition={isValidPosition} />

      {boxes.map((box: any) => (
        <PlacedBox
          key={box.id}
          box={box}
          allOtherBoxes={boxes.filter((b: any) => b.id !== box.id)}
          isSelected={box.id === selectedBoxId}
          onSelect={setSelectedBoxId}
          onUpdate={onUpdateBox}
          palletDimensions={dimensions}
          transformMode={transformMode}
          gridSize={gridSize}
          orbitControlsRef={controlsRef}
        />
      ))}

      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} autoRotate={false} minDistance={5} maxDistance={100} />
    </>
  );
};

const Palette3D: React.FC<any> = ({
  dimensions, boxes, selectedBoxId, setSelectedBoxId, onUpdateBox, transformMode, previewBox, isValidPosition
}) => (
  <div style={{ width: '100%', height: '100%', touchAction: 'none' }}>
    <Canvas
      shadows
      camera={{ position: [40, 35, 38], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => { gl.setClearColor(COLORS.bgLight); }}
    >
      <Scene
        dimensions={dimensions}
        boxes={boxes}
        selectedBoxId={selectedBoxId}
        setSelectedBoxId={setSelectedBoxId}
        onUpdateBox={onUpdateBox}
        transformMode={transformMode}
        previewBox={previewBox}
        isValidPosition={isValidPosition}
      />
    </Canvas>
  </div>
);

// ---------- Scroll lock hook (desktop only ≥768px) ----------
function useScrollLock(lock: boolean) {
  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktop) return; 
    if (!lock) return;

    const body = document.body;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;

    // Calculate scrollbar width and compensate to avoid layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
    };
  }, [lock]);
}

// ----------------- Page -----------------
const LayerCreationPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    palletConfigs,
    boxConfigs,
    savedLayouts: storeSavedLayouts = [],
    addSavedLayout,
    updateSavedLayout,
  } = useAppStore();

  const [availablePallets, setAvailablePallets] = useState<PalletConfig[]>([]);
  const [availableItems, setAvailableItems] = useState<BoxConfig[]>([]);
  const [selectedPallet, setSelectedPallet] = useState<PalletConfig | null>(null);
  const inToMm = (inch: number) => inch * 25.4;

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);

  // Start in drag; on touch we use custom pointer-drag
  const [placeMode, setPlaceMode] = useState<'drag' | 'tap'>('drag');
  const [pendingItem, setPendingItem] = useState<BoxConfig | null>(null);

  const [visibleItemIds, setVisibleItemIds] = useState<string[]>([]);

  useEffect(() => {
    const nextPallets: PalletConfig[] = Array.isArray(palletConfigs) ? palletConfigs : [];
    const nextItems: BoxConfig[] = Array.isArray(boxConfigs) ? boxConfigs : [];

    setAvailablePallets(nextPallets);
    setAvailableItems(nextItems);
    setSelectedPallet(prev => (prev ?? nextPallets[0] ?? null));
  }, [palletConfigs, boxConfigs as any, boxConfigs]); 

  const [savedViews, setSavedViews] = useState<SavedLayout[]>([]);
  useEffect(() => {
    if (Array.isArray(storeSavedLayouts)) setSavedViews(storeSavedLayouts);
  }, [storeSavedLayouts]);

  const [filterPalletId, setFilterPalletId] = useState<string>('');
  const [filterItemId, setFilterItemId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const [layers, setLayers] = useState<Layer[]>([]);
  const [currentLayer, setCurrentLayer] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [transformMode] = useState<'translate' | 'rotate'>('translate');
  const [creatingLayerOpen, setCreatingLayerOpen] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerMode, setNewLayerMode] = useState<'blank' | 'duplicate'>('blank');
  const [duplicateFromLayerId, setDuplicateFromLayerId] = useState<number | null>(null);

  const [pendingDrop, setPendingDrop] = useState<{ item: BoxConfig; position: THREE.Vector3 } | null>(null);

  type SnackSeverity = 'success' | 'error' | 'info' | 'warning';
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: SnackSeverity; }>({
    open: false, message: '', severity: 'success',
  });

  const [previewBox, setPreviewBox] = useState<any>(null);
  const [isValidPosition, setIsValidPosition] = useState<boolean>(true);

  const [renamingLayerId, setRenamingLayerId] = useState<number | null>(null);
  const [renamingLayerName, setRenamingLayerName] = useState<string>('');
  const startRenameLayer = (layer: Layer) => { setRenamingLayerId(layer.id); setRenamingLayerName(layer.name); };
  const commitRenameLayer = () => {
    if (renamingLayerId == null) return;
    const newName = renamingLayerName.trim();
    if (!newName) { setSnackbar({ open: true, message: 'Name cannot be empty', severity: 'error' }); return; }
    setLayers(prev => prev.map(l => l.id === renamingLayerId ? { ...l, name: newName } : l));
    setSnackbar({ open: true, message: 'Layer renamed', severity: 'success' });
    setRenamingLayerId(null); setRenamingLayerName('');
  };
  const cancelRenameLayer = () => { setRenamingLayerId(null); setRenamingLayerName(''); };

  const [nextRot] = useState<RotDeg>({ rotationXDeg: 0, rotationYDeg: 0, rotationZDeg: 0 });

  const viewCardRef = useRef<HTMLDivElement | null>(null);
  const currentLayerData = currentLayer == null ? undefined : layers.find(layer => layer.id === currentLayer);
  const currentItems = (currentLayerData?.items || []) as (LayoutItem & Partial<RotDeg> & Partial<BoxConfig>)[];
  const currentLayerItems = currentItems.length;
  const currentLayerWeight = currentItems.reduce((sum, i: any) => sum + (i.weight ?? 0), 0);
  const palletVolume = selectedPallet ? selectedPallet.width * selectedPallet.depth * selectedPallet.height : 1;
  const currentLayerVolume = currentItems.reduce((ls: any, i: any) => ls + (i.width * i.depth * i.height), 0);
  const currentLayerVolumePct = selectedPallet ? Math.min((currentLayerVolume / palletVolume) * 100, 100) : 0;
  const totalWeight = layers.reduce((sum, layer) => sum + layer.items.reduce((acc, it: any) => acc + (it.weight ?? 0), 0), 0);
  const weightUsedPct = selectedPallet ? Math.min((totalWeight / (selectedPallet.maxWeight || 1)) * 100, 100) : 0;

  const palletWeightUnit = (selectedPallet?.maxWeightUnit ?? 'lbs');

  const removeSelectedItem = (): void => {
    if (!selectedItem || currentLayer == null) return setSnackbar({ open: true, message: 'No product selected to remove', severity: 'error' });
    setLayers(prev => prev.map(layer => layer.id === currentLayer ? { ...layer, items: layer.items.filter(i => i.id !== selectedItem) } : layer));
    setSelectedItem(null);
    setSnackbar({ open: true, message: 'Selected product removed', severity: 'success' });
  };

  const updateBox = (id: string, updates: Partial<LayoutItem & RotDeg>): void => {
    if (currentLayer == null) return;
    setLayers(prev => prev.map(layer =>
      layer.id === currentLayer ? { ...layer, items: layer.items.map((it: any) => it.id === id ? { ...it, ...updates } : it) } : layer
    ));
  };

  const applyRotToSelected = (updates: Partial<RotDeg>) => {
    if (!selectedItem || !selectedPallet || currentLayer == null) return setSnackbar({ open: true, message: 'Select a product first', severity: 'error' });
    const item = currentItems.find(i => i.id === selectedItem);
    if (!item) return;
    const newRot: RotDeg = {
      rotationXDeg: norm(updates.rotationXDeg ?? item.rotationXDeg ?? 0),
      rotationYDeg: norm(updates.rotationYDeg ?? item.rotationYDeg ?? 0),
      rotationZDeg: norm(updates.rotationZDeg ?? item.rotationZDeg ?? 0),
    };
    const fp = projectedFootprintXZ(item.width, item.height, item.depth, newRot);
    const y = selectedPallet.height / 2 + fp.halfY;
    const test = { ...item, ...newRot, position: [item.position[0], y, item.position[2]] as [number, number, number] };
    const collide = checkCollisionInLayer(test, currentItems as any, (item as any).layerId ?? currentLayer);
    const inBounds = isWithinPalletBoundsStanding(test as any, selectedPallet);
    if (!collide && inBounds) {
      updateBox(item.id, { ...newRot, rotation: rotDegToRadArray(newRot), position: test.position });
      setSnackbar({ open: true, message: 'Orientation updated', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: 'Invalid orientation (collision/bounds)', severity: 'error' });
    }
  };
  const layFlatSelected = () => applyRotToSelected({ rotationXDeg: 0, rotationZDeg: 0 });
  const standWidthSelected = () => applyRotToSelected({ rotationZDeg: 90 });
  const standDepthSelected = () => applyRotToSelected({ rotationXDeg: 90 });
  const rotateYSelected = (delta: number) => {
    if (!selectedItem || currentLayer == null) return setSnackbar({ open: true, message: 'Select a product first', severity: 'error' });
    const item = currentItems.find(i => i.id === selectedItem)!;
    applyRotToSelected({ rotationYDeg: norm((item.rotationYDeg ?? 0) + delta) });
  };

  const findValidPlacementForBox = (
    item: BoxConfig,
    pallet: PalletConfig,
    layerItems: (LayoutItem & Partial<RotDeg>)[],
    layerId: number,
    step = gridSize
  ): PlacementResult => {
    const halfW = pallet.width / 2;
    const halfD = pallet.depth / 2;
    for (const rot of ROT_CANDIDATES) {
      const fp = projectedFootprintXZ(item.width, item.height, item.depth, rot);
      const y = pallet.height / 2 + fp.halfY;
      for (let x = -halfW + fp.footW / 2 + MARGIN; x <= halfW - fp.footW / 2 - MARGIN + EPS; x += step) {
        for (let z = -halfD + fp.footD / 2 + MARGIN; z <= halfD - fp.footD / 2 - MARGIN + EPS; z += step) {
          const pos: [number, number, number] = [snapTo(x, step), y, snapTo(z, step)];
          const candidate: any = { ...item, id: 'candidate', position: pos, ...rot, rotation: rotDegToRadArray(rot), layerId };
          const okBounds = isWithinPalletBoundsStanding(candidate, pallet);
          const okCollide = !checkCollisionInLayer(candidate, layerItems as any, layerId);
          if (okBounds && okCollide) return { position: pos, rotDeg: rot };
        }
      }
    }
    return null;
  };

  const startTouchDrag = useCallback((box: BoxConfig, startEvent: React.PointerEvent) => {
    if (!viewCardRef.current || !selectedPallet) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.zIndex = '9999';
    overlay.style.cursor = 'grabbing';
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);

    let lastX = startEvent.clientX;
    let lastY = startEvent.clientY;

    const move = (e: PointerEvent) => { lastX = e.clientX; lastY = e.clientY; };
    const up = () => {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      overlay.remove();

      const targetRect = viewCardRef.current!.getBoundingClientRect();
      if (lastX >= targetRect.left && lastX <= targetRect.right && lastY >= targetRect.top && lastY <= targetRect.bottom) {
        const x = ((lastX - targetRect.left) / targetRect.width) * 2 - 1;
        const z = -((lastY - targetRect.top) / targetRect.height) * 2 + 1;
        const position = new THREE.Vector3(x * (selectedPallet.width / 2), 0, z * (selectedPallet.depth / 2));
        handleDrop(box, position);
      }
    };

    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
  }, [selectedPallet]);

  const handleDrop = (item: BoxConfig, position: THREE.Vector3): void => {
    if (!selectedPallet) return;
    if (layers.length === 0) {
      setNewLayerName('Layer 1');
      setNewLayerMode('blank');
      setDuplicateFromLayerId(null);
      setPendingDrop({ item, position });
      setCreatingLayerOpen(true);
      return;
    }

    const layerIdToPlace = currentLayer ?? layers[0].id;
    const layerData = layers.find(layer => layer.id === layerIdToPlace);
    if (!layerData) return;

    if (
      selectedPallet.maxWeight != null && 
      totalWeight + (item.weight ?? 0) > selectedPallet.maxWeight
    ) {
      setSnackbar({
        open: true,
        message: `Cannot add box. Maximum pallet weight of ${selectedPallet.maxWeight} ${palletWeightUnit} would be exceeded.`,
        severity: 'error',
      });
      return;
    }

    const targetX = position.x;
    const targetZ = position.z;
    const found = findPlacementNearPoint(
      item,
      selectedPallet,
      (layerData.items as any[]) as (LayoutItem & Partial<RotDeg>)[],
      layerIdToPlace,
      targetX,
      targetZ,
      gridSize
    );

    if (!found) {
      setSnackbar({ open: true, message: 'No valid spot found near that position (collision or out of bounds).', severity: 'error' });
      return;
    }

    const placedBox: any = {
      ...item,
      id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: found.position,
      rotation: rotDegToRadArray(found.rotDeg),
      ...found.rotDeg,
      layerId: layerIdToPlace
    };

    setLayers(prev => prev.map(layer =>
      layer.id === layerIdToPlace ? { ...layer, items: [...layer.items, placedBox] } : layer
    ));
    setPreviewBox(null);
    setIsValidPosition(true);
    setSnackbar({ open: true, message: `Added ${item.name}`, severity: 'success' });
  };

  const addNewLayer = (): void => {
    const nextId = Math.max(0, ...layers.map(l => l.id)) + 1;
    setNewLayerName(`Layer ${nextId}`);
    setNewLayerMode('blank');
    setDuplicateFromLayerId(layers.length ? layers[0].id : null);
    setPendingDrop(null);
    setCreatingLayerOpen(true);
  };

  const closeCreatingLayer = () => {
    setCreatingLayerOpen(false);
    setNewLayerName('');
    setNewLayerMode('blank');
    setDuplicateFromLayerId(null);
    setPendingDrop(null);
  };

  const cloneItemsWithNewIds = (items: any[]): any[] => {
    return items.map(it => {
      const newId = `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return { ...JSON.parse(JSON.stringify(it)), id: newId };
    });
  };

  const confirmCreateLayer = () => {
    const name = newLayerName.trim();
    if (!name) {
      setSnackbar({ open: true, message: 'Layer name cannot be empty', severity: 'error' });
      return;
    }
    const newLayerId = layers.length === 0 ? 1 : Math.max(...layers.map(l => l.id), 0) + 1;

    let itemsToAdd: any[] = [];
    if (newLayerMode === 'duplicate' && duplicateFromLayerId != null) {
      const src = layers.find(l => l.id === duplicateFromLayerId);
      if (src) itemsToAdd = cloneItemsWithNewIds(src.items ?? []);
    }

    const newLayer: Layer = { id: newLayerId, name, items: itemsToAdd };
    setLayers(prev => [...prev, newLayer]);
    setCurrentLayer(newLayerId);
    setSelectedItem(null);
    setSnackbar({ open: true, message: `Added layer: ${name}`, severity: 'success' });

    if (pendingDrop && selectedPallet) {
      try {
        const { item, position } = pendingDrop;


        if (
          selectedPallet.maxWeight != null &&
          totalWeight + (item.weight ?? 0) > selectedPallet.maxWeight
        ) {
          setSnackbar({
            open: true,
            message: `Cannot add box. Maximum pallet weight of ${selectedPallet.maxWeight} ${palletWeightUnit} would be exceeded.`,
            severity: 'error',
          });
        } else {
          const targetX = position.x;
          const targetZ = position.z;

          const found = findPlacementNearPoint(
            item,
            selectedPallet,
            (newLayer.items as any[]) as (LayoutItem & Partial<RotDeg>)[],
            newLayerId,
            targetX,
            targetZ,
            gridSize
          );

          if (!found) {
            setSnackbar({ open: true, message: 'No valid spot found near that position (collision or out of bounds) for the new layer.', severity: 'error' });
          } else {
            const placedBox: any = {
              ...item,
              id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: found.position,
              rotation: rotDegToRadArray(found.rotDeg),
              ...found.rotDeg,
              layerId: newLayerId
            };

            setLayers(prev => prev.map(layer =>
              layer.id === newLayerId ? { ...layer, items: [...layer.items, placedBox] } : layer
            ));
            setSnackbar({ open: true, message: `Added ${item.name} to ${name}`, severity: 'success' });
          }
        }
      } finally {
        setPendingDrop(null);
      }
    }

    closeCreatingLayer();
  };

  const saveCurrentLayout = (): void => {
    if (!selectedPallet) return;
    const snapshotLayers: Layer[] = layers.map((l) => ({ ...l, items: l.items.map((it: any) => ({ ...it })) }));
    const svTotalItems = snapshotLayers.reduce((sum, l) => sum + l.items.length, 0);
    const svTotalWeight = snapshotLayers.reduce((sum, l) => sum + l.items.reduce((acc: number, it: any) => acc + (it.weight ?? 0), 0), 0);

    const palletSnap = {
      id: selectedPallet.id,
      name: selectedPallet.name,
      width: selectedPallet.width,          
      depth: selectedPallet.depth,          
      height: selectedPallet.height,        
      maxWeight: selectedPallet.maxWeight,
      maxWeightUnit: selectedPallet.maxWeightUnit,
      maxWeightKg: selectedPallet.maxWeightKg,
      lengthUnit: selectedPallet.lengthUnit,
      widthUnit: selectedPallet.widthUnit,
      depthUnit: selectedPallet.depthUnit,
      heightUnit: selectedPallet.heightUnit,
    };



    const itemMap = new Map<string, { id: string; name: string; width: number; depth: number; height: number; weight?: number; count: number; }>();
    for (const ly of snapshotLayers) {
      for (const it of (ly.items as any[])) {
        const key = String(it.sourceId ?? it.id ?? it.name);
        const entry = itemMap.get(key) ?? {
          id: String(it.sourceId ?? it.id ?? it.name),
          name: it.name ?? 'Item', width: it.width, depth: it.depth, height: it.height, weight: it.weight, count: 0,
        };
        entry.count += 1;
        itemMap.set(key, entry);
      }
    }
    const itemsSummary = Array.from(itemMap.values());

    const basePayload = {
      timestamp: new Date().toLocaleString(),
      layers: snapshotLayers,
      totalItems: svTotalItems,
      totalWeight: svTotalWeight,
      pallet: palletSnap,
      itemsSummary,
    };

    if (editingId) {
      const updated: SavedLayout = { id: editingId, name: editingName || `Layer ${editingId}`, ...basePayload };
      setSavedViews(prev => prev.map(v => v.id === editingId ? updated : v));
      if (typeof updateSavedLayout === 'function') updateSavedLayout(updated);
      else if (typeof addSavedLayout === 'function') {
        const { savedLayouts } = useAppStore.getState();
        const without = savedLayouts.filter((s: SavedLayout) => s.id !== editingId);
        useAppStore.setState({ savedLayouts: [updated, ...without] });
      }
      setSnackbar({ open: true, message: 'Layer updated!', severity: 'success' });
      setEditingId(null); setEditingName('');
    } else {
      const savedView: SavedLayout = { id: Date.now(), name: `SKU Layer ${savedViews.length + 1}`, ...basePayload };
      setSavedViews(prev => [savedView, ...prev]);
      if (typeof addSavedLayout === 'function') addSavedLayout(savedView);
      setSnackbar({ open: true, message: 'Layer saved successfully!', severity: 'success' });
    }

    setLayers([]);
    setCurrentLayer(null);
    setSelectedItem(null);
    setPreviewBox(null);
    setIsValidPosition(true);
  };

  const loadSavedView = (savedView: SavedLayout): void => {
    const clonedLayers: Layer[] = savedView.layers.map((l) => ({ ...l, items: l.items.map((it: any) => ({ ...it })) }));
    setLayers(clonedLayers);
    setCurrentLayer(clonedLayers[0]?.id ?? null);
    setSelectedItem(null);
    setPreviewBox(null);
    setIsValidPosition(true);
    setEditingId(savedView.id);
    setEditingName(savedView.name);
    setSnackbar({ open: true, message: `Editing ${savedView.name}`, severity: 'success' });
    setLayoutsOpen(false);
  };

  const removeSavedView = (id: number): void => {
    setSavedViews(prev => prev.filter(v => v.id !== id));
    try {
      const st = (useAppStore as any).getState?.();
      if (st?.removeSavedLayout && typeof st.removeSavedLayout === 'function') {
        st.removeSavedLayout(id);
      } else {
        const without = (st?.savedLayouts || []).filter((s: SavedLayout) => s.id !== id);
        (useAppStore as any).setState?.({ savedLayouts: without });
      }
    } catch { }
    setSnackbar({ open: true, message: 'Saved layer deleted', severity: 'success' });
  };

  const getLayerWeight = (layer: Layer) => layer.items.reduce((s: number, it: any) => s + (it.weight ?? 0), 0);
  const hasWorkingItems = layers.some((l) => l.items.length > 0);

  const filteredItems = visibleItemIds.length
    ? availableItems.filter(b => visibleItemIds.includes(String(b.id)))
    : [];
  const savedSource = (storeSavedLayouts.length ? storeSavedLayouts : savedViews);
  const [layoutsOpen, setLayoutsOpen] = useState<boolean>(false);
  useScrollLock(layoutsOpen); 
  const savedFiltered = savedSource.filter((sv) => {
    const palletOk = !filterPalletId || String(sv.pallet?.id ?? '') === String(filterPalletId);
    const itemOk = !filterItemId || (Array.isArray(sv.itemsSummary)
      ? sv.itemsSummary.some(it =>
        String(it.id) === String(filterItemId) ||
        String(it.name).toLowerCase() === String(availableItems.find(i => String(i.id) === String(filterItemId))?.name ?? '')
          .toLowerCase()
      )
      : false);
    const search = searchQuery.trim().toLowerCase();
    const searchOk = !search || (
      (sv.name ?? '').toLowerCase().includes(search) ||
      (sv.pallet?.name ?? '').toLowerCase().includes(search) ||
      (sv.itemsSummary ?? []).some(it => (it.name ?? '').toLowerCase().includes(search))
    );
    return palletOk && itemOk && searchOk;
  });

  return (
    <MuiBox
      sx={{
        height: '100vh',
        overflowY: { xs: 'auto', md: 'hidden' },
        overflowX: 'hidden',
        overscrollBehavior: 'none',
        background: gradient('#eef2f7', '#ffffff'),
        width: '100vw',
        paddingTop: "1vh"
      }}
    >

      <Container maxWidth="xl" sx={{ pt: 0, px: 0 }}>
        <Card elevation={0} sx={{ borderRadius: 0, bgcolor: '#fff', boxShadow: 'none', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ py: 1, px: 3 }}>
            {!selectedPallet ? (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">No pallets found. Please add a pallet in configuration.</Typography>
                <Button variant="contained" onClick={() => navigate('/dashboard')} startIcon={<ArrowBackIcon />}
                  sx={{ background: softGradient, boxShadow: 2, '&:hover': { background: gradient(COLORS.deepBlue, COLORS.slateDark) } }}>
                  Go to Dashboard
                </Button>
                <MuiBox sx={{ flexGrow: 1 }} />

                <Button
                  variant="outlined"
                  startIcon={<ViewListIcon />}
                  onClick={() => setLayoutsOpen(true)}
                >
                  View Saved Layers
                </Button>

              </Stack>
            ) : (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip label={`Pallet: ${selectedPallet.name}`} color="primary" variant="outlined" />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Total Weight</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                    {totalWeight} {palletWeightUnit} / {selectedPallet.maxWeight} {palletWeightUnit}
                  </Typography>
                  <MuiBox sx={{ width: 120, height: 6, bgcolor: '#e2e8f0', borderRadius: 8 }}>
                    <MuiBox sx={{ width: `${weightUsedPct}%`, height: '100%', bgcolor: weightUsedPct >= 100 ? '#ef4444' : '#64748b', borderRadius: 8 }} />
                  </MuiBox>
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Layer {currentLayer ?? '-'}: {currentLayerItems} Products
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>| {currentLayerWeight} {palletWeightUnit}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>| Volume {currentLayerVolumePct.toFixed(1)}%</Typography>
                </Stack>

                {/* Right side spacer + View Saved Layouts button */}
                <MuiBox sx={{ flexGrow: 1 }} />
                <Button
                  variant="outlined"
                  startIcon={<ViewListIcon />}
                  onClick={() => setLayoutsOpen(true)}
                >
                  View Saved Layers
                </Button>

              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>

      <Container maxWidth="xl" sx={{ pb: 2, pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                bgcolor: '#fff',
                boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                position: { sm: 'sticky', md: 'sticky' },
                top: { sm: 12, md: 12 },
                height: { xs: 'auto', sm: '45vh', md: '70vh' },
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ pt: 2, flex: '0 0 auto' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155' }}>
                    Select Pallet & Products
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={placeMode}
                    onChange={(_, v) => v && setPlaceMode(v)}
                  >
                    <ToggleButton value="drag">Drag</ToggleButton>
                    <ToggleButton value="tap">Tap</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                {placeMode === 'tap' && (
                  <Chip
                    size="small"
                    color={pendingItem ? 'success' : 'default'}
                    label={pendingItem ? `Armed: ${pendingItem.name}` : 'Tap product below, then tap pallet'}
                    sx={{ mb: 1 }}
                  />
                )}

                <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="pallet-select-label-left">Pallet</InputLabel>
                    <Select
                      labelId="pallet-select-label-left"
                      label="Pallet"
                      value={selectedPallet?.id ?? ''}
                      onChange={(e: any) => {
                        const pal = availablePallets.find(p => String(p.id) === String(e.target.value));
                        if (pal) setSelectedPallet(pal);
                        setLayers([]);
                        setCurrentLayer(null);
                        setSelectedItem(null);
                      }}
                    >
                      {availablePallets.map((p) => {
                        const lengthUnit = p.lengthUnit ?? 'in';
                        const depthUnit = p.lengthUnit ?? lengthUnit; 
                        const heightUnit = p.lengthUnit ?? lengthUnit;
                        const displayWidth =
                          lengthUnit === 'mm'
                            ? Math.round(inToMm(p.width))      
                            : Number(p.width.toFixed(2));

                        const displayDepth =
                          depthUnit === 'mm'
                            ? Math.round(inToMm(p.depth))
                            : Number(p.depth.toFixed(2));

                        const displayHeight =
                          heightUnit === 'mm'
                            ? Math.round(inToMm(p.height))
                            : Number(p.height.toFixed(2));

                        return (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} &nbsp;–&nbsp;
                            {displayWidth} {lengthUnit} × {displayDepth} {depthUnit} × {displayHeight} {heightUnit}
                          </MenuItem>
                        );
                      })}




                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
                    <InputLabel id="item-multi-select-label">Products</InputLabel>
                    <Select
                      multiple
                      labelId="item-multi-select-label"
                      label="Products"
                      value={visibleItemIds}
                      onChange={(e: any) => setVisibleItemIds(e.target.value as string[])}
                      renderValue={(selected) => {
                        const names = availableItems.filter(i => (selected as string[]).includes(String(i.id))).map(i => i.name);
                        return names.join(', ');
                      }}
                    >
                      {availableItems.map((it) => {
                        const lengthUnit = it.widthUnit ?? 'in';
                        const widthUnit = it.depthUnit ?? lengthUnit;
                        const heightUnit = it.heightUnit ?? lengthUnit;

                        return (
                          <MenuItem key={it.id} value={String(it.id)}>
                            {it.name} — {it.width} {lengthUnit} × {it.depth} {widthUnit} × {it.height} {heightUnit}
                          </MenuItem>
                        );
                      })}

                    </Select>
                  </FormControl>
                </Stack>

                <Divider sx={{ my: 1 }} />

                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {placeMode === 'drag' ? 'Drag an product into the 3D view' : 'Tap to arm, then tap on pallet'}
                </Typography>
              </CardContent>

              {/* Scrollable items list */}
              <MuiBox sx={{ mt: 1, px: 2, pb: 2, overflowY: 'auto', flex: '1 1 0' }}>
                <Grid container spacing={1} alignItems="stretch">
                  {filteredItems.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: 11 }}>
                        Select products to display.
                      </Typography>
                    </Grid>
                  )}

                  {filteredItems.map((box: any) => {
                    const lengthUnit = box.widthUnit ?? 'in';
                    const widthUnit = box.depthUnit ?? lengthUnit;
                    const heightUnit = box.heightUnit ?? lengthUnit;
                    const itemWeightUnit = box.weightUnit ?? 'lbs';

                    return (
                      <Grid key={box.id} size={{ xs: 12 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 0.75,
                            borderRadius: 1.5,
                            borderColor: 'rgba(2,6,23,0.08)',
                            cursor: 'grab',
                            transition: 'transform .15s ease, box-shadow .15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 12px rgba(2,6,23,0.08)'
                            },
                            touchAction: 'none',
                          }}
                          draggable={!isTouchDevice && placeMode === 'drag'}
                          onDragStart={(e) => {
                            if (isTouchDevice || placeMode !== 'drag') return;
                            e.dataTransfer.setData('application/json', JSON.stringify(box));
                          }}
                          onPointerDown={(e) => {
                            if (!isTouchDevice || placeMode !== 'drag') return;
                            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                            startTouchDrag(box, e);
                          }}
                          onClick={() => {
                            if (placeMode !== 'tap') return;
                            setPendingItem((prev) => (prev?.id === box.id ? null : box));
                          }}
                        >
                          <Button
                            size="small"
                            disableElevation
                            sx={{
                              minHeight: 24,
                              fontSize: 10,
                              textTransform: 'none',
                              borderRadius: 1,
                              bgcolor: '#1e3a8a',
                              color: '#fff',
                              '&:hover': { bgcolor: '#1e40af' },
                              py: 0.25,
                              px: 1.25
                            }}
                          >
                            {placeMode === 'drag' ? 'Drag' : 'Tap'}
                          </Button>

                          <Stack spacing={0.1} sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: '#334155', lineHeight: 1.1, fontSize: 11 }}
                            >
                              {box.name}
                            </Typography>

                            {/* dimensions with units */}
                            <Typography
                              variant="caption"
                              sx={{ color: '#64748b', lineHeight: 1.1, fontSize: 10 }}
                            >
                              {box.width} {lengthUnit} × {box.depth} {widthUnit} × {box.height} {heightUnit}
                            </Typography>

                            {/* weight with its own unit */}
                            <Typography
                              variant="caption"
                              sx={{ color: '#64748b', lineHeight: 1.1, fontSize: 10 }}
                            >
                              {box.weight} {itemWeightUnit}
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}

                </Grid>
              </MuiBox>
            </Card>
          </Grid>

          {/* 3D view (same height as sidebar) */}
          <Grid size={{ xs: 12, sm: 8, md: 9 }}>
            <Card
              ref={viewCardRef}
              elevation={0}
              sx={{
                height: { xs: '50vh', sm: '45vh', md: '70vh' },
                position: 'relative',
                borderRadius: 3,
                bgcolor: '#fff',
                border: `1px solid ${alpha(COLORS.slateDark, 0.08)}`,
                boxShadow: '0 10px 22px rgba(15,23,42,0.08)',
                overflow: 'hidden'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (!selectedPallet) return;
                e.preventDefault();
                const boxData = e.dataTransfer.getData('application/json');
                if (boxData) {
                  const box: BoxConfig = JSON.parse(boxData);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                  const z = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                  const position = new THREE.Vector3(x * (selectedPallet.width / 2), 0, z * (selectedPallet.depth / 2));
                  handleDrop(box, position);
                }
              }}
              onClick={(e) => {
                if (placeMode !== 'tap' || !pendingItem || !selectedPallet) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const z = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                const position = new THREE.Vector3(x * (selectedPallet.width / 2), 0, z * (selectedPallet.depth / 2));
                handleDrop(pendingItem, position);
                setPendingItem(null);
              }}
            >
              <Palette3D
                dimensions={selectedPallet ?? { width: 48, depth: 40, height: 6, name: 'Pallet', id: 'tmp', maxWeight: 1000 } as any}
                boxes={currentItems}
                selectedBoxId={selectedItem}
                setSelectedBoxId={setSelectedItem}
                onUpdateBox={updateBox}
                transformMode={transformMode}
                previewBox={previewBox}
                isValidPosition={isValidPosition}
              />

              <MuiBox sx={{
                position: 'absolute',
                top: 14,
                left: 14,
                bgcolor: alpha(COLORS.slateDark, 0.85),
                color: '#fff',
                px: 1.25,
                py: 0.75,
                borderRadius: 2,
                fontSize: 12.5,
                boxShadow: 1,
                pointerEvents: 'none',
                maxWidth: { xs: 'calc(100% - 28px)', sm: '60%', md: '40%' },
              }}>
                💡 {isTouchDevice
                  ? (placeMode === 'drag' ? 'Press-drag an product from the left, release over pallet' : 'Tap product, then tap pallet')
                  : (placeMode === 'drag' ? 'Drag an product from the left panel into the view' : 'Tap product, then tap pallet')}
              </MuiBox>

              {/* Right-side controls over 3D */}
              <MuiBox
                sx={{
                  position: 'absolute',
                  top: { xs: 60, md: 14 },
                  right: 14,
                  left: { xs: 14, md: 'auto' },
                  display: 'flex',
                  justifyContent: { xs: 'center', md: 'flex-end' },
                  pointerEvents: 'none',
                }}
              >
                <Stack
                  direction={{ xs: 'row', md: 'column' }}
                  spacing={{ xs: 0.5, md: 1 }}
                  alignItems="center"
                  useFlexGap
                  sx={{
                    p: { xs: 0.75, md: 1 },
                    borderRadius: 2,
                    bgcolor: alpha('#0f172a', 0.6),
                    backdropFilter: 'blur(6px)',
                    boxShadow: '0 6px 18px rgba(15,23,42,0.18)',
                    flexWrap: 'wrap',
                    maxWidth: { xs: '100%', md: 'auto' },
                    pointerEvents: 'auto',
                    '& .MuiButton-root': {
                      color: '#fff',
                      fontSize: { xs: '0.7rem', md: '0.8125rem' },
                      padding: { xs: '3px 8px', md: '4px 10px' },
                      minWidth: { xs: 'auto', md: '100%' },
                      whiteSpace: 'nowrap',
                      '& .MuiButton-startIcon, & .MuiButton-endIcon': {
                        marginLeft: { xs: '2px', md: '8px' },
                        marginRight: { xs: '2px', md: '8px' },
                        '& > *': {
                          fontSize: { xs: '14px', md: '18px' }
                        }
                      }
                    },
                    '& .MuiButton-outlined': { borderColor: alpha('#ffffff', 0.4) },
                  }}
                >
                  <Button size="small" variant="outlined" startIcon={<StraightenIcon />} onClick={layFlatSelected} disabled={!selectedItem}>
                    Flat
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<HeightIcon />} onClick={standWidthSelected} disabled={!selectedItem}>
                    W
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<HeightIcon />} onClick={standDepthSelected} disabled={!selectedItem}>
                    L
                  </Button>

                  <Button size="small" variant="contained" startIcon={<RotateLeftIcon />} onClick={() => rotateYSelected(-90)} disabled={!selectedItem}
                    sx={{ background: softGradient, '&:hover': { background: gradient(COLORS.deepBlue, COLORS.slateDark) } }}>
                    -90°
                  </Button>
                  <Button size="small" variant="contained" endIcon={<RotateRightIcon />} onClick={() => rotateYSelected(+90)} disabled={!selectedItem}
                    sx={{ background: softGradient, '&:hover': { background: gradient(COLORS.deepBlue, COLORS.slateDark) } }}>
                    +90°
                  </Button>

                  <Button size="small" variant="outlined" startIcon={<DeleteIcon />} onClick={removeSelectedItem} disabled={!selectedItem}>
                    Del
                  </Button>
                  <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={addNewLayer}
                    sx={{ background: softGradient, '&:hover': { background: gradient(COLORS.deepBlue, COLORS.slateDark) } }}>
                    Layer
                  </Button>
                  <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveCurrentLayout}
                    sx={{ background: softGradient, boxShadow: 2, '&:hover': { background: gradient(COLORS.deepBlue, COLORS.slateDark) } }}>
                    {editingId ? 'Save' : 'Save'}
                  </Button>
                </Stack>
              </MuiBox>

              {previewBox && (
                <MuiBox sx={{ position: 'absolute', bottom: 14, left: 14, bgcolor: isValidPosition ? alpha('#10b981', 0.95) : alpha('#ef4444', 0.95), color: '#fff', px: 1.25, py: 0.75, borderRadius: 2, fontSize: 12.5, boxShadow: 1 }}>
                  {isValidPosition ? '✅ Valid Position' : '❌ Invalid (Collision/Bounds)'}
                </MuiBox>
              )}
              {/* Current Layers — bottom overlay inside 3D view */}
              {layers.length > 0 && (
                <MuiBox
                  sx={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 12,
                    pointerEvents: 'none',    
                    zIndex: 3,
                  }}
                >
                  <Paper
                    elevation={0}
                    onPointerDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    sx={{
                      pointerEvents: 'auto',   // ...panel receives events
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha('#0f172a', 0.6),
                      color: '#fff',
                      border: `1px solid ${alpha('#ffffff', 0.18)}`,
                      backdropFilter: 'blur(6px)',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.28)',
                      maxHeight: { xs: 140, md: 160 },
                      overflowY: 'auto',
                    }}
                  >
                    <Stack spacing={1.25}>
                      {layers.map((layer) => {
                        const isEditing = renamingLayerId === layer.id;

                        if (isEditing) {
                          return (
                            <Stack
                              key={layer.id}
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ flexWrap: 'wrap' }}
                            >
                              <TextField
                                size="small"
                                value={renamingLayerName}
                                autoFocus
                                onChange={(e) => setRenamingLayerName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRenameLayer();
                                  if (e.key === 'Escape') cancelRenameLayer();
                                }}
                                sx={{
                                  minWidth: 200,
                                  '& .MuiInputBase-root, & fieldset': {
                                    bgcolor: alpha('#ffffff', 0.08),
                                    color: '#fff',
                                    borderColor: alpha('#ffffff', 0.2),
                                  },
                                }}
                              />
                              <Button size="small" onClick={commitRenameLayer} variant="contained">
                                Save
                              </Button>
                              <Button size="small" onClick={cancelRenameLayer} variant="text" sx={{ color: '#fff' }}>
                                Cancel
                              </Button>
                              <Chip
                                label={`(${layer.items.length} items, ${getLayerWeight(layer)} ${palletWeightUnit})`}
                                variant="outlined"
                                sx={{
                                  ml: 1,
                                  borderColor: alpha('#ffffff', 0.4),
                                  color: '#fff',
                                }}
                              />
                            </Stack>
                          );
                        }

                        return (
                          <Stack
                            key={layer.id}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ flexWrap: 'wrap' }}
                          >
                            <Chip
                              label={layer.name}
                              onClick={() => { setCurrentLayer(layer.id); setSelectedItem(null); }}
                              color={currentLayer === layer.id ? 'primary' : 'default'}
                              variant={currentLayer === layer.id ? 'filled' : 'outlined'}
                              sx={
                                currentLayer === layer.id
                                  ? { background: softGradient, color: '#fff' }
                                  : { borderColor: alpha('#ffffff', 0.4), color: '#fff' }
                              }
                            />
                            <Chip
                              label={`${layer.items.length} items, ${getLayerWeight(layer)} ${palletWeightUnit}`}
                              variant="outlined"
                              sx={{ borderColor: alpha('#ffffff', 0.4), color: '#fff' }}
                            />
                            <Tooltip title="Rename layer">
                              <Button size="small" onClick={() => startRenameLayer(layer)} sx={{ ml: 0.5, color: '#fff' }}>
                                Rename
                              </Button>
                            </Tooltip>

                            {layers.length > 1 && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  if (layers.length <= 1) return;
                                  const next = layers.filter((l) => l.id !== layer.id);
                                  setLayers(next);
                                  if (currentLayer === layer.id && next.length) setCurrentLayer(next[0].id);
                                  if (next.length === 0) setCurrentLayer(null);
                                  setSelectedItem(null);
                                  setSnackbar({ open: true, message: 'Layer removed', severity: 'success' });
                                }}
                                sx={{ ml: 0.5, borderColor: alpha('#ffffff', 0.4) }}
                              >
                                Remove
                              </Button>
                            )}
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Paper>
                </MuiBox>
              )}

            </Card>

          </Grid>
        </Grid>
      </Container>

      {/* Create Layer Dialog */}
      <Dialog open={creatingLayerOpen} onClose={closeCreatingLayer} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Layer</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <TextField
              label="Layer name"
              fullWidth
              size="small"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') confirmCreateLayer(); }}
            />

            {layers.length > 0 && (
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={newLayerMode}
                  onChange={(e) => setNewLayerMode(e.target.value as 'blank' | 'duplicate')}
                >
                  <FormControlLabel value="blank" control={<Radio />} label="Create blank" />
                  <FormControlLabel value="duplicate" control={<Radio />} label="Duplicate existing" />
                </RadioGroup>
              </FormControl>
            )}

            {newLayerMode === 'duplicate' && layers.length > 0 && (
              <FormControl size="small" fullWidth>
                <InputLabel id="duplicate-from-label">Duplicate from</InputLabel>
                <Select
                  labelId="duplicate-from-label"
                  label="Duplicate from"
                  value={duplicateFromLayerId ?? ''}
                  onChange={(e) => setDuplicateFromLayerId(Number(e.target.value))}
                >
                  {layers.map(l => <MenuItem key={l.id} value={l.id}>{l.name} ({l.items.length} items)</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreatingLayer}>Cancel</Button>
          <Button variant="contained" onClick={confirmCreateLayer} sx={{ background: softGradient, '&:hover': { background: gradient(COLORS.deepBlue, COLORS.slateDark) } }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Saved Layouts Modal */}
      <Dialog
        open={layoutsOpen}
        onClose={() => setLayoutsOpen(false)}
        fullWidth
        maxWidth="md"
        disableScrollLock
        keepMounted
      >
        <DialogTitle sx={{ pr: 6 }}>
          Saved Layers
          <IconButton
            aria-label="close"
            onClick={() => setLayoutsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25} sx={{ mb: 1 }}>
            <TextField
              size="small"
              placeholder="Search by name, pallet, or item…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="filter-pallet">Filter by Pallet</InputLabel>
                <Select
                  labelId="filter-pallet"
                  label="Filter by Pallet"
                  value={filterPalletId}
                  onChange={(e) => setFilterPalletId(String(e.target.value))}
                >
                  <MenuItem value="">All</MenuItem>
                  {availablePallets.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="filter-item">Filter by Product</InputLabel>
                <Select
                  labelId="filter-item"
                  label="Filter by Item"
                  value={filterItemId}
                  onChange={(e) => setFilterItemId(String(e.target.value))}
                >
                  <MenuItem value="">All</MenuItem>
                  {availableItems.map(i => <MenuItem key={i.id} value={String(i.id)}>{i.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          <MuiBox sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 0.5 }}>
            {savedFiltered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                No saved layers match filters
              </Typography>
            ) : (
              <Grid container spacing={1}>
                {savedFiltered.map((saved: SavedLayout) => {
                  const items = saved.totalItems ?? saved.layers?.reduce((s, l) => s + l.items.length, 0) ?? 0;
                  const weight = saved.totalWeight ?? saved.layers?.reduce((s, l) => s + l.items.reduce((a, i: any) => a + (i.weight ?? 0), 0), 0) ?? 0;
                  const unit = saved.pallet?.maxWeightUnit ?? palletWeightUnit;

                  return (
                    <Grid key={saved.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card
                        variant="outlined"
                        sx={{ borderColor: alpha(COLORS.slate, 0.25), borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { borderColor: alpha(COLORS.deepBlue, 0.45), boxShadow: 1 } }}
                      >
                        <CardContent sx={{ py: 1, px: 1.25, cursor: 'pointer', flex: 1 }} onClick={() => loadSavedView(saved)}>
                          <Typography variant="body2" sx={{ color: COLORS.slateDark, fontWeight: 700, mb: 0.5 }}>
                            {saved.name}
                          </Typography>

                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                            <Chip size="small" label={`${items} products`} variant="outlined" />
                            <Chip size="small" label={`${weight} ${unit}`} variant="outlined" />
                          </Stack>

                          {Array.isArray(saved.layers) && saved.layers.length > 0 && (
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
                              {saved.layers.slice(0, 3).map((ly) => (
                                <Chip key={ly.id} size="small" variant="outlined" label={ly.name} sx={{ borderColor: alpha(COLORS.slate, 0.4) }} />
                              ))}
                              {saved.layers.length > 3 && (
                                <Chip size="small" variant="outlined" label={`+${saved.layers.length - 3} more`} sx={{ borderStyle: 'dashed', borderColor: alpha(COLORS.slate, 0.4) }} />
                              )}
                            </Stack>
                          )}

                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {saved.timestamp}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: '#475569' }}>
                            {(() => {
                              const p = saved.pallet || {};
                              const lengthUnit = p.lengthUnit ?? 'in';
                              const depthUnit = p.depthUnit ?? lengthUnit;
                              const heightUnit = p.heightUnit ?? lengthUnit;

                              const displayWidth =
                                typeof p.width === 'number'
                                  ? (lengthUnit === 'mm'
                                    ? Math.round(inToMm(p.width))
                                    : Number(p.width.toFixed(2)))
                                  : '';

                              const displayDepth =
                                typeof p.depth === 'number'
                                  ? (depthUnit === 'mm'
                                    ? Math.round(inToMm(p.depth))
                                    : Number(p.depth.toFixed(2)))
                                  : '';

                              const displayHeight =
                                typeof p.height === 'number'
                                  ? (heightUnit === 'mm'
                                    ? Math.round(inToMm(p.height))
                                    : Number(p.height.toFixed(2)))
                                  : '';

                              return `Pallet: ${p.name} (${displayWidth} ${lengthUnit} × ${displayDepth} ${depthUnit} × ${displayHeight} ${heightUnit})`;
                            })()}
                          </Typography>



                          {Array.isArray(saved.itemsSummary) && saved.itemsSummary.length > 0 && (
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                              {saved.itemsSummary.slice(0, 2).map((it) => (
                                <Chip key={it.id} size="small" variant="outlined" label={`${it.name} × ${it.count}`} />
                              ))}
                              {saved.itemsSummary.length > 2 && (
                                <Chip size="small" variant="outlined" label={`+${saved.itemsSummary.length - 2} more`} />
                              )}
                            </Stack>
                          )}
                        </CardContent>

                        <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ px: 0.5, pb: 0.5 }}>
                          <Button size="small" onClick={(e) => { e.stopPropagation(); loadSavedView(saved); }} sx={{ color: COLORS.deepBlue }}>
                            Edit
                          </Button>
                          <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); removeSavedView(saved.id); }}>
                            Delete
                          </Button>
                        </Stack>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </MuiBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1 }}>
          <Button onClick={() => setLayoutsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MuiBox>
  );
};

export default LayerCreationPage;
