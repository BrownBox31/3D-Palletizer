import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store/store';
import {
  Container, Card, CardContent, CardHeader, Typography, TextField, Button,
  IconButton, Box, Chip, Stack, Paper, Avatar, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, useMediaQuery,
  Snackbar, Alert, Select, FormControl, InputLabel,
  Radio, RadioGroup, FormControlLabel, Divider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import StraightenIcon from '@mui/icons-material/Straighten';
import HeightIcon from '@mui/icons-material/Height';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { brand } from '../ui/brand';

/* 3D imports */
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges, Billboard, Text as DreiText } from '@react-three/drei';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

/* ---- Types ---- */
type BoxSide = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
type LabelTemplate = 'none' | 'barcode-small'; // only 'none' + 'small'
type LengthUnit = 'in' | 'mm';
type WeightUnit = 'lb' | 'kg';

type NewBoxState = {
  name: string;
  width: number;
  depth: number;
  height: number;
  weight: number;
  labelTemplate: LabelTemplate;
  labelSides: BoxSide[];
};

/* ---- Conversions ---- */
const mmToIn = (mm: number) => mm / 25.4;
const inToMm = (inch: number) => inch * 25.4;
const lbsToKg = (lbs: number) => lbs * 0.45359237;
const kgToLbs = (kg: number) => kg / 0.45359237;

/* ---- 3D helpers ---- */
function templateScale(template: LabelTemplate) {
  switch (template) {
    case 'barcode-small': return { u: 0.6, v: 0.28 };
    case 'none': return { u: 0, v: 0 };
  }
}

function useStripeTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    for (let x = 10; x < c.width - 10; x += 6) {
      ctx.fillStyle = '#111';
      ctx.fillRect(x, 16, 2, c.height - 32);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

type LabelPlaneProps = {
  side: BoxSide;
  width: number;
  depth: number;
  height: number;
  template: LabelTemplate;
};

const LabelPlane: React.FC<LabelPlaneProps> = ({ side, width, depth, height, template }) => {
  const stripes = useStripeTexture();
  const { u, v } = templateScale(template);

  const positions: Record<BoxSide, [number, number, number]> = {
    front: [0, 0, depth / 2 + 0.01],
    back: [0, 0, -depth / 2 - 0.01],
    left: [-width / 2 - 0.01, 0, 0],
    right: [width / 2 + 0.01, 0, 0],
    top: [0, height / 2 + 0.01, 0],
    bottom: [0, -height / 2 - 0.01, 0],
  };

  const rotations: Record<BoxSide, [number, number, number]> = {
    front: [0, 0, 0],
    back: [0, Math.PI, 0],
    left: [0, Math.PI / 2, 0],
    right: [0, -Math.PI / 2, 0],
    top: [-Math.PI / 2, 0, 0],
    bottom: [Math.PI / 2, 0, 0],
  };

  const pos = positions[side];
  const rot = rotations[side];

  return (
    <group position={pos} rotation={rot}>
      <mesh>
        <planeGeometry
          args={[
            side === 'top' || side === 'bottom' ? width : width * u,
            side === 'top' || side === 'bottom' ? depth : height * v
          ]}
        />
        <meshStandardMaterial map={stripes} color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const SCENE_SCALE = 0.02;
const DimensionLabels: React.FC<{
  W: number; H: number; D: number;
  width: number; height: number; depth: number;
}> = ({ W, H, D, width, height, depth }) => {
  const maxDim = Math.max(W, H, D) || 1;
  const pad = maxDim * 0.25;
  const fontSize = maxDim * 0.18;

  return (
    <>
      <Billboard position={[0, H / 2 + pad, 0]}>
        <DreiText fontSize={fontSize} anchorX="center" anchorY="middle" color="#111">
          H: {height}"
        </DreiText>
      </Billboard>

      <Billboard position={[W / 2 + pad, 0, 0]}>
        <DreiText fontSize={fontSize} anchorX="center" anchorY="middle" color="#111">
          L: {width}"
        </DreiText>
      </Billboard>

      <Billboard position={[0, 0, D / 2 + pad]}>
        <DreiText fontSize={fontSize} anchorX="center" anchorY="middle" color="#111">
          W: {depth}"
        </DreiText>
      </Billboard>
    </>
  );
};

/** Zoomed-in preview that auto-positions camera based on box size */
const BoxPreview = ({ width, depth, height, labelSides, template }: any) => {
  const W = width * SCENE_SCALE, D = depth * SCENE_SCALE, H = height * SCENE_SCALE;

  const maxDim = Math.max(W, D, H) || 1;
  const dist = maxDim * 3;
  const camPos: [number, number, number] = [dist * 0.9, dist * 0.9, dist];
  const canvasKey = `${width}-${depth}-${height}-${template}-${labelSides.join(',')}`;

  return (
    <Canvas key={canvasKey} camera={{ position: camPos, fov: 45 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 6]} intensity={0.9} />

      <mesh>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color="#B88746" roughness={0.95} />
        <Edges scale={1.001} />
      </mesh>

      {/* Render labels only when template is not 'none' */}
      {template !== 'none' && labelSides.map((s: BoxSide) => (
        <LabelPlane key={s} side={s} width={W} depth={D} height={H} template={template} />
      ))}

      <DimensionLabels W={W} H={H} D={D} width={width} height={height} depth={depth} />

      <OrbitControls
        target={[0, 0, 0]}
        minDistance={maxDim * 1.2}
        maxDistance={maxDim * 6}
        enableDamping
      />
    </Canvas>
  );
};

/* ==================== PAGE ==================== */
const ItemConfigurationPage: React.FC = () => {
  const { boxConfigs, addBoxConfig, removeBoxConfig, updateBoxConfig } = useAppStore();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));

  // Scroll is handled by App <main> — do not lock html/body overflow

  const [newBox, setNewBox] = useState<NewBoxState>({
    name: '', width: 8, depth: 10, height: 5, weight: 25, labelTemplate: 'barcode-small', labelSides: [],
  });

  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('in');
  const [editLengthUnit, setEditLengthUnit] = useState<LengthUnit>('in');

  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb');
  const [editWeightUnit, setEditWeightUnit] = useState<WeightUnit>('lb');

  // validation + snackbar
  const [errors, setErrors] = useState<{ name?: string; width?: string; depth?: string; height?: string }>({});
  const [savedOpen, setSavedOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<NewBoxState>({
    name: '', width: 0, depth: 0, height: 0, weight: 0, labelTemplate: 'barcode-small', labelSides: [],
  });

  const [listOpen, setListOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  const normalize = (s: string) => s.replace(/×/g, 'x').toLowerCase().trim();
  const filteredBoxConfigs = useMemo(() => {
    const q = normalize(modalSearch);
    if (!q) return boxConfigs;
    return boxConfigs.filter((b: any) => `${b.name} ${b.width} ${b.depth} ${b.height}`.toLowerCase().includes(q));
  }, [boxConfigs, modalSearch]);

  // validators
  const validate = (state: NewBoxState) => {
    const next: typeof errors = {};
    if (!state.name.trim()) next.name = 'Product name is required';
    if (!(state.width > 0)) next.width = 'Length must be greater than 0';
    if (!(state.depth > 0)) next.depth = 'Width must be greater than 0';
    if (!(state.height > 0)) next.height = 'Height must be greater than 0';
    return next;
  };

  // length unit toggle (Add form) – convert values so numbers stay correct
  const handleLengthUnitToggle = (nextUnit: LengthUnit) => {
    setNewBox(prev => {
      if (nextUnit === lengthUnit) return prev;
      let { width, depth, height } = prev;
      if (lengthUnit === 'in' && nextUnit === 'mm') {
        width = inToMm(width);
        depth = inToMm(depth);
        height = inToMm(height);
      } else if (lengthUnit === 'mm' && nextUnit === 'in') {
        width = mmToIn(width);
        depth = mmToIn(depth);
        height = mmToIn(height);
      }
      return {
        ...prev,
        width: Number(width.toFixed(2)),
        depth: Number(depth.toFixed(2)),
        height: Number(height.toFixed(2)),
      };
    });
    setLengthUnit(nextUnit);
  };

  // length unit toggle (Edit form)
  const handleEditLengthUnitToggle = (nextUnit: LengthUnit) => {
    setEditData(prev => {
      if (nextUnit === editLengthUnit) return prev;
      let { width, depth, height } = prev;
      if (editLengthUnit === 'in' && nextUnit === 'mm') {
        width = inToMm(width);
        depth = inToMm(depth);
        height = inToMm(height);
      } else if (editLengthUnit === 'mm' && nextUnit === 'in') {
        width = mmToIn(width);
        depth = mmToIn(depth);
        height = mmToIn(height);
      }
      return {
        ...prev,
        width: Number(width.toFixed(2)),
        depth: Number(depth.toFixed(2)),
        height: Number(height.toFixed(2)),
      };
    });
    setEditLengthUnit(nextUnit);
  };

  // weight unit toggle (Add form) – convert numeric value
  const handleWeightUnitToggle = (nextUnit: WeightUnit) => {
    setNewBox(prev => {
      if (nextUnit === weightUnit) return prev;
      let w = prev.weight;
      if (weightUnit === 'lb' && nextUnit === 'kg') {
        w = lbsToKg(w);
      } else if (weightUnit === 'kg' && nextUnit === 'lb') {
        w = kgToLbs(w);
      }
      return { ...prev, weight: Number(w.toFixed(2)) };
    });
    setWeightUnit(nextUnit);
  };

  // weight unit toggle (Edit form)
  const handleEditWeightUnitToggle = (nextUnit: WeightUnit) => {
    setEditData(prev => {
      if (nextUnit === editWeightUnit) return prev;
      let w = prev.weight;
      if (editWeightUnit === 'lb' && nextUnit === 'kg') {
        w = lbsToKg(w);
      } else if (editWeightUnit === 'kg' && nextUnit === 'lb') {
        w = kgToLbs(w);
      }
      return { ...prev, weight: Number(w.toFixed(2)) };
    });
    setEditWeightUnit(nextUnit);
  };

  const handleAdd = (e: any) => {
    e.preventDefault();
    const v = validate(newBox);
    setErrors(v);
    if (Object.keys(v).length) return;

    const payload = newBox.labelTemplate === 'none'
      ? { ...newBox, labelSides: [] }
      : newBox;

    addBoxConfig({
      ...payload,
      width: Number(newBox.width.toFixed(3)),
      depth: Number(newBox.depth.toFixed(3)),
      height: Number(newBox.height.toFixed(3)),
      weight: Number(newBox.weight.toFixed(3)),
      widthUnit: lengthUnit,
      depthUnit: lengthUnit,
      heightUnit: lengthUnit,
      weightUnit,
    });

    setSavedOpen(true);
    setNewBox({
      name: '', width: 8, depth: 10, height: 5, weight: 25,
      labelTemplate: 'barcode-small', labelSides: []
    });
    setLengthUnit('in');
    setWeightUnit('lb');
  };


  // preview always uses inches, convert if form is in mm
  const previewWidthIn = lengthUnit === 'in' ? newBox.width : mmToIn(newBox.width);
  const previewDepthIn = lengthUnit === 'in' ? newBox.depth : mmToIn(newBox.depth);
  const previewHeightIn = lengthUnit === 'in' ? newBox.height : mmToIn(newBox.height);

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        background: brand.pageBg,
        width: '100%',
        overflow: 'auto',
        py: 1.25,
        px: { xs: 1, md: 0 },
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={3}>
          {/* LEFT SIDE */}
          <Grid size={{ xs: 12, sm: 7, md: 8 }}>
            <Card
              elevation={0}
              sx={{
                background: brand.cardBg,
                borderRadius: 3,
                border: `1px solid ${brand.cardBorder}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardHeader
                avatar={<Avatar sx={{ background: brand.successG }}><AllInboxIcon /></Avatar>}
                title={<Typography variant="h5" fontWeight={700}>Product Configurations</Typography>}
                subheader="Define your products, labels, and placements"
              />
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Paper
                  component="form"
                  onSubmit={handleAdd}
                  sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 2,
                    background: alpha('#ECFEF4', 0.9),
                    border: `1px solid ${alpha('#DCFCE7', 0.9)}`
                  }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Add New Product(SKU)
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Product Name"
                        value={newBox.name}
                        onChange={(e) => {
                          setNewBox({ ...newBox, name: e.target.value });
                          if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                        }}
                        error={!!errors.name}
                        helperText={errors.name}
                      />
                    </Grid>

                    {/* Length */}
                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Length"
                        type="number"
                        value={newBox.width}
                        onChange={(e) => {
                          const v = +e.target.value;
                          setNewBox({ ...newBox, width: v });
                          if (errors.width && v > 0) setErrors(prev => ({ ...prev, width: undefined }));
                        }}
                        error={!!errors.width}
                        helperText={errors.width}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Box display="flex" flexDirection="column" sx={{ mr: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newVal = newBox.width + 0.1;
                                    setNewBox({ ...newBox, width: newVal });
                                    if (errors.width && newVal > 0) setErrors(prev => ({ ...prev, width: undefined }));
                                  }}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowUpIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newVal = Math.max(0, newBox.width - 0.1);
                                    setNewBox({ ...newBox, width: newVal });
                                  }}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowDownIcon fontSize="small" />
                                </IconButton>
                              </Box>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <StraightenIcon fontSize="small" color="action" />
                              <Typography variant="caption" sx={{ ml: 0.5 }}>
                                &nbsp;{lengthUnit === 'in' ? 'in' : 'mm'}
                              </Typography>
                            </InputAdornment>
                          )
                        }}
                        sx={{
                          '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          },
                          '& input[type=number]': {
                            MozAppearance: 'textfield'
                          }
                        }}
                      />
                    </Grid>

                    {/* Width */}
                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Width"
                        type="number"
                        value={newBox.depth}
                        onChange={(e) => {
                          const v = +e.target.value;
                          setNewBox({ ...newBox, depth: v });
                          if (errors.depth && v > 0) setErrors(prev => ({ ...prev, depth: undefined }));
                        }}
                        error={!!errors.depth}
                        helperText={errors.depth}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Box display="flex" flexDirection="column" sx={{ mr: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newVal = newBox.depth + 0.1;
                                    setNewBox({ ...newBox, depth: newVal });
                                    if (errors.depth && newVal > 0) setErrors(prev => ({ ...prev, depth: undefined }));
                                  }}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowUpIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newVal = Math.max(0, newBox.depth - 0.1);
                                    setNewBox({ ...newBox, depth: newVal });
                                  }}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowDownIcon fontSize="small" />
                                </IconButton>
                              </Box>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <StraightenIcon fontSize="small" color="action" />
                              <Typography variant="caption" sx={{ ml: 0.5 }}>
                                &nbsp;{lengthUnit === 'in' ? 'in' : 'mm'}
                              </Typography>
                            </InputAdornment>
                          )
                        }}
                        sx={{
                          '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          },
                          '& input[type=number]': {
                            MozAppearance: 'textfield'
                          }
                        }}
                      />
                    </Grid>

                    {/* Height */}
                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Height"
                        type="number"
                        value={newBox.height}
                        onChange={(e) => {
                          const v = +e.target.value;
                          setNewBox({ ...newBox, height: v });
                          if (errors.height && v > 0) setErrors(prev => ({ ...prev, height: undefined }));
                        }}
                        error={!!errors.height}
                        helperText={errors.height}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Box display="flex" flexDirection="column" sx={{ mr: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newVal = newBox.height + 0.1;
                                    setNewBox({ ...newBox, height: newVal });
                                    if (errors.height && newVal > 0) setErrors(prev => ({ ...prev, height: undefined }));
                                  }}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowUpIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newVal = Math.max(0, newBox.height - 0.1);
                                    setNewBox({ ...newBox, height: newVal });
                                  }}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowDownIcon fontSize="small" />
                                </IconButton>
                              </Box>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <HeightIcon fontSize="small" color="action" />
                              <Typography variant="caption" sx={{ ml: 0.5 }}>
                                &nbsp;{lengthUnit === 'in' ? 'in' : 'mm'}
                              </Typography>
                            </InputAdornment>
                          )
                        }}
                        sx={{
                          '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          },
                          '& input[type=number]': {
                            MozAppearance: 'textfield'
                          }
                        }}
                      />
                    </Grid>

                    {/* Length/Width/Height unit radios */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <FormControl component="fieldset" sx={{ height: '100%', display: 'flex', justifyContent: 'center' }}>
                        <RadioGroup
                          row
                          value={lengthUnit}
                          onChange={(e) => handleLengthUnitToggle(e.target.value as LengthUnit)}
                        >
                          <FormControlLabel value="in" control={<Radio size="small" />} label="in" />
                          <FormControlLabel value="mm" control={<Radio size="small" />} label="mm" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    {/* Weight */}
                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Weight"
                        type="number"
                        value={newBox.weight}
                        onChange={(e) => setNewBox({ ...newBox, weight: +e.target.value })}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Box display="flex" flexDirection="column" sx={{ mr: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => setNewBox({ ...newBox, weight: newBox.weight + 1 })}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowUpIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => setNewBox({ ...newBox, weight: Math.max(0, newBox.weight - 1) })}
                                  sx={{ padding: 0.25, '&:hover': { background: alpha('#000', 0.05) } }}
                                >
                                  <KeyboardArrowDownIcon fontSize="small" />
                                </IconButton>
                              </Box>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <FitnessCenterIcon fontSize="small" color="action" />
                              <Typography variant="caption" sx={{ ml: 0.5 }}>
                                &nbsp;{weightUnit === 'lb' ? 'lbs' : 'kg'}
                              </Typography>
                            </InputAdornment>
                          )
                        }}
                        sx={{
                          '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          },
                          '& input[type=number]': {
                            MozAppearance: 'textfield'
                          }
                        }}
                      />
                    </Grid>

                    {/* Weight unit radios */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <FormControl component="fieldset" sx={{ height: '100%', display: 'flex', justifyContent: 'center' }}>
                        <RadioGroup
                          row
                          value={weightUnit}
                          onChange={(e) => handleWeightUnitToggle(e.target.value as WeightUnit)}
                        >
                          <FormControlLabel value="lb" control={<Radio size="small" />} label="lbs" />
                          <FormControlLabel value="kg" control={<Radio size="small" />} label="kg" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    
                    <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                      <FormControl fullWidth>
                        <InputLabel>Label Placement On Product</InputLabel>
                        <Select
                          multiple
                          value={newBox.labelSides}
                          label="Label Placement On Product"
                          onChange={(e) => {
                            const val = e.target.value as unknown as string[];
                            if (val.includes('none')) {
                              setNewBox(prev => ({ ...prev, labelSides: [], labelTemplate: 'none' }));
                            } else {
                              setNewBox(prev => ({
                                ...prev,
                                labelSides: (val as BoxSide[]).filter(s => s === 'left' || s === 'right'),
                              }));
                            }
                          }}
                        >
                          <MenuItem value="none">NONE</MenuItem>
                          {['left', 'right'].map(side => (
                            <MenuItem key={side} value={side}>
                              {side.toUpperCase()}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Button type="submit" fullWidth variant="contained" startIcon={<AddIcon />}>
                        Add Product
                      </Button>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Button fullWidth variant="outlined" onClick={() => setListOpen(true)}>
                        View Saved Products
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </CardContent>
            </Card>
          </Grid>

          {/* RIGHT SIDE PREVIEW */}
          <Grid size={{ xs: 12, sm: 5, md: 4 }}>
            <Card
              elevation={0}
              sx={{
                background: brand.cardBg,
                borderRadius: 3,
                border: `1px solid ${brand.cardBorder}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardHeader
                title={<Typography variant="h6" fontWeight={700}>3D Preview</Typography>}
                subheader="Rotate to inspect label placement"
              />
              <CardContent sx={{ flex: 1 }}>
                <Box
                  sx={{
                    height: 360,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${brand.cardBorder}`,
                    background: alpha('#fff', .85)
                  }}
                >
                  <BoxPreview
                    width={previewWidthIn}
                    depth={previewDepthIn}
                    height={previewHeightIn}
                    labelSides={newBox.labelSides}
                    template={newBox.labelTemplate}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* SAVED ITEMS MODAL */}
      <Dialog open={listOpen} onClose={() => setListOpen(false)} fullWidth maxWidth="md" fullScreen={fullScreenDialog}>
        <DialogTitle>Saved Products</DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <TextField
            fullWidth
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            placeholder="Search items..."
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              endAdornment: modalSearch && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setModalSearch('')}><ClearIcon /></IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          <Stack spacing={1.5} sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredBoxConfigs.map((box: any) => {
              const lengthU = box.widthUnit ?? 'in';
              const widthU = box.depthUnit ?? lengthU;
              const heightU = box.heightUnit ?? lengthU;
              const wU = box.weightUnit ?? 'lb';

              return (
                <Paper key={box.id} sx={{ p: 2, border: `1px solid ${brand.cardBorder}`, borderRadius: 2 }}>
                  <Box display="flex" alignItems="center">
                    <Box flex={1}>
                      <Typography fontWeight={700}>{box.name}</Typography>
                      <Chip
                        size="small"
                        sx={{ mt: 1 }}
                        label={`${box.width} ${lengthU} × ${box.depth} ${widthU} × ${box.height} ${heightU}  •  ${box.weight ?? 0} ${wU === 'lb' ? 'lbs' : 'kg'}`}
                      />
                    </Box>
                    <IconButton
                      onClick={() => {
                        const storedLengthUnit: LengthUnit = box.widthUnit ?? 'in';
                        const storedWeightUnit: WeightUnit = box.weightUnit ?? 'lb';

                        setEditId(box.id);
                        setEditData({
                          name: box.name,
                          width: Number((box.width ?? 0).toFixed(2)),
                          depth: Number((box.depth ?? 0).toFixed(2)),
                          height: Number((box.height ?? 0).toFixed(2)),
                          weight: Number((box.weight ?? 0).toFixed(2)),
                          labelTemplate: (box.labelTemplate ?? 'none') as LabelTemplate,
                          labelSides: (box.labelSides ?? []).filter(
                            (s: BoxSide) => s === 'left' || s === 'right'
                          ) as BoxSide[],
                        });

                        setEditLengthUnit(storedLengthUnit);
                        setEditWeightUnit(storedWeightUnit);
                        setEditOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>

                    <IconButton color="error" onClick={() => removeBoxConfig(box.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Paper>
              );
            })}


          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setListOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Product Name"
              fullWidth
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />

            <Grid container spacing={1} alignItems="center">
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Length"
                  type="number"
                  value={editData.width}
                  onChange={(e) => setEditData({ ...editData, width: +e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <StraightenIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          &nbsp;{editLengthUnit}
                        </Typography>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Width"
                  type="number"
                  value={editData.depth}
                  onChange={(e) => setEditData({ ...editData, depth: +e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <StraightenIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          &nbsp;{editLengthUnit}
                        </Typography>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Height"
                  type="number"
                  value={editData.height}
                  onChange={(e) => setEditData({ ...editData, height: +e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <HeightIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          &nbsp;{editLengthUnit}
                        </Typography>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              {/* Length unit radios in Edit */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl component="fieldset">
                  <RadioGroup
                    row
                    value={editLengthUnit}
                    onChange={(e) => handleEditLengthUnitToggle(e.target.value as LengthUnit)}
                  >
                    <FormControlLabel value="in" control={<Radio size="small" />} label="in" />
                    <FormControlLabel value="mm" control={<Radio size="small" />} label="mm" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={1} alignItems="center">
              <Grid size={{ xs: 6, sm: 6 }}>
                <TextField
                  label="Weight"
                  type="number"
                  value={editData.weight}
                  onChange={(e) => setEditData({ ...editData, weight: +e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <FitnessCenterIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          &nbsp;{editWeightUnit === 'lb' ? 'lbs' : 'kg'}
                        </Typography>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 6 }}>
                <FormControl component="fieldset">
                  <RadioGroup
                    row
                    value={editWeightUnit}
                    onChange={(e) => handleEditWeightUnitToggle(e.target.value as WeightUnit)}
                  >
                    <FormControlLabel value="lb" control={<Radio size="small" />} label="lbs" />
                    <FormControlLabel value="kg" control={<Radio size="small" />} label="kg" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>

            {/* Label placement in Edit modal - LEFT/RIGHT only + NONE option */}
            <FormControl fullWidth>
              <InputLabel>Label Placement On Product</InputLabel>
              <Select
                multiple
                value={editData.labelSides}
                label="Label Placement On Product"
                onChange={(e) => {
                  const val = e.target.value as unknown as string[];
                  if (val.includes('none')) {
                    setEditData(prev => ({ ...prev, labelSides: [], labelTemplate: 'none' }));
                  } else {
                    setEditData(prev => ({
                      ...prev,
                      labelSides: (val as BoxSide[]).filter(s => s === 'left' || s === 'right'),
                    }));
                  }
                }}
              >
                <MenuItem value="none">NONE</MenuItem>
                {['left', 'right'].map(side => (
                  <MenuItem key={side} value={side}>
                    {side.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editId) return;

              const payload =
                editData.labelTemplate === 'none'
                  ? { ...editData, labelSides: [] }
                  : editData;

              updateBoxConfig(editId, {
                ...payload,
                width: Number(editData.width.toFixed(3)),
                depth: Number(editData.depth.toFixed(3)),
                height: Number(editData.height.toFixed(3)),
                weight: Number(editData.weight.toFixed(3)),
                widthUnit: editLengthUnit,
                depthUnit: editLengthUnit,
                heightUnit: editLengthUnit,
                weightUnit: editWeightUnit,
              });

              setEditOpen(false);
            }}
          >
            Save
          </Button>

        </DialogActions>
      </Dialog>

      {/* Saved toast */}
      <Snackbar
        open={savedOpen}
        autoHideDuration={2500}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSavedOpen(false)} variant="filled">
          Product saved successfully
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ItemConfigurationPage;
