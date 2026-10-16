import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Box as DreiBox,
  Edges,
  ContactShadows,
  Environment,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Container, Card, CardContent, CardHeader, Typography, List, ListItem, ListItemButton, ListItemText,
  ListItemIcon, Button, Stack, Paper, Chip, alpha, Snackbar, Alert, Box, TextField
} from '@mui/material';
import Grid from "@mui/material/Grid";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SpeedIcon from '@mui/icons-material/Speed';

import { useAppStore, type SavedPalletBuild, type PalletConfig } from '../store/store';
import { brand } from '../ui/brand';



// ----------------------- Helpers & visuals -----------------------
const makeBeltTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#3d434c';
  for (let x = 0; x < c.width; x += 24) ctx.fillRect(x, 0, 8, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1); tex.anisotropy = 8;
  return tex;
};

const WoodenPalletSimple: React.FC<{ dims: PalletConfig; position?: [number, number, number] }> = ({ dims, position = [0, 0, 0] }) => {
  const Mat = <meshStandardMaterial color="#b07a3a" roughness={0.6} metalness={0.05} />;
  const H = dims.height; const TOP = H * 0.25; const BEARER = H * 0.35; const GAP = dims.depth * 0.04;
  const SLAT_COUNT = 7; const SLAT_DEPTH = (dims.depth - GAP * (SLAT_COUNT - 1)) / SLAT_COUNT; const BEARER_WIDTH = dims.width * 0.15;
  const bearerY = -H / 2 + BEARER / 2; const topY = -H / 2 + BEARER + TOP / 2;

  return (
    <group position={position}>
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

const SmallBoxMesh: React.FC<{ w: number; h: number; d: number; pos: THREE.Vector3; color?: string; rotation?: [number, number, number] }> = ({ w, h, d, pos, color = '#d9b38c', rotation = [0, 0, 0] }) => (
  <group position={[pos.x, pos.y, pos.z]} rotation={rotation}>
    <DreiBox args={[w, h, d]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.82} metalness={0.08} />
      <Edges scale={1} color="#7B4019" />
    </DreiBox>
  </group>
);

// ----------------------- Robot Gripper model -----------------------
const Gripper: React.FC<{ closed: boolean }> = ({ closed }) => {
  return (
    <group>
      <mesh position={[0, 0, 0]}> <boxGeometry args={[5, 1.2, 3]} /> <meshStandardMaterial color="#333" /></mesh>
      <group position={[-2.2, -1.2, 0]} rotation={[0, 0, closed ? 0.7 : -0.05]}> 
        <mesh position={[0, 0, 0]}> <boxGeometry args={[0.8, 3.2, 0.8]} /> <meshStandardMaterial color="#222" /> </mesh>
      </group>
      <group position={[2.2, -1.2, 0]} rotation={[0, 0, closed ? -0.7 : 0.05]}> 
        <mesh position={[0, 0, 0]}> <boxGeometry args={[0.8, 3.2, 0.8]} /> <meshStandardMaterial color="#222" /> </mesh>
      </group>
    </group>
  );
};

// ----------------------- SpawnedBox state machine -----------------------
type SpawnState = 'conveyor' | 'toGripper' | 'gripped' | 'toTarget' | 'placed';

type SpawnedBoxInternal = {
  id: string;
  w: number; h: number; d: number;
  pos: THREE.Vector3;
  rotation?: [number, number, number];
  target: THREE.Vector3; // world target
  side: 'left' | 'right';
  state: SpawnState;
  t: number; // normalized progress for current transition
  color?: string;
};

function cubicPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const q = new THREE.Vector3();
  const it = 1 - t;
  q.x = it * it * it * p0.x + 3 * it * it * t * p1.x + 3 * it * t * t * p2.x + t * t * t * p3.x;
  q.y = it * it * it * p0.y + 3 * it * it * t * p1.y + 3 * it * t * t * p2.y + t * t * t * p3.y;
  q.z = it * it * it * p0.z + 3 * it * it * t * p1.z + 3 * it * t * t * p2.z + t * t * t * p3.z;
  return q;
}

const ConveyorSpawner: React.FC<{
  queue: Array<{ w: number; h: number; d: number; final: THREE.Vector3 }>;
  playing: boolean;
  speed: number;
  onSpawnedStateChange?: (items: SpawnedBoxInternal[]) => void;
}> = ({ queue, playing, speed, onSpawnedStateChange }) => {
  const beltTex = useMemo(() => makeBeltTexture(), []);
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const [items, setItems] = useState<SpawnedBoxInternal[]>([]);
  const spawnZ = 160;
  const pickupZ = 20;

  useEffect(() => {
    if (!queue.length) { setItems([]); return; }
    const init = queue.map((q, i) => ({
      id: `s-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      w: q.w, h: q.h, d: q.d,
      pos: new THREE.Vector3(0, q.h / 2 + 2.5, spawnZ + i * 12),
      rotation: [0, 0, 0] as [number, number, number],
      target: q.final.clone(),
      side: (q.final.x < 0 ? 'left' : 'right') as 'left' | 'right',
      state: 'conveyor' as SpawnState,
      t: 0,
      color: undefined,
    }));
    setItems(init);

  }, [queue.length]);

  useFrame((_, delta) => {
    if (!items.length) return;
    setItems(prev => {
      const next = prev.map((it) => {
        if (it.state === 'conveyor') {
          if (playing) it.pos.z -= speed * delta * 40;
          if (it.pos.z <= pickupZ) { it.state = 'toGripper'; it.t = 0; }
        } else if (it.state === 'toGripper') {
          it.t = Math.min(1, it.t + delta * (1.2 * speed));
          const pickupPos = new THREE.Vector3(0, 8.5, 40);
          it.pos.lerpVectors(it.pos, pickupPos, it.t);
          if (it.t >= 0.98) { it.state = 'gripped'; it.t = 0; }
        } else if (it.state === 'gripped') {
          it.t = Math.min(1, it.t + delta * (0.9 / Math.max(0.3, speed)));
          if (it.t >= 0.95) { it.state = 'toTarget'; it.t = 0; }
        } else if (it.state === 'toTarget') {
          it.t = Math.min(1, it.t + delta * (0.7 * speed));
          const p0 = new THREE.Vector3(0, 8.5, 40);
          const ctrl1 = new THREE.Vector3((it.target.x) * 0.25, 18 + it.target.y, 20);
          const ctrl2 = new THREE.Vector3((it.target.x) * 0.6, 12 + it.target.y, it.target.z + 30);
          const pos = cubicPoint(p0, ctrl1, ctrl2, it.target, it.t);
          it.pos.copy(pos);
          if (it.t >= 0.999) { it.state = 'placed'; it.t = 1; it.pos.copy(it.target); }
        }
        return it;
      });
      onSpawnedStateChange?.(next);
      return next;
    });
    if (matRef.current?.map) {
      (matRef.current.map as THREE.Texture).offset.y -= 0.01 * speed; // lightweight drift
      (matRef.current.map as THREE.Texture).needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh position={[0, 2.2, 0]}> <boxGeometry args={[80, 0.6, 360]} /> <meshStandardMaterial ref={matRef} map={beltTex} color="#2b2f36" roughness={0.8} metalness={0.1} /> </mesh>
      {items.map(it => <SmallBoxMesh key={it.id} w={it.w} h={it.h} d={it.d} pos={it.pos} color={it.color ?? '#d9b38c'} />)}
    </group>
  );
};

// ----------------------- Main Animation Scene combining everything -----------------------
const AnimationScene2: React.FC<{ build: SavedPalletBuild | null; playing: boolean; speed: number; }> = ({ build, playing, speed }) => {
  const spawnList = useMemo(() => {
    if (!build) return [] as Array<{ w: number; h: number; d: number; final: THREE.Vector3 }>;
    const palletBase = new THREE.Vector3(0, 0, -36);
    const arr: Array<{ w: number; h: number; d: number; final: THREE.Vector3 }> = [];
    build.placedLayers?.forEach((pl) => {
      pl.items?.forEach((it: any) => {
        const fx = (it.position?.[0] ?? 0) + palletBase.x;
        const fy = (it.position?.[1] ?? 0) + (pl.yOffset ?? 0) + palletBase.y + (it.height ?? 0) / 2;
        const fz = (it.position?.[2] ?? 0) + palletBase.z;
        arr.push({ w: it.width ?? 10, h: it.height ?? 8, d: it.depth ?? 12, final: new THREE.Vector3(fx, fy, fz) });
      });
    });
    return arr;
  }, [build]);

  const [spawnedState, setSpawnedState] = useState<SpawnedBoxInternal[]>([]);

  const safeDefaultPallet = useMemo<PalletConfig>(() => ({ id: '-1', name: 'Default', width: 48, height: 6, depth: 40 }), []);
  const leftPallet = build?.pallet ?? safeDefaultPallet;
  const rightPallet = build?.pallet ?? safeDefaultPallet;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[15, 25, 10]} intensity={0.5} />
      <spotLight position={[-20, 40, -20]} angle={0.3} penumbra={0.5} intensity={0.25} color="#ffdcb6" />
      <ContactShadows position={[0, -1.25, 0]} opacity={0.35} scale={200} blur={2.8} far={25} />
      <Environment preset="warehouse" background={false} environmentIntensity={0.7} />

      <DreiBox args={[300, 1, 300]} position={[0, -0.5, 0]} receiveShadow>
        <meshStandardMaterial color="#f7f8fc" />
      </DreiBox>

      <ConveyorSpawner queue={spawnList} playing={playing} speed={Math.max(0.3, speed)} onSpawnedStateChange={setSpawnedState} />

      <group position={[-80, 0, -36]}> <WoodenPalletSimple dims={leftPallet} position={[0, 0, 0]} />
        <Html position={[0, 12, 0]} center><div style={{ color: '#001', background: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 6, fontSize: 12 }}>Left Pallet</div></Html>
      </group>

      <group position={[80, 0, -36]}> <WoodenPalletSimple dims={rightPallet} position={[0, 0, 0]} />
        <Html position={[0, 12, 0]} center><div style={{ color: '#001', background: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 6, fontSize: 12 }}>Right Pallet</div></Html>
      </group>

      <group position={[0, 12, 40]}> <mesh position={[0, -6, 0]}> <boxGeometry args={[6, 16, 6]} /> <meshStandardMaterial color="#222" /></mesh>
        <GripperController spawned={spawnedState} />
      </group>

      {spawnedState.filter(s => s.state === 'placed').map(s => (
        <SmallBoxMesh key={`placed-${s.id}`} w={s.w} h={s.h} d={s.d} pos={s.pos} color={s.color ?? '#d9b38c'} />
      ))}

      <OrbitControls enableDamping dampingFactor={0.05} minDistance={20} maxDistance={300} />
    </>
  );
};

const GripperController: React.FC<{ spawned: SpawnedBoxInternal[] }> = ({ spawned }) => {
  const active = spawned.find(s => s.state === 'toGripper' || s.state === 'gripped' || s.state === 'toTarget');
  const gripperRef = useRef<THREE.Group>(null!);
  const [closed, setClosed] = useState(false);

  useFrame(() => {
    if (!gripperRef.current) return;
    if (active) {
      const targetPos = new THREE.Vector3(active.pos.x, active.pos.y + 0.6, active.pos.z - 2);
      gripperRef.current.position.lerp(targetPos, 0.2);
      setClosed(active.state === 'gripped' || active.state === 'toTarget');
    } else {
      gripperRef.current.position.lerp(new THREE.Vector3(0, 8.2, 40), 0.08);
      setClosed(false);
    }
  });

  return (
    <group ref={gripperRef}>
      <mesh position={[0, 0, 0]}> <boxGeometry args={[2, 6, 2]} /> <meshStandardMaterial color="#444" /></mesh>
      <group position={[0, -3.6, 0]}> <Gripper closed={closed} /> </group>
    </group>
  );
};

const BoxPlacementByRobo: React.FC = () => {
  const { savedPalletBuilds } = useAppStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedBuild = useMemo(() => savedPalletBuilds.find(b => b.id === selectedId) ?? null, [savedPalletBuilds, selectedId]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({ open: false, msg: '', severity: 'info' });
  const [runCount, setRunCount] = useState(0);

  useEffect(() => { if (!selectedBuild) setPlaying(false); }, [selectedBuild]);

  return (
    <Box sx={{ minHeight: '100%', background: brand.pageBg, width: '100%', overflowX: 'hidden', py: 2 }}>
      <Container maxWidth={false} disableGutters sx={{ p: 0, m: 0 }}>
        <Grid container spacing={2} sx={{ m: 0 }}>
         <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Card elevation={2}><CardHeader title="Pallet Builds" subheader="Select one to animate robot placement" />
              <CardContent>
                <List dense>
                  {savedPalletBuilds.map(b => (
                    <ListItem key={b.id} disablePadding>
                      <ListItemButton selected={selectedId === b.id} onClick={() => { setSelectedId(b.id); setRunCount(c => c + 1); }}>
                        <ListItemIcon><Chip label={b.pallet?.name ?? 'Pallet'} size="small" /></ListItemIcon>
                        <ListItemText primary={b.name} secondary={`${b.placedLayers?.length ?? 0} layers • ${b.placedLayers?.reduce((a, pl) => a + (pl.items?.length ?? 0), 0)} boxes`} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => { if (!selectedBuild) { setSnack({ open: true, msg: 'Select a build first', severity: 'info' }); return; } setPlaying(true); }}>Play</Button>
                  <Button size="small" onClick={() => { setSelectedId(null); setPlaying(false); }}>Clear</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 12, md: 6 }}>
            <Card elevation={2}><CardContent sx={{ position: 'relative', height: { xs: '48vh', sm: '74vh' }, p: 0 }}>
              <Canvas shadows camera={{ position: [120, 90, 120], fov: 50 }} onCreated={({ gl }) => gl.setClearColor('#f7f8fc')}>
                <React.Fragment key={`run-${runCount}`}>
                  <AnimationScene2 build={selectedBuild} playing={playing} speed={speed} />
                </React.Fragment>
              </Canvas>

              <Paper elevation={0} sx={{ position: 'absolute', top: 12, right: 12, p: 1.25, borderRadius: 2, bgcolor: alpha('#0B1020', 0.28), border: '1px solid', borderColor: alpha('#FFFFFF', 0.18), color: '#FFF', minWidth: 260 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{selectedBuild ? selectedBuild.name : 'No build selected'}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={() => { if (!selectedBuild) { setSnack({ open: true, msg: 'Select a build to animate', severity: 'info' }); return; } setPlaying(p => !p); }} startIcon={playing ? <PauseIcon /> : <PlayArrowIcon />}>{playing ? 'Pause' : 'Play'}</Button>
                    <Button size="small" variant="outlined" onClick={() => { setRunCount(c => c + 1); setPlaying(false); }} startIcon={<RestartAltIcon />}>Reset</Button>
                    <Button size="small" variant="outlined" onClick={() => setSpeed(s => Math.min(3, s + 0.5))} startIcon={<SpeedIcon />}>{`Speed ${speed.toFixed(1)}x`}</Button>
                  </Stack>
                  <Typography variant="caption">Tip: Play to see gripper pick the boxes and place them onto left/right pallets.</Typography>
                </Stack>
              </Paper>
            </CardContent></Card>
          </Grid>

   <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card elevation={2}><CardHeader title="Status" /></Card>
            <CardContent>
              <Typography variant="body2">Selection: {selectedBuild?.name ?? '—'}</Typography>
              <Box sx={{ mt: 1 }}>
                <TextField label="Speed" type="number" size="small" value={speed} inputProps={{ step: 0.1, min: 0.3, max: 3 }} onChange={(e) => setSpeed(Math.max(0.3, Math.min(3, Number(e.target.value) || 1)))} />
              </Box>
            </CardContent>
          </Grid>
        </Grid>

        <Snackbar open={snack.open} autoHideDuration={2200} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
          <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default BoxPlacementByRobo;
