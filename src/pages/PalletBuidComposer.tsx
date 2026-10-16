import React, { useMemo, useState, useCallback } from 'react';
import {
  useAppStore,
  type SavedLayout,
  type Layer,
  type LayoutItem,
  type PlacedLayer,
  type SavedPalletBuild,
  type PalletConfig
} from '../store/store';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box as DreiBox, Edges, Text, ContactShadows, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import {
  IconButton, Typography, Container, Card, CardContent, Paper,
  Stack, Button, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Chip, Divider,
  alpha, Snackbar, Alert, TextField, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, useMediaQuery, InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import SearchIcon from '@mui/icons-material/Search';
import { brand } from '../ui/brand';
import AddIcon from '@mui/icons-material/Add';

/* ---------- THEME (UI only) ---------- */
const COLORS = {
  deepBlue: '#1e3a8a',
  slateDark: '#334155',
  slateMid: '#475569',
  slate: '#64748b',
  cardBg: '#f8fafc',
  pageBg: '#eef2f7',
};
const gradient = (a: string, b: string) => `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
const softGradient = gradient(COLORS.slate, COLORS.deepBlue);

const VIEW_H = { xs: '62vh', sm: '62vh', md: '60vh', lg: '58vh', xl: '56vh' };

type RotDeg = { rotationXDeg: number; rotationYDeg: number; rotationZDeg: number; };
const toDeg = (r: number) => THREE.MathUtils.radToDeg(r);
const toRad = (d: number) => THREE.MathUtils.degToRad(d);
const norm = (d: number) => ((d % 360) + 360) % 360;

/* ---------- LABEL TYPES + HELPERS ---------- */
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
  faceWidth: number,
  faceHeight: number
) {
  const map = {
    'barcode-small': { wFactor: 0.5, hFactor: 0.20 },
    'barcode-medium': { wFactor: 0.7, hFactor: 0.28 },
    'barcode-large': { wFactor: 0.9, hFactor: 0.36 },
  } as const;

  const { wFactor, hFactor } = map[tpl ?? 'barcode-small'];
  const width = faceWidth * wFactor;
  const height = Math.min(faceHeight * 0.9, faceHeight * hFactor);
  return { width, height };
}

function faceTransform(side: BoxSide, box: { width: number; height: number; depth: number }) {
  switch (side) {
    case 'front': // +Z
      return { pos: new THREE.Vector3(0, 0, box.depth / 2 + LABEL_EPS), rot: new THREE.Euler(0, 0, 0) };
    case 'back': // -Z
      return { pos: new THREE.Vector3(0, 0, -box.depth / 2 - LABEL_EPS), rot: new THREE.Euler(0, Math.PI, 0) };
    case 'right': // +X
      return { pos: new THREE.Vector3(box.width / 2 + LABEL_EPS, 0, 0), rot: new THREE.Euler(0, -Math.PI / 2, 0) };
    case 'left':  // -X
      return { pos: new THREE.Vector3(-box.width / 2 - LABEL_EPS, 0, 0), rot: new THREE.Euler(0, Math.PI / 2, 0) };
    case 'top':   // +Y
      // Default plane faces +Z; rotate -90° around X so its normal becomes +Y
      return { pos: new THREE.Vector3(0, box.height / 2 + LABEL_EPS, 0), rot: new THREE.Euler(-Math.PI / 2, 0, 0) };
    case 'bottom': // -Y
      // Rotate +90° around X so its normal becomes -Y (material is DoubleSide anyway)
      return { pos: new THREE.Vector3(0, -box.height / 2 - LABEL_EPS, 0), rot: new THREE.Euler(Math.PI / 2, 0, 0) };
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

        // Determine the face dimensions this label sits on
        const faceWidth =
          side === 'left' || side === 'right' ? box.depth
            : side === 'front' || side === 'back' ? box.width
              : /* top/bottom */                        box.width;

        const faceHeight =
          side === 'left' || side === 'right' ? box.height
            : side === 'front' || side === 'back' ? box.height
              : /* top/bottom */                        box.depth;

        const { width: lw, height: lh } = sizeFromTemplate(box.labelTemplate, faceWidth, faceHeight);

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

/* ---------- ROT/HEIGHT HELPERS ---------- */

const toRotDegFromItem = (it: LayoutItem & Partial<RotDeg>): RotDeg => {
  if (typeof it.rotationXDeg === 'number') {
    return {
      rotationXDeg: norm(it.rotationXDeg || 0),
      rotationYDeg: norm(it.rotationYDeg || 0),
      rotationZDeg: norm(it.rotationZDeg || 0),
    };
  }
  const [rx, ry, rz] = it.rotation || [0, 0, 0];
  return {
    rotationXDeg: norm(toDeg(rx)),
    rotationYDeg: norm(toDeg(ry)),
    rotationZDeg: norm(toDeg(rz)),
  };
};

/* Given w,h,d and rotation (deg), compute vertical half-height (halfY) */
const halfYForItem = (it: LayoutItem & Partial<RotDeg>) => {
  const rot = toRotDegFromItem(it);
  const rx = toRad(rot.rotationXDeg), ry = toRad(rot.rotationYDeg), rz = toRad(rot.rotationZDeg);
  const m4 = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  const ux = new THREE.Vector3().setFromMatrixColumn(m4, 0);
  const uy = new THREE.Vector3().setFromMatrixColumn(m4, 1);
  const uz = new THREE.Vector3().setFromMatrixColumn(m4, 2);
  const ex = it.width / 2, ey = it.height / 2, ez = it.depth / 2;
  const halfY = Math.abs(ux.y) * ex + Math.abs(uy.y) * ey + Math.abs(uz.y) * ez;
  return halfY;
};

/* Compute layer thickness (max vertical height across items) and weight */
const computeLayerStats = (layer: Layer) => {
  const thickness = layer.items.length
    ? Math.max(...layer.items.map(it => halfYForItem(it) * 2))
    : 0;
  const weight = layer.items.reduce((s, it) => s + (it.weight ?? 0), 0);
  return { thickness, weight };
};

/* ---------- 3D PIECES ---------- */

const PlacedLayerBoxes: React.FC<{ pl: PlacedLayer }> = ({ pl }) => {
  return (
    <>
      {pl.items.map((it: any) => { 
        const halfY = halfYForItem(it);
        const [rx, ry, rz] = it.rotation || [0, 0, 0];
        const posY = pl.yOffset + halfY;
        const pos: [number, number, number] = [it.position[0], posY, it.position[2]];

        return (
          <group key={it.id}>
            <DreiBox args={[it.width, it.height, it.depth]} position={pos} rotation={[rx, ry, rz]} castShadow receiveShadow>
              <meshStandardMaterial color="#c78d4b" roughness={0.85} metalness={0.05} />
              <Edges scale={1} color="#7B4019" />
              <BoxLabels
                box={{
                  width: it.width,
                  height: it.height,
                  depth: it.depth,
                  labelTemplate: it.labelTemplate as LabelTemplate | undefined,
                  labelSides: it.labelSides as BoxSide[] | undefined
                }}
              />
            </DreiBox>

            {/* Layer name above each item */}
            <Text
              position={[pos[0], posY + halfY + 0.05, pos[2]]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.8}
              color="#394150"
              anchorX="center"
              anchorY="middle"
            >
              {pl.name}
            </Text>
          </group>
        );
      })}
    </>
  );
};

/* Slatted Wooden Pallet (visual only) */
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

/* Pallet Scene for stacking view */
const Scene: React.FC<{ pallet: PalletConfig; placed: PlacedLayer[]; }> = ({ pallet, placed }) => {
  return (
    <>
      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight position={[15, 25, 10]} intensity={0.2} castShadow />
      <spotLight position={[-20, 40, -20]} angle={0.3} penumbra={0.5} intensity={0.2} castShadow color="#ffdcb6" />
      <ContactShadows position={[0, -pallet.height / 2, 0]} opacity={0.35} scale={100} blur={2.5} far={10} />
      <Environment preset="apartment" background={false} />
      <group position={[0, 0, 0]}>
        <WoodenPallet dims={pallet} />
        <Text
          position={[0, pallet.height / 2 + 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.1}
          color="#7a4a12"
          anchorX="center"
          anchorY="middle"
        >
          {pallet.name}
        </Text>
      </group>

      {placed.map(pl => <PlacedLayerBoxes key={pl.id} pl={pl} />)}
      <OrbitControls enableDamping dampingFactor={0.05} autoRotate={false} minDistance={5} maxDistance={120} />
    </>
  );
};

/* ---------- list helpers ---------- */

const summarizeBuildItems = (placedLayers: PlacedLayer[]) => {
  const map = new Map<string, { name: string; count: number; weight?: number; w?: number; d?: number; h?: number }>();
  for (const pl of placedLayers) {
    for (const it of pl.items as (LayoutItem & { name?: string; weight?: number })[]) {
      const key = it.name ?? 'Item';
      const cur = map.get(key) ?? { name: key, count: 0, weight: it.weight, w: it.width, d: it.depth, h: it.height };
      cur.count += 1;
      if (cur.weight == null && it.weight != null) cur.weight = it.weight;
      map.set(key, cur);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

type MatchingLayer = {
  layoutId: number;
  layoutName: string;
  palletName?: string;
  layerId: number;
  layerName: string;
  itemCount: number;
  layerWeight: number;
  layerHeight: number;
};

const findMatchingLayers = (savedLayouts: SavedLayout[], palletName?: string, itemName?: string): MatchingLayer[] => {
  const out: MatchingLayer[] = [];
  for (const sl of savedLayouts) {
    if (palletName && sl.pallet?.name !== palletName) continue;

    for (const ly of sl.layers) {
      let count = 0;
      for (const it of ly.items as any[]) {
        if (!itemName || it?.name === itemName) count += 1;
      }
      if (count > 0) {
        const { thickness, weight } = computeLayerStats(ly);
        out.push({
          layoutId: sl.id,
          layoutName: sl.name,
          palletName: sl.pallet?.name,
          layerId: ly.id,
          layerName: ly.name,
          itemCount: count,
          layerWeight: weight,
          layerHeight: thickness,
        });
      }
    }
  }
  return out.sort((a, b) => b.itemCount - a.itemCount || a.layerWeight - b.layerWeight);
};

/* ---------------- Component ----------------- */
const PalletBuildComposer: React.FC = () => {
  const {
    activeLayout,
    savedLayouts,
    savedPalletBuilds,
    palletConfigs = [],
    boxConfigs = [],
  } = useAppStore();

  // Media query for scroll locking ≥768px
  const lockScrollForLarge = useMediaQuery('(min-width:768px)');

  const initialPallet = (activeLayout?.pallet as PalletConfig) || (palletConfigs[0] as PalletConfig | undefined);
  const [currentPallet, setCurrentPallet] = useState<PalletConfig | null>(initialPallet ?? null);

  const EMPTY_PALLET: PalletConfig = useMemo(() => ({ id: 'empty', name: 'No pallet configured', width: 40, depth: 48, height: 6, maxWeight: undefined }), []);
  const palletForRender = currentPallet ?? EMPTY_PALLET;

  // Max stack height
  const [maxStackHeight, setMaxStackHeight] = useState<number>(48);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>(
    { open: false, message: '', severity: 'success' }
  );

  // Build state
  const [placed, setPlaced] = useState<PlacedLayer[]>([]);
  const [editingBuildId, setEditingBuildId] = useState<number | null>(null);
  const [buildName, setBuildName] = useState<string>('New Pallet Build');

  const [selectedSourceLayout, setSelectedSourceLayout] = useState<SavedLayout | null>(null);
  const [buildsModalOpen, setBuildsModalOpen] = useState(false);
  const [buildsSearch, setBuildsSearch] = useState('');
  const [modalFilterPalletName, setModalFilterPalletName] = useState<string>('');
  const [modalFilterItemName, setModalFilterItemName] = useState<string>('');

  const totalWeight = placed.reduce((s, pl) => s + pl.weight, 0);
  const totalLayers = placed.length;
  const withinWeight = palletForRender.maxWeight == null ? true : totalWeight <= (palletForRender.maxWeight as number);

  const currentStackHeight = placed.reduce((s, pl) => s + pl.thickness, 0);

  // Next Y offset starts at pallet top
  const nextYOffset = placed.reduce((s, pl) => s + pl.thickness, palletForRender.height / 2);

  // const violatesHeight = (additional: number) =>
  //   maxStackHeight > 0 && currentStackHeight + additional > maxStackHeight + 1e-6;

  const onDropLayer = (layer: Layer, srcLayoutId: number) => {
    const { thickness, weight } = computeLayerStats(layer);

    // if (violatesHeight(thickness)) {
    //   setSnackbar({ open: true, message: `Max stack height ${maxStackHeight}\" reached. Cannot add \"${layer.name}\".`, severity: 'error' });
    //   return;
    // }

    const projectedTotal = totalWeight + weight;
    if (palletForRender.maxWeight != null && projectedTotal > (palletForRender.maxWeight as number)) {
      setSnackbar({ open: true, message: `Exceeds pallet max weight (${palletForRender.maxWeight} lbs).`, severity: 'error' });
      return;
    }

    const newPlaced: PlacedLayer = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sourceLayoutId: srcLayoutId,
      sourceLayerId: layer.id,
      name: layer.name,
      items: layer.items.map(it => ({ ...it })),
      thickness,
      weight,
      yOffset: nextYOffset,
    };

    setPlaced(prev => [...prev, newPlaced]);
  };

  const rotatePlacedLayer = (id: string, deltaDeg: number) => {
    const deltaRad = THREE.MathUtils.degToRad(deltaDeg);
    setPlaced(prev =>
      prev.map(pl => {
        if (pl.id !== id) return pl;
        const rotatedItems = pl.items.map((it: any) => {
          const r = it.rotation || [0, 0, 0];
          const rx = r[0] || 0;
          const ry = (r[1] || 0) + deltaRad;
          const rz = r[2] || 0;
          return { ...it, rotation: [rx, ry, rz] };
        });
        return { ...pl, items: rotatedItems };
      })
    );
  };

  const removePlacedLayer = (id: string) => {
    setPlaced(prev => prev.filter(p => p.id !== id));
  };

  const onDragStartLayer = (ly: Layer, layoutId: number, e: React.DragEvent) => {
    const payload = JSON.stringify({ layoutId, layerId: ly.id });
    e.dataTransfer.setData('application/x-layer', payload);
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/x-layer');
    if (!data) return;
    try {
      const { layoutId, layerId } = JSON.parse(data);
      const layout = savedLayouts.find(l => l.id === layoutId);
      const layer = layout?.layers.find(l => l.id === layerId);
    
      if (layer && layout) onDropLayer(layer, layout.id);
    } catch { }
  };


  const duplicateLast = () => {
    const last = placed[placed.length - 1];
    if (!last) { setSnackbar({ open: true, message: 'No layer to duplicate.', severity: 'info' }); return; }

    // if (violatesHeight(last.thickness)) {
    //   setSnackbar({ open: true, message: `Max stack height ${maxStackHeight}\" reached. Cannot duplicate \"${last.name}\".`, severity: 'error' });
    //   return;
    // }

    const layout = savedLayouts.find(l => l.id === last.sourceLayoutId);
    const layer = layout?.layers.find(l => l.id === last.sourceLayerId);
    if (layer && layout) onDropLayer(layer, layout.id);
  };

  const clearStack = () => setPlaced([]);

  const saveBuild = () => {
    if (placed.length === 0) { setSnackbar({ open: true, message: 'Place at least one layer.', severity: 'error' }); return; }
    const build: SavedPalletBuild & { maxStackHeight?: number } = {
      id: editingBuildId ?? Date.now(),
      name: buildName || `Pallet Build ${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      pallet: { ...(currentPallet ?? palletForRender) },
      placedLayers: placed.map(p => ({ ...p, items: p.items.map(i => ({ ...i })) })),
      totalLayers,
      totalWeight,
      maxStackHeight,
    };

    if (editingBuildId) {
      useAppStore.getState().updatePalletBuild?.(build);
      setSnackbar({ open: true, message: 'Build updated.', severity: 'success' });
    } else {
      useAppStore.getState().addPalletBuild?.(build);
      setSnackbar({ open: true, message: 'Build saved.', severity: 'success' });
      setBuildName('New Pallet Build');
    }
    setEditingBuildId(null);
  };

  const weightPct = palletForRender.maxWeight ? Math.min((totalWeight / (palletForRender.maxWeight as number)) * 100, 100) : 0;
  const removePalletBuild = useAppStore(s => s.removePalletBuild);

  const palletOptions = useMemo(
    () => palletConfigs.map(p => p.name).sort((a, b) => a.localeCompare(b)),
    [palletConfigs]
  );
  const itemOptions = useMemo(
    () => boxConfigs.map(b => b.name).sort((a, b) => a.localeCompare(b)),
    [boxConfigs]
  );

  const [filterPalletName, setFilterPalletName] = useState<string>('');
  const [filterItemName, setFilterItemName] = useState<string>('');
  const matchingLayers = useMemo(
    () => findMatchingLayers(savedLayouts, filterPalletName || undefined, filterItemName || undefined),
    [savedLayouts, filterPalletName, filterItemName]
  );

  const matchKey = (layoutId: number, layerId: number) => `${layoutId}:${layerId}`;
  const matchingSet = useMemo(
    () => new Set(matchingLayers.map(m => matchKey(m.layoutId, m.layerId))),
    [matchingLayers]
  );

  const loadBuild = useCallback(
    (b: SavedPalletBuild & { maxStackHeight?: number }) => {
      if (b.pallet) {
        const match =
          palletConfigs.find(p => String(p.id) === String(b.pallet.id)) ??
          (b.pallet as PalletConfig);
        setCurrentPallet(match);
      }

      if (typeof b.maxStackHeight === 'number') {
        setMaxStackHeight(b.maxStackHeight);
      }

      setPlaced(
        b.placedLayers.map(pl => ({
          ...pl,
          items: pl.items.map(i => ({ ...i })),
        }))
      );

      setBuildName(b.name);
      setEditingBuildId(Number(b.id));

      setSnackbar({ open: true, message: `Editing ${b.name}`, severity: 'success' });
      setBuildsModalOpen(false);
    },
    [palletConfigs]
  );

  const filteredBuilds = useMemo(() => {
    const q = buildsSearch.trim().toLowerCase();
    return savedPalletBuilds.filter((b: any) => {
      const matchesName = !q || b.name?.toLowerCase().includes(q) || String(b.id).includes(q);
      const matchesPallet = !modalFilterPalletName || b.pallet?.name === modalFilterPalletName;
      const matchesItem = !modalFilterItemName
        ? true
        : (summarizeBuildItems(b.placedLayers).some(it => it.name === modalFilterItemName));
      return matchesName && matchesPallet && matchesItem;
    });
  }, [savedPalletBuilds, buildsSearch, modalFilterPalletName, modalFilterItemName]);

  return (
    <Box
      sx={{
        minHeight: '100%',
        background: brand.pageBg,
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          py: 1.25,
          background: gradient(COLORS.pageBg, '#ffffff'),
          width: '100%',
          overflowX: 'hidden',
        }}
      >
        {palletConfigs.length === 0 && (
          <Alert sx={{ mb: 1 }} severity="warning">No pallets configured. Add a pallet in Config to enable .</Alert>
        )}

        <Grid container spacing={1.5} sx={{ mb: 1.25 }}>
          <Grid size={{ xs: 12 }}>
            <Card
              elevation={1}
              sx={{ background: '#fff', border: `1px solid ${alpha(COLORS.slate, 0.12)}`, borderRadius: 2 }}
            >
              <CardContent sx={{ py: 0.75, px: 1 }}>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.slateDark, flex: 1 }}>
                    Pallet, Height & Filters
                  </Typography>
                  <FilterAltIcon sx={{ color: COLORS.deepBlue }} />
                  <Chip size="small" label={`${matchingLayers.length} matches`} />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {/* Current Pallet (3D) */}
                  <TextField
                    select
                    size="small"
                    label="Current Pallet (3D)"
                    value={currentPallet ? String(currentPallet.id) : ''}
                    onChange={(e) => {
                      const pal = palletConfigs.find(p => String(p.id) === String(e.target.value));
                      if (pal) { setCurrentPallet(pal); setPlaced([]); } else { setCurrentPallet(null); setPlaced([]); }
                    }}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 200, flex: '1 1 220px' }}
                  >
                    <option value="">(No pallet selected)</option>
                    {palletConfigs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </TextField>


                  {/* Max Stack Height */}
                  <TextField
                    size="small"
                    label='Max Stack Height (")'
                    type="number"
                    value={maxStackHeight}
                    onChange={(e) => setMaxStackHeight(Math.max(0, Number(e.target.value)))}
                    helperText={`Current: ${currentStackHeight.toFixed(2)}"`}
                    sx={{ minWidth: 180, flex: '0 1 200px' }}
                  />

                  {/* Filter: Pallet (layouts) */}
                  <TextField
                    select size="small" label="Filter: Pallet (Layouts)"
                    value={filterPalletName}
                    onChange={(e) => setFilterPalletName(e.target.value)}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true, sx: { bgcolor: 'white', px: 0.5, mx: -0.5 } }}
                    sx={{ minWidth: 200, flex: '1 1 220px' }}
                  >
                    <option value="">All pallets</option>
                    {palletOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </TextField>

                  {/* Filter: Item */}
                  <TextField
                    select size="small" label="Filter: Product"
                    value={filterItemName}
                    onChange={(e) => setFilterItemName(e.target.value)}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true, sx: { bgcolor: 'white', px: 0.5, mx: -0.5 } }}
                    sx={{ minWidth: 200, flex: '1 1 220px' }}
                  >
                    <option value="">All products</option>
                    {itemOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </TextField>

                  {/* Filters Active badge */}
                  {(filterPalletName || filterItemName) && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label="Filtered"
                      sx={{ borderColor: alpha(COLORS.deepBlue, 0.4), color: COLORS.deepBlue, alignSelf: 'center' }}
                    />
                  )}

                </Stack>
                <Divider sx={{ my: 1 }} />
                <Paper
                  elevation={0}
                  sx={{
                    p: 0.75,
                    bgcolor: alpha('#000', 0.04),
                    borderRadius: 2,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    {/* Total Weight */}
                    <Typography variant="caption" sx={{ color: COLORS.slateMid }}>
                      Total Weight
                    </Typography>

                    <Stack sx={{ flex: 1, minWidth: 160 }}>
                      <div
                        style={{
                          width: '100%',
                          height: 8,
                          background: '#e5e7eb',
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            width: `${weightPct}%`,
                            height: '100%',
                            borderRadius: 4,
                            background: withinWeight ? '#10b981' : '#ef4444',
                            transition: 'width .2s ease',
                          }}
                        />
                      </div>
                    </Stack>

                    <Typography variant="caption" sx={{ color: COLORS.slateDark, minWidth: 140, textAlign: 'right' }}>
                      {totalWeight.toFixed(1)} / {(palletForRender.maxWeight ?? '∞')} lbs
                    </Typography>

                    <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }} />

                    {/* Stack Height */}
                    {/* <Typography variant="caption" sx={{ color: COLORS.slateMid }}>
                      Stack Height
                    </Typography>

                    <Stack sx={{ flex: 1, minWidth: 160 }}>
                      <div
                        style={{
                          width: '100%',
                          height: 8,
                          background: '#e5e7eb',
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            width: `${maxStackHeight > 0
                              ? Math.min((currentStackHeight / maxStackHeight) * 100, 100)
                              : 0
                              }%`,
                            height: '100%',
                            borderRadius: 4,
                            background: currentStackHeight <= maxStackHeight ? '#3b82f6' : '#ef4444',
                            transition: 'width .2s ease',
                          }}
                        />
                      </div>
                    </Stack> */}

                    {/* <Typography variant="caption" sx={{ color: COLORS.slateDark, minWidth: 140, textAlign: 'right' }}>
                      {currentStackHeight.toFixed(2)} / {maxStackHeight}"
                    </Typography> */}
                  </Stack>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 3, md: 2 }}>
            <Card
              elevation={2}
              sx={{
                background: COLORS.cardBg,
                border: `1px solid ${alpha(COLORS.slate, 0.15)}`,
                borderRadius: 2,
                height: VIEW_H,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.slateDark, flex: 1 }}>
                  Saved Layers
                </Typography>
                {(filterPalletName || filterItemName) && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label="Filtered"
                    sx={{ borderColor: alpha(COLORS.deepBlue, 0.4), color: COLORS.deepBlue }}
                  />
                )}
              </CardContent>

              <Box sx={{ px: 1.5, pb: 1.5, flex: 1, overflowY: 'auto' }}>
                {savedLayouts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No saved layers yet</Typography>
                ) : (
                  <List dense sx={{ pt: 0 }}>
                    {savedLayouts.map((sl) => {
                      const visibleLayers = !(filterPalletName || filterItemName)
                        ? sl.layers
                        : sl.layers.filter(ly => matchingSet.has(`${sl.id}:${ly.id}`));

                      if ((filterPalletName || filterItemName) && visibleLayers.length === 0) return null;

                      const visItems = visibleLayers.reduce((s, ly) => s + ly.items.length, 0);
                      const visWeight = visibleLayers.reduce((s, ly) => s + computeLayerStats(ly).weight, 0);

                      return (
                        <React.Fragment key={sl.id}>
                          <ListItem disableGutters sx={{ mb: 0.5 }}>
                            <ListItemButton
                              onClick={() => setSelectedSourceLayout(sl)}
                              sx={{ borderRadius: 1.5, py: 0.5, '&:hover': { bgcolor: alpha(COLORS.slate, 0.08) } }}
                            >
                              <ListItemText
                                primaryTypographyProps={{ variant: 'subtitle2', sx: { fontWeight: 700, color: COLORS.slateDark } }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                                primary={sl.name}
                                secondary={
                                  (filterPalletName || filterItemName)
                                    ? `${visItems} products • ${visWeight} lbs`
                                    : `${sl.totalItems} products • ${sl.totalWeight} lbs`
                                }
                              />
                              {sl.pallet?.name && (<Chip size="small" variant="outlined" label={sl.pallet.name} sx={{ ml: 1 }} />)}
                            </ListItemButton>
                          </ListItem>

                          {/* Visible layers only */}
                          {visibleLayers.map(ly => {
                            computeLayerStats(ly);
                            return (
                              <ListItem
                                key={`${sl.id}-${ly.id}`}
                                sx={{ pl: 1 }}
                                disablePadding
                                draggable
                                onDragStart={(e) => onDragStartLayer(ly, sl.id, e)}
                              >
                                <ListItemButton
                                  onClick={() => onDropLayer(ly, sl.id)}
                                  sx={{
                                    borderRadius: 1.5,
                                    py: 0.5,
                                    border: `1px dashed ${alpha(COLORS.slate, 0.25)}`,
                                    '&:hover': { bgcolor: alpha(COLORS.slate, 0.06) }
                                  }}
                                >
                                  <ListItemText
                                    secondary={
                                      <>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e3a8a', mb: 0.5 }}>
                                          {ly.name}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
                                          {Array.from(
                                            new Map((ly.items as any[]).map(it => [it?.name || 'Product', 0])).keys()
                                          )
                                            .slice(0, 3)
                                            .map(name => (
                                              <Chip key={name} size="small" variant="outlined" label={name} />
                                            ))}
                                        </Stack>
                                      </>
                                    }
                                  />

                                  <Tooltip title="Add">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      aria-label="add"
                                      onClick={(e) => { e.stopPropagation(); onDropLayer(ly, sl.id); }}
                                    >
                                      <AddIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </ListItemButton>
                              </ListItem>
                            );
                          })}

                          <Divider sx={{ my: 1 }} />
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Card>
          </Grid>

          {/* CENTER: 3D pallet */}
          <Grid size={{ xs: 12, sm: 9, md: 10 }}>
            <Card elevation={3} sx={{ background: gradient('#ffffff', '#f8fafc'), border: `1px solid ${alpha(COLORS.slate, 0.15)}`, borderRadius: 2 }}>
              <CardContent onDragOver={(e) => e.preventDefault()} onDrop={onCanvasDrop} sx={{ height: VIEW_H, position: 'relative', p: 0 }}>
                <Canvas
                  shadows
                  camera={{ position: [40, 35, 38], fov: 50 }}
                  gl={{ antialias: true, alpha: false }}
                  onCreated={({ gl }) => { gl.setClearColor('#f7f8fc'); }}
                >
                  <Scene pallet={palletForRender} placed={placed} />
                </Canvas>

                <Paper
                  elevation={0}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 12,
                    right: 12,
                    p: 0.75,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    backdropFilter: 'blur(8px)',
                    bgcolor: alpha('#ffffff', 0.6),
                    border: `1px solid ${alpha(COLORS.slate, 0.2)}`
                  }}
                >
                  <TextField
                    size="small"
                    label="Build name"
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    sx={{ minWidth: 160, flex: '1 1 180px', bgcolor: '#fff' }}
                    disabled={palletConfigs.length === 0}
                  />

                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ ml: 'auto' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                      onClick={duplicateLast}
                      sx={{ borderColor: COLORS.slate, color: COLORS.slateDark, textTransform: 'none' }}
                      disabled={placed.length === 0}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                      onClick={clearStack}
                      sx={{ borderColor: COLORS.slate, color: COLORS.slateDark, textTransform: 'none' }}
                      disabled={placed.length === 0}
                    >
                      Clear
                    </Button>

                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
                      onClick={saveBuild}
                      sx={{ background: softGradient, '&:hover': { background: gradient(COLORS.deepBlue, COLORS.slateDark) }, textTransform: 'none' }}
                      disabled={palletConfigs.length === 0 || placed.length === 0}
                    >
                      {editingBuildId ? 'Save Changes' : 'Save Build'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setBuildsModalOpen(true)}
                      sx={{ borderColor: COLORS.slate, color: COLORS.slateDark, textTransform: 'none' }}
                    >
                      View Saved Pallet Builds
                    </Button>
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    position: 'absolute',
                    left: 12,
                    bottom: 54,
                    right: 12,
                    p: 0.75,
                    bgcolor: alpha('#000', 0.04),
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    borderRadius: 2
                  }}
                >
                  {placed.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">No layers placed yet</Typography>
                  ) : (
                    placed.map(pl => (
                      <Box
                        key={pl.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          bgcolor: '#fff',
                          border: `1px solid ${alpha(COLORS.slate, 0.25)}`,
                          borderRadius: 1.5,
                          px: 1,
                          py: 0.25
                        }}
                      >
                        <Typography variant="caption" sx={{ color: COLORS.slateDark, fontWeight: 600 }}>
                          {pl.name} • {pl.weight} lbs • h {pl.thickness.toFixed(2)}
                        </Typography>

                        <IconButton size="small" onClick={() => rotatePlacedLayer(pl.id, -90)} sx={{ ml: 0.5 }} title="Rotate layer -90°">
                          <RotateLeftIcon fontSize="inherit" />
                        </IconButton>

                        <IconButton size="small" onClick={() => rotatePlacedLayer(pl.id, +90)} title="Rotate layer +90°">
                          <RotateRightIcon fontSize="inherit" />
                        </IconButton>

                        <IconButton size="small" onClick={() => removePlacedLayer(pl.id)} title="Remove layer" sx={{ color: 'error.main' }}>
                          <DeleteOutlineIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
                    ))
                  )}
                </Paper>


              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Dialog
          open={buildsModalOpen}
          onClose={() => setBuildsModalOpen(false)}
          fullWidth
          maxWidth="md"
          disableScrollLock={lockScrollForLarge}
          keepMounted
        >
          <DialogTitle sx={{ pb: 1 }}>
            Saved Pallet Builds
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              <TextField
                size="small"
                placeholder="Search by name or ID…"
                value={buildsSearch}
                onChange={(e) => setBuildsSearch(e.target.value)}
                sx={{ minWidth: 220, flex: '1 1 260px' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                select
                size="small"
                label="Filter: Pallet"
                value={modalFilterPalletName}
                onChange={(e) => setModalFilterPalletName(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: 200, flex: '0 1 220px' }}
              >
                <option value="" disabled hidden></option>
                <option value="">All pallets</option>
                {palletOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Filter: Product"
                value={modalFilterItemName}
                onChange={(e) => setModalFilterItemName(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: 200, flex: '0 1 220px' }}
              >
                <option value="" disabled hidden></option>
                <option value="">All Products</option>
                {itemOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </TextField>
            </Stack>

            <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {filteredBuilds.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No builds found.</Typography>
              ) : (
                <List dense sx={{ pt: 0 }}>
                  {filteredBuilds.map((b: any) => {
                    const topItems = summarizeBuildItems(b.placedLayers);
                    return (
                      <ListItem key={b.id} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                          onClick={() => loadBuild(b)}
                          sx={{
                            borderRadius: 1.5,
                            py: 0.6,
                            border: `1px solid ${alpha(COLORS.slate, 0.18)}`,
                            '&:hover': { bgcolor: alpha(COLORS.slate, 0.06), borderColor: alpha(COLORS.deepBlue, 0.4) }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 34 }}>
                            <ViewInArIcon sx={{ color: COLORS.deepBlue, fontSize: 18 }} />
                          </ListItemIcon>

                          <ListItemText
                            primaryTypographyProps={{ variant: 'subtitle2', sx: { fontWeight: 700, color: COLORS.slateDark } }}
                            secondary={
                              <>
                                <Typography variant="caption" display="block">
                                  {b.totalLayers} layers • {b.totalWeight} lbs
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ color: COLORS.slateMid }}>
                                  Pallet: {b.pallet?.name} {b.pallet ? `(${b.pallet.width}"×${b.pallet.depth}"×${b.pallet.height}")` : ''}
                                </Typography>
                                {typeof b.maxStackHeight === 'number' && (
                                  <Typography variant="caption" display="block" sx={{ color: COLORS.slateMid }}>
                                    Max height: {b.maxStackHeight}"
                                  </Typography>
                                )}
                                {topItems.length > 0 && (
                                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
                                    {topItems.slice(0, 2).map((it) => (
                                      <Chip key={it.name} size="small" variant="outlined" label={`${it.name} × ${it.count}`} />
                                    ))}
                                    {topItems.length > 2 && (
                                      <Chip size="small" variant="outlined" label={`+${topItems.length - 2} more`} />
                                    )}
                                  </Stack>
                                )}
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {b.timestamp}
                                </Typography>
                              </>
                            }
                            primary={b.name}
                          />

                          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); loadBuild(b); }}
                              sx={{ borderColor: COLORS.slate, color: COLORS.slateDark }}>
                              Edit
                            </Button>
                            <Tooltip title="Delete build">
                              <IconButton
                                edge="end"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete \"${b.name}\"? This cannot be undone.`)) {
                                    removePalletBuild(b.id);
                                  }
                                }}
                                size="small"
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1 }}>
            <Button onClick={() => setBuildsModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={2500}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default PalletBuildComposer;
