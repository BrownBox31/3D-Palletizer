import React, { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Box as DreiBox,
  Cylinder,
  Edges,
  Text,
  ContactShadows,
  Environment,
  useTexture,
  Billboard,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Container, Card, CardContent, CardHeader, Typography, List, ListItem, ListItemButton, ListItemText,
  ListItemIcon, Button, Stack, Divider, Paper, Chip, alpha, Snackbar, Alert, IconButton, Box, TextField, Autocomplete,
  useMediaQuery
} from '@mui/material';
import Grid from "@mui/material/Grid";
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import DeleteIcon from '@mui/icons-material/Delete';

import { useAppStore, type SavedPalletBuild, type PlacedLayer, type PalletConfig } from '../store/store';
import AnimatedRC12Robot from '../components/AnimatedRC12Robot';
import { brand } from '../ui/brand';
/* ---------------- Station types ---------------- */
type StationKey = 'left' | 'front' | 'right';
const stationOrder: StationKey[] = ['left', 'front', 'right'];

const stationPositions: Record<StationKey, THREE.Vector3> = {
  left: new THREE.Vector3(-70, 0, 0),
  front: new THREE.Vector3(0, 0, -70),
  right: new THREE.Vector3(70, 0, 0),
};

const stationLabels: Record<StationKey, string> = {
  left: 'Left',
  front: 'Front',
  right: 'Right',
};

/* ---------------- Label helpers ---------------- */
type BoxSide = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

type LabelTemplate = 'barcode-small' | 'barcode-medium' | 'barcode-large';
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

function sizeFromTemplate(
  tpl: LabelTemplate | undefined,
  faceMaxWidth: number,
  faceMaxHeight: number
) {
  const map = {
    'barcode-small': { wFactor: 0.5, hFactor: 0.20 },
    'barcode-medium': { wFactor: 0.7, hFactor: 0.28 },
    'barcode-large': { wFactor: 0.9, hFactor: 0.36 },
  } as const;
  const { wFactor, hFactor } = map[tpl ?? 'barcode-small'];
  const width = faceMaxWidth * wFactor;
  const height = faceMaxHeight * hFactor;
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


const BoxLabels: React.FC<{
  box: { width: number; height: number; depth: number; labelTemplate?: LabelTemplate; labelSides?: BoxSide[] };
  translucent?: boolean;
}> = ({ box, translucent }) => {
  const tex = React.useMemo(() => makeBarcodeTexture(), [box.labelTemplate]);
  const sides = (box.labelSides ?? []) as BoxSide[];
  if (!sides.length) return null;

  return (
    <group>
      {sides.map((side) => {
        const { pos, rot } = faceTransform(side, box);

        let faceMaxWidth = box.width;
        let faceMaxHeight = box.height;

        if (side === 'left' || side === 'right') {
          faceMaxWidth = box.depth;   // horizontal span across that face
          faceMaxHeight = box.height; // vertical span
        } else if (side === 'front' || side === 'back') {
          faceMaxWidth = box.width;
          faceMaxHeight = box.height;
        } else if (side === 'top' || side === 'bottom') {
          faceMaxWidth = box.width;   // X span
          faceMaxHeight = box.depth;  // Z span (since the plane is horizontal)
        }

        const { width: lw, height: lh } = sizeFromTemplate(
          box.labelTemplate as LabelTemplate,
          faceMaxWidth,
          faceMaxHeight
        );

        return (
          <mesh key={side} position={pos} rotation={rot}>
            <planeGeometry args={[lw, lh]} />
            <meshBasicMaterial
              map={tex}
              side={THREE.DoubleSide}
              transparent={!!translucent}
              opacity={translucent ? 0.85 : 1}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};


/* ---------------- 3D: Boxes for a placed layer (with labels) ---------------- */
const PlacedLayerBoxes: React.FC<{ pl: PlacedLayer; basePos: THREE.Vector3 }> = ({ pl, basePos }) => {
  return (
    <>
      {pl.items.map((it: any) => {
        const [rx, ry, rz] = it.rotation || [0, 0, 0];
        const pos: [number, number, number] = [
          it.position[0] + basePos.x,
          it.position[1] + pl.yOffset + basePos.y,
          it.position[2] + basePos.z,
        ];
        return (
          <DreiBox
            key={it.id}
            args={[it.width, it.height, it.depth]}
            position={pos}
            rotation={[rx, ry, rz]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#c2a070" roughness={0.8} metalness={0.1} />
            <Edges scale={1} color="#7B4019" />
            <BoxLabels
              box={{
                width: it.width,
                height: it.height,
                depth: it.depth,
                labelTemplate: it.labelTemplate as LabelTemplate | undefined,
                labelSides: it.labelSides as BoxSide[] | undefined,
              }}
            />
          </DreiBox>
        );
      })}
    </>
  );
};

/* ---------------- Wooden Pallet (visual only) ---------------- */
const WoodenPallet: React.FC<{ dims: PalletConfig }> = ({ dims }) => {
  const wood = useTexture('/wood_texture.jpg');
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.repeat.set(2, 2);
  wood.anisotropy = 8;

  const H = dims.height;
  const TOP = H * 0.25;
  const BEARER = H * 0.35;
  const GAP = dims.depth * 0.04;

  const SLAT_COUNT = 7;
  const SLAT_DEPTH = (dims.depth - GAP * (SLAT_COUNT - 1)) / SLAT_COUNT;

  const BEARER_WIDTH = dims.width * 0.15;
  const bearerY = -H / 2 + BEARER / 2;
  const topY = -H / 2 + BEARER + TOP / 2;

  const Mat = <meshStandardMaterial map={wood} roughness={0.6} metalness={0.05} />;

  return (
    <group>
      <DreiBox args={[BEARER_WIDTH, BEARER, dims.depth]} position={[-dims.width / 2 + BEARER_WIDTH / 2, bearerY, 0]}>{Mat}</DreiBox>
      <DreiBox args={[BEARER_WIDTH, BEARER, dims.depth]} position={[0, bearerY, 0]}>{Mat}</DreiBox>
      <DreiBox args={[BEARER_WIDTH, BEARER, dims.depth]} position={[dims.width / 2 - BEARER_WIDTH / 2, bearerY, 0]}>{Mat}</DreiBox>
      {Array.from({ length: SLAT_COUNT }).map((_, i) => {
        const z = -dims.depth / 2 + SLAT_DEPTH / 2 + i * (SLAT_DEPTH + GAP);
        return <DreiBox key={i} args={[dims.width, TOP, SLAT_DEPTH]} position={[0, topY, z]}>{Mat}</DreiBox>;
      })}
    </group>
  );
};

/* ---------------- ALWAYS-ON-TOP BILLBOARD LABEL ---------------- */
const StationBillboardLabel: React.FC<{ pos: THREE.Vector3; text: string }> = ({ pos, text }) => {
  const y = 8;
  return (
    <Billboard position={[pos.x, y, pos.z]}>
      <mesh renderOrder={9999}>
        <planeGeometry args={[14, 3.4]} />
        <meshBasicMaterial color="#0B1020" transparent opacity={0.55} depthTest={false} />
      </mesh>
      <Text
        renderOrder={10000}
        fontSize={1.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#001F5B"
        material-transparent
        material-depthTest={false}
        material-toneMapped={false}
      >
        {text}
      </Text>
    </Billboard>
  );
};

/* ---------------- ROLLER CONVEYOR ---------------- */
function makeBeltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#3d434c';
  for (let x = 0; x < c.width; x += 24) {
    ctx.fillRect(x, 0, 8, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.anisotropy = 8;
  return tex;
}

const RollerConveyor: React.FC<{ center: THREE.Vector3; length?: number; width?: number }> = ({ center, length = 120, width = 20 }) => {
  const beltTex = React.useMemo(() => makeBeltTexture(), []);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  (React as any).useFrame?.((_: any, delta: number) => {
    const map = matRef.current?.map;
    if (map) {
      map.offset.y -= delta * 0.4;
      map.needsUpdate = true;
    }
  });

  const y = 2;
  const legH = 3;

  return (
    <group position={[center.x, 0, center.z]} rotation={[0, 0, 0]}>
      <mesh position={[0, y, 0]} renderOrder={9000}>
        <boxGeometry args={[width, 0.6, length]} />
        <meshStandardMaterial ref={matRef} map={beltTex} color="#2b2f36" roughness={0.85} metalness={0.1} depthTest={false} />
      </mesh>

      <mesh position={[width / 2 + 1, y - 0.3, 0]} renderOrder={9000}>
        <boxGeometry args={[2, 1.2, length]} />
        <meshStandardMaterial color="#1f242b" roughness={0.8} metalness={0.2} depthTest={false} />
      </mesh>
      <mesh position={[-width / 2 - 1, y - 0.3, 0]} renderOrder={9000}>
        <boxGeometry args={[2, 1.2, length]} />
        <meshStandardMaterial color="#1f242b" roughness={0.8} metalness={0.2} depthTest={false} />
      </mesh>

      <Cylinder args={[2, 2, width + 4, 24]} rotation={[0, 0, Math.PI / 2]} position={[0, y, -length / 2 + 4]} renderOrder={9000}>
        <meshStandardMaterial color="#6d727a" roughness={0.5} metalness={0.5} depthTest={false} />
      </Cylinder>
      <Cylinder args={[2, 2, width + 4, 24]} rotation={[0, 0, Math.PI / 2]} position={[0, y, length / 2 - 4]} renderOrder={9000}>
        <meshStandardMaterial color="#6d727a" roughness={0.5} metalness={0.5} depthTest={false} />
      </Cylinder>

      {[-length / 2 + 4, 0, length / 2 - 4].map((z, i) => (
        <React.Fragment key={i}>
          <mesh position={[width / 2 - 2, (legH / 2), z]} renderOrder={9000}>
            <boxGeometry args={[2, legH, 2]} />
            <meshStandardMaterial color="#354157" roughness={0.6} metalness={0.3} depthTest={false} />
          </mesh>
          <mesh position={[-width / 2 + 2, (legH / 2), z]} renderOrder={9000}>
            <boxGeometry args={[2, legH, 2]} />
            <meshStandardMaterial color="#354157" roughness={0.6} metalness={0.3} depthTest={false} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

/* ---------------- Build at station ---------------- */
const BuildAtStation: React.FC<{ build: SavedPalletBuild; basePos: THREE.Vector3 }> = ({ build, basePos }) => {
  const pallet = build.pallet;
  const lift = pallet.height * 0.4;
  return (
    <>
      <group position={[basePos.x, basePos.y + lift, basePos.z]} castShadow receiveShadow>
        <WoodenPallet dims={pallet} />
      </group>
      {build.placedLayers.map((pl) => (
        <PlacedLayerBoxes key={pl.id} pl={pl} basePos={basePos} />
      ))}
    </>
  );
};

/* ---------------- Station base ---------------- */
const StationBase: React.FC<{ pos: THREE.Vector3; highlight?: boolean }> = ({ pos, highlight }) => {
  return (
    <DreiBox args={[60, 0.6, 60]} position={[pos.x, 0.01, pos.z]} castShadow receiveShadow>
      <meshStandardMaterial
        color={highlight ? '#eab308' : '#e5e7eb'}
        roughness={0.85}
        metalness={0.05}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </DreiBox>
  );
};
const Scene: React.FC<{ assignments: Partial<Record<StationKey, SavedPalletBuild>>; onDropToStation: (k: StationKey, buildId: number) => void }> = ({ assignments, onDropToStation }) => {
  return (
    <>
      <ambientLight intensity={0.55} color="#ffffff" />
      <directionalLight position={[15, 25, 10]} intensity={0.35} castShadow />
      <spotLight position={[-20, 40, -20]} angle={0.3} penumbra={0.5} intensity={0.3} castShadow color="#ffdcb6" />
      <ContactShadows position={[0, -1.25, 0]} opacity={0.35} scale={200} blur={2.8} far={25} />
      <Environment preset="warehouse" background={false} environmentIntensity={0.7} />

      <DreiBox args={[300, 1, 300]} position={[0, -0.5, 0]} receiveShadow>
        <meshStandardMaterial color="#f3f4f6" />
      </DreiBox>

      <AnimatedRC12Robot position={[0, 0, 0]} auto />

      {stationOrder.map((k) => (
        <StationBase key={k} pos={stationPositions[k]} highlight={!!assignments[k]} />
      ))}

      {stationOrder.map((k) =>
        assignments[k] ? (
          <BuildAtStation key={`build-${k}-${assignments[k]!.id}`} build={assignments[k]!} basePos={stationPositions[k]} />
        ) : null
      )}

      {stationOrder.map((k) => (
        <StationBillboardLabel
          key={`label-${k}`}
          pos={stationPositions[k]}
          text={assignments[k] ? `${stationLabels[k]} • ${assignments[k]!.name}` : stationLabels[k]}
        />
      ))}

      <RollerConveyor center={new THREE.Vector3(0, 0, 70)} length={120} width={20} />
      {stationOrder.map((k) => (
        !assignments[k] ? (
          <Html key={`drop-${k}`} position={stationPositions[k].toArray()} center style={{ pointerEvents: 'none' }}>
            <div
              style={{
                pointerEvents: 'auto',
                width: 120,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: '2px dashed #FFFFFF',
                background: 'rgba(11,16,32,0.28)',
                color: '#fff',
                textAlign: 'center',
                fontSize: 12,
                padding: 6,
                userSelect: 'none',
              }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const data = e.dataTransfer?.getData('text/plain');
                if (!data) return;
                const parsed = parseInt(data, 10);
                if (!Number.isFinite(parsed)) return;
                onDropToStation(k, parsed);
              }}
              title={`Drop pallet build here to place on ${stationLabels[k]}`}
            >
              {`Drop here to place on ${stationLabels[k]}`}
            </div>
          </Html>
        ) : null
      ))}


      <OrbitControls enableDamping dampingFactor={0.05} autoRotate={false} minDistance={10} maxDistance={220} />
    </>
  );
};

/* ---------------- Page ---------------- */
const RobotPlacement: React.FC = () => {
  const { savedPalletBuilds } = useAppStore();

  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Partial<Record<StationKey, SavedPalletBuild>>>({});
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    msg: '',
    severity: 'success',
  });

  // filters
  const [palletFilter, setPalletFilter] = useState<string | null>(null);
  const [itemFilter, setItemFilter] = useState<string[]>([]);

  const palletOptions = useMemo(() => {
    const set = new Set<string>();
    savedPalletBuilds.forEach(b => { const label = b.pallet?.name ?? String(b.pallet?.id ?? ''); if (label) set.add(label); });
    return Array.from(set).sort();
  }, [savedPalletBuilds]);

  const itemOptions = useMemo(() => {
    const set = new Set<string>();
    savedPalletBuilds.forEach(b => {
      b.placedLayers?.forEach(pl => {
        pl.items?.forEach((it: any) => {
          const label = it?.name ?? it?.boxName ?? '';
          if (label) set.add(label);
        });
      });
    });
    return Array.from(set).sort();
  }, [savedPalletBuilds]);

  const filteredBuilds = useMemo(() => {
    return savedPalletBuilds.filter(b => {
      const palletLabel = b.pallet?.name ?? String(b.pallet?.id ?? '');
      const palletOk = !palletFilter || palletLabel === palletFilter;
      if (!itemFilter.length) return palletOk;
      const buildItemNames = new Set<string>();
      b.placedLayers?.forEach(pl => pl.items?.forEach((it: any) => { const label = it?.name ?? it?.boxName ?? ''; if (label) buildItemNames.add(label); }));
      const itemsOk = itemFilter.every(n => buildItemNames.has(n));
      return palletOk && itemsOk;
    });
  }, [savedPalletBuilds, palletFilter, itemFilter]);

  const selectedBuild = useMemo(
    () => savedPalletBuilds.find((b) => b.id === selectedBuildId) || null,
    [savedPalletBuilds, selectedBuildId]
  );

  const assignTo = (station: StationKey) => {
    if (!selectedBuild) {
      setSnack({ open: true, msg: 'Select a build first.', severity: 'info' });
      return;
    }
    setAssignments((prev) => ({ ...prev, [station]: selectedBuild }));
    setSnack({ open: true, msg: `Assigned "${selectedBuild.name}" to ${stationLabels[station]}`, severity: 'success' });
  };

  const clearStation = (station: StationKey) => {
    setAssignments((prev) => { const n = { ...prev }; delete n[station]; return n; });
  };
  const lockScrollForLarge = useMediaQuery('(min-width:768px)');

  const handleDropToStation = (station: StationKey, buildId: number) => {
    const build = savedPalletBuilds.find(b => b.id === buildId);
    if (!build) {
      setSnack({ open: true, msg: `Could not find build id ${buildId}`, severity: 'error' });
      return;
    }
    setAssignments((prev) => ({ ...prev, [station]: build }));
    setSnack({ open: true, msg: `Dropped "${build.name}" to ${stationLabels[station]}`, severity: 'success' });
  };

  const onListDragStart = (e: React.DragEvent, buildId: number) => {
    e.dataTransfer.setData('text/plain', String(buildId));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Box
      sx={{
        height: '100vh',
        overscrollBehavior: 'none',
        background: brand.pageBg,
        width: '100vw',
        overflowX: 'hidden',
        paddingTop: "2vh"
      }}
    >
      <Container
        maxWidth={false}
        disableGutters
        sx={{ p: 0, m: 0 }}
      >
        <Grid container spacing={2} sx={{ m: 0 }} >
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Card elevation={2}>
              <CardHeader
                title="Pallet Builds"
                subheader="Filter and pick a build — or drag one onto a station"
                action={<Button size="small" onClick={() => { setPalletFilter(null); setItemFilter([]); }}>Clear</Button>}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1.2} sx={{ mb: 1.5 }}>
                  <Autocomplete
                    size="small"
                    options={palletOptions}
                    value={palletFilter}
                    onChange={(_, v) => setPalletFilter(v)}
                    renderInput={(params) => (<TextField {...params} label="Filter by Pallet" placeholder="Select pallet" />)}
                    clearOnEscape
                  />
                  <Autocomplete
                    multiple
                    size="small"
                    options={itemOptions}
                    value={itemFilter}
                    onChange={(_, v) => setItemFilter(v)}
                    renderInput={(params) => (<TextField {...params} label="Filter by Products" placeholder="Select items" />)}
                    limitTags={2}
                    clearOnEscape
                  />
                </Stack>
                {filteredBuilds.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {savedPalletBuilds.length === 0 ? 'No pallet builds yet' : 'No builds match the filters'}
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: '50vh', overflowY: 'auto', pr: 0.5 }}>
                    <List dense>
                      {filteredBuilds.map((b) => (
                        <ListItem
                          key={b.id}
                          disablePadding
                          sx={{ mb: 0.5 }}
                          draggable 
                          onDragStart={(e) => onListDragStart(e, b.id)}
                          onClick={() => setSelectedBuildId(b.id)}
                        >
                          <ListItemButton
                            selected={selectedBuildId === b.id}
                            sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <ListItemIcon><ViewInArIcon color="primary" /></ListItemIcon>
                            <ListItemText primary={b.name} secondary={`${b.totalLayers} layers • ${b.totalWeight} lbs`} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* CENTER: 3D Scene with overlay controls */}
          <Grid size={{ xs: 12, sm: 12, md: 7 }}>
            <Card elevation={2}>
              <CardContent
                sx={{
                  position: 'relative',
                  height: { xs: '41vh', sm: '70vh', md: '70vh', lg: '71vh', xl: '71vh' },
                  p: 0,
                }}
              >

                <Canvas
                  shadows
                  camera={{ position: [120, 90, 120], fov: 50 }}
                  gl={{ antialias: true, alpha: false }}
                  onCreated={({ gl }) => gl.setClearColor('#f7f8fc')}
                >
                  <Scene assignments={assignments} onDropToStation={handleDropToStation} />
                </Canvas>

                <Paper
                  elevation={0}
                  sx={{
                    position: 'absolute', left: 16, bottom: 16, p: 1,
                    bgcolor: alpha('#000', 0.05), borderRadius: 1,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip label="Robot" size="small" />
                    <Chip label="Left / Front / Right Stations" size="small" />
                    <Chip label="Drag a build → drop on a station" size="small" />
                  </Stack>
                </Paper>
                <Paper
                  elevation={0}
                  sx={{
                    position: 'absolute', top: 16, right: 16, p: 1.25, borderRadius: 2,
                    bgcolor: alpha('#0B1020', 0.28), border: '1px solid', borderColor: alpha('#FFFFFF', 0.18),
                    backdropFilter: 'blur(6px) saturate(120%)', WebkitBackdropFilter: 'blur(6px) saturate(120%)',
                    boxShadow: (t) => `0 8px 24px ${alpha(t.palette.common.black, 0.25)}`, color: '#FFFFFF', minWidth: 260,
                  }}
                >
                  <Stack spacing={1}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700, lineHeight: 1.1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                        textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                      }}
                      title={selectedBuild ? selectedBuild.name : 'No build selected'}
                    >
                      {selectedBuild ? selectedBuild.name : 'No build selected'}
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      {['left', 'front', 'right'].map((k) => (
                        <Box key={k} sx={{
                          p: 0.25, borderRadius: 1.5, bgcolor: () => alpha('#001F5B', 0.18),
                          border: '1px solid', borderColor: alpha('#FFFFFF', 0.15)
                        }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => assignTo(k as StationKey)}
                            sx={{
                              bgcolor: 'transparent', color: '#FFFFFF', borderColor: '#001F5B',
                              textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                              '&:hover': { bgcolor: 'transparent', borderColor: '#001F5B', color: '#FFFFFF' },
                              '&:focus-visible': { outline: '2px solid #001F5B', outlineOffset: 2 },
                            }}
                          >
                            {`Place ${k[0].toUpperCase()}${k.slice(1)}`}
                          </Button>
                        </Box>
                      ))}
                    </Stack>

                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Tip: Drag a build from the list and drop it on a station in the 3D view.
                    </Typography>
                  </Stack>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card elevation={2}>
              <CardHeader title="Current Assignments" />
              <CardContent>
                <Stack spacing={1.5}>
                  {stationOrder.map((k) => {
                    const assigned = assignments[k];
                    return (
                      <Paper
                        key={k}
                        variant="outlined"
                        sx={{
                          p: 1.5, borderRadius: 1.5,
                          borderColor: assigned ? alpha('#22c55e', 0.6) : undefined,
                          bgcolor: assigned ? alpha('#22c55e', 0.06) : undefined,
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip label={stationLabels[k]} size="small" />
                          <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {assigned ? `${assigned.name} • ${assigned.totalLayers} layers` : '— Empty —'}
                          </Typography>
                          {assigned && (
                            <IconButton size="small" color="error" onClick={() => clearStation(k)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Snackbar
          open={snack.open}
          autoHideDuration={2200}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default RobotPlacement;
