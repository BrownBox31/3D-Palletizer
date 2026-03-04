import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/store';
import {
  Container, Card, CardContent, CardHeader, Typography, TextField, Button,
  IconButton, Box, Chip, Stack, Paper, Avatar, Fade, Tooltip, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, useMediaQuery, Snackbar, Alert,
  Radio, RadioGroup, FormControl, FormControlLabel,
  Divider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import StraightenIcon from '@mui/icons-material/Straighten';
import ScaleIcon from '@mui/icons-material/Scale';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { brand } from '../ui/brand';

// 3D
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Box as DreiBox, useTexture, Billboard, Text as DreiText } from '@react-three/drei';
import * as THREE from 'three';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// ---------- Types ----------
type NewPalletState = { name: string; width: number; depth: number; maxWeight: number; };
type FieldErrors = Partial<Record<keyof NewPalletState, string>>;

const PALLET_HEIGHT = 5.5;

// Conversion helpers
const lbsToKg = (lbs: number) => lbs * 0.45359237;
const kgToLbs = (kg: number) => kg / 0.45359237;
const mmToIn = (mm: number) => mm / 25.4;
const inToMm = (inch: number) => inch * 25.4;

// ---------- 3D Preview ----------
const WoodenPallet: React.FC<{ dims: { width: number; depth: number; height: number } }> = ({ dims }) => {
  const wood = useTexture('/wood_texture.jpg');
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.repeat.set(2, 2);
  wood.anisotropy = 8;

  const h = Math.max(dims.height, 0.01);
  const top = h * 0.25;
  const bearer = h * 0.35;
  const gap = (dims.depth * 0.04);
  const slatCount = 7;
  const slatDepth = Math.max((dims.depth - gap * (slatCount - 1)) / slatCount, 0.01);

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

const DimensionLabels: React.FC<{ w: number; d: number; width: number; depth: number; }> = ({ w, d, width, depth }) => {
  const maxDim = Math.max(w, d) || 1;
  const pad = maxDim * 0.22;
  const fontSize = maxDim * 0.06;

  return (
    <>
      <Billboard position={[w / 2 + pad, 0, 0]}>
        <DreiText fontSize={fontSize} anchorX="center" anchorY="middle" color="#111">L: {width}"</DreiText>
      </Billboard>
      <Billboard position={[0, 0, d / 2 + pad]}>
        <DreiText fontSize={fontSize} anchorX="center" anchorY="middle" color="#111">W: {depth}"</DreiText>
      </Billboard>
    </>
  );
};

function PalletPreview3D({ width, depth }: { width: number; depth: number }) {
  const w = Math.max(width, 0);
  const d = Math.max(depth, 0);
  const h = PALLET_HEIGHT;
  const maxDim = Math.max(w, d, h) || 1;
  const scale = 2 / maxDim;

  const ws = w * scale, ds = d * scale, hs = h * scale;

  return (
    <Canvas camera={{ position: [3, 2, 3], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 3]} intensity={0.7} castShadow />
      <group position={[0, hs / 2, 0]}>
        <WoodenPallet dims={{ width: ws, depth: ds, height: hs }} />
      </group>
      <DimensionLabels w={ws} d={ds} width={w} depth={d} />
      <ContactShadows position={[0, 0, 0]} opacity={0.25} scale={8} blur={2.5} far={10} />
      <Environment preset="city" />
      <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}

// ---------- Main Component ----------
const PalletConfigurationPage: React.FC = () => {
  const {
    palletConfigs,
    addPalletConfig,
    removePalletConfig,
    updatePalletConfig,
  } = useAppStore();

  const theme = useTheme();

  const lockScrollForLarge = useMediaQuery(theme.breakpoints.up('lg'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root') || document.getElementById('__next') || undefined;

    const prevHtmlOverflow = (html.style.overflow || '');
    const prevBodyOverflow = (body.style.overflow || '');
    const prevRootOverflow = root?.style.overflow;

    if (lockScrollForLarge) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      if (root) root.style.overflow = 'hidden';
    } else {
      html.style.overflow = '';
      body.style.overflow = '';
      if (root) root.style.overflow = '';
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      if (root && prevRootOverflow !== undefined) root.style.overflow = prevRootOverflow!;
    };
  }, [lockScrollForLarge]);

  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));

  const [newPallet, setNewPallet] = useState<NewPalletState>({ name: '', width: 48, depth: 40, maxWeight: 2000 });
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
  const [lengthUnit, setLengthUnit] = useState<'in' | 'mm'>('in'); // 🔹 length/width unit

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [snackOpen, setSnackOpen] = useState(false);

  const [listOpen, setListOpen] = useState(false);
  const openList = () => setListOpen(true);
  const closeList = () => setListOpen(false);

  const [modalSearch, setModalSearch] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    name: string;
    width: number;
    depth: number;
    maxWeight: number;
    maxWeightUnit?: 'lb' | 'kg';
    height?: number;
    lengthUnit?: 'in' | 'mm';
  }>({
    name: '',
    width: 0,
    depth: 0,
    maxWeight: 0,
    maxWeightUnit: 'lb',
    height: PALLET_HEIGHT,
    lengthUnit: 'in'
  });

  const openEdit = (p: any) => {
    setEditId(p.id);

    const unit: 'lb' | 'kg' = p.maxWeightUnit ? p.maxWeightUnit : 'lb';
    let displayValue = p.maxWeight ?? 0;
    if (p.maxWeightKg != null) {
      displayValue = unit === 'lb'
        ? Math.round(kgToLbs(p.maxWeightKg) * 100) / 100
        : Math.round(p.maxWeightKg * 100) / 100;
    }

    const lengthU: 'in' | 'mm' = p.lengthUnit ? p.lengthUnit : 'in';
    const displayWidth = lengthU === 'in' ? (p.width ?? 0) : Number(inToMm(p.width ?? 0).toFixed(1));
    const displayDepth = lengthU === 'in' ? (p.depth ?? 0) : Number(inToMm(p.depth ?? 0).toFixed(1));

    setEditData({
      name: p.name,
      width: displayWidth,
      depth: displayDepth,
      maxWeight: displayValue,
      maxWeightUnit: unit,
      height: p.height ?? PALLET_HEIGHT,
      lengthUnit: lengthU
    });
    setEditOpen(true);
  };

  const closeEdit = () => setEditOpen(false);

  const saveEdit = () => {
    if (!editId) return;
    const unit = editData.maxWeightUnit ?? 'lb';
    const value = editData.maxWeight;
    const kg = unit === 'lb' ? lbsToKg(value) : value;

    const lenUnit = editData.lengthUnit ?? 'in';
    const widthIn = lenUnit === 'in' ? editData.width : mmToIn(editData.width);
    const depthIn = lenUnit === 'in' ? editData.depth : mmToIn(editData.depth);

    updatePalletConfig(editId, {
      name: editData.name,
      width: Number(widthIn.toFixed(3)),
      depth: Number(depthIn.toFixed(3)),
      maxWeight: value,
      maxWeightUnit: unit,
      maxWeightKg: Number(kg.toFixed(4)),
      height: editData.height ?? PALLET_HEIGHT,
      lengthUnit: lenUnit
    });
    setEditOpen(false);
  };

  const nameExists = (name: string) =>
    palletConfigs.some((p: any) => (p.name || '').trim().toLowerCase() === name.trim().toLowerCase());

  const errors: FieldErrors = useMemo(() => {
    const e: FieldErrors = {};
    const { name, width, depth } = newPallet;

    if (!name.trim()) e.name = 'Name is required';
    else if (name.length > 60) e.name = 'Keep under 60 characters';
    else if (nameExists(name)) e.name = 'A pallet with this name already exists';

    if (!(width > 0)) e.width = 'Length must be > 0';
    if (!(depth > 0)) e.depth = 'Width must be > 0';

    return e;
  }, [newPallet, palletConfigs]);

  const isValid = Object.keys(errors).length === 0;

  const handleAddPallet = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, width: true, depth: true, maxWeight: true });
    if (!isValid) return;

    const value = newPallet.maxWeight;
    const kg = weightUnit === 'lb' ? lbsToKg(value) : value;

    const widthIn = lengthUnit === 'in' ? newPallet.width : mmToIn(newPallet.width);
    const depthIn = lengthUnit === 'in' ? newPallet.depth : mmToIn(newPallet.depth);

    addPalletConfig({
      name: newPallet.name,
      width: Number(widthIn.toFixed(3)),
      depth: Number(depthIn.toFixed(3)),
      height: PALLET_HEIGHT,
      maxWeight: value,
      maxWeightUnit: weightUnit,
      maxWeightKg: Number(kg.toFixed(4)),
      lengthUnit
    });

    setSnackOpen(true);
    setNewPallet({ name: '', width: 48, depth: 40, maxWeight: 2000 });
    setWeightUnit('lb');
    setLengthUnit('in');
  };

  const normalize = (s: string) => s.replace(/×/g, 'x').toLowerCase().trim();

  const filteredPallets = useMemo(() => {
    const q = normalize(modalSearch);
    if (!q) return palletConfigs;

    const tokens = q.split(/[\sx]+/).filter(Boolean);

    return palletConfigs.filter((p: any) => {
      const name = (p.name ?? '').toString().toLowerCase();
      const dimsWxD = `${p.width}x${p.depth}`.toLowerCase();
      const dimsPretty = `${p.width}×${p.depth}`.toLowerCase();
      const parts = [
        name,
        `${p.width}`, `${p.depth}`,
        `${p.maxWeight ?? (p.maxWeightKg ? Math.round(kgToLbs(p.maxWeightKg)) : '')}`,
        dimsWxD, dimsPretty,
        `max ${p.maxWeight ?? ''}`,
        `max:${p.maxWeight ?? ''}`,
      ].join(' ');
      return tokens.every(tok => parts.includes(tok));
    });
  }, [palletConfigs, modalSearch]);

  const previewWidthIn = lengthUnit === 'in' ? newPallet.width : mmToIn(newPallet.width);
  const previewDepthIn = lengthUnit === 'in' ? newPallet.depth : mmToIn(newPallet.depth);

  return (
    <Box sx={{
      height: '100dvh',
      minHeight: '100svh',
      overflow: lockScrollForLarge ? 'hidden' : 'auto',
      overscrollBehavior: 'none',
      background: brand.pageBg,
      width: '100vw',
      overflowX: 'hidden',
    }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ height: '100%', px: { xs: 2, md: 3, xl: 4 }, py: { xs: 2, md: 3 } }}
      >
        <Grid container spacing={3} alignItems="stretch" sx={{ height: '100%' }}>
          {/* Left: Form */}
          <Grid size={{ xs: 12, lg: 7 }} sx={{ height: '100%' }}>
            <Card
              elevation={0}
              sx={{
                background: brand.cardBg,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${brand.cardBorder}`,
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardHeader
                sx={{ pb: 1.5 }}
                avatar={<Avatar sx={{ background: brand.primaryG }}><ViewInArIcon /></Avatar>}
                title={<Typography variant="h5" fontWeight={700}>Pallet Configurations</Typography>}
                subheader="Define your pallet specifications and weight limits"
              />
              <CardContent sx={{ pt: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, flex: 1 }}>
                <Paper
                  elevation={0}
                  component="form"
                  noValidate
                  onSubmit={handleAddPallet}
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    background: alpha('#F6F8FB', 0.9),
                    border: `1px solid ${alpha('#E2E8F0', 0.7)}`,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Add New Pallet</Typography>

                  {isMd ? (
                    // Tablet layout: fields (md=7) + inline 3D preview (md=5)
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 7 }}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Pallet Name"
                              value={newPallet.name}
                              onChange={(e) => setNewPallet((p) => ({ ...p, name: e.target.value }))}
                              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                              required
                              error={!!touched.name && !!errors.name}
                              helperText={touched.name && errors.name}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  background: alpha('#FFFFFF', 0.9)
                                }
                              }}
                            />
                          </Grid>

                          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                            <TextField
                              fullWidth
                              label="Length"
                              type="number"
                              value={newPallet.width}
                              onChange={(e) => setNewPallet((p) => ({
                                ...p,
                                width: parseFloat(e.target.value) || 0
                              }))}
                              onBlur={() => setTouched((t) => ({ ...t, width: true }))}
                              error={!!touched.width && !!errors.width}
                              helperText={touched.width && errors.width}
                              inputProps={{
                                min: 1,
                                max: lengthUnit === 'in' ? 120 : inToMm(120),
                                step: 0.1
                              }}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Tooltip title="Length (X-axis)">
                                      <StraightenIcon fontSize="small" color="action" />
                                    </Tooltip>
                                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                                      &nbsp;{lengthUnit === 'in' ? 'in' : 'mm'}
                                    </Typography>
                                  </InputAdornment>
                                )
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  background: alpha('#fff', 0.9)
                                }
                              }}
                            />
                          </Grid>

                          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                            <TextField
                              fullWidth
                              label="Width"
                              type="number"
                              value={newPallet.depth}
                              onChange={(e) => setNewPallet((p) => ({
                                ...p,
                                depth: parseFloat(e.target.value) || 0
                              }))}
                              onBlur={() => setTouched((t) => ({ ...t, depth: true }))}
                              error={!!touched.depth && !!errors.depth}
                              helperText={touched.depth && errors.depth}
                              inputProps={{
                                min: 1,
                                max: lengthUnit === 'in' ? 120 : inToMm(120),
                                step: 0.1
                              }}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Tooltip title="Width (Z-axis)">
                                      <StraightenIcon fontSize="small" color="action" />
                                    </Tooltip>
                                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                                      &nbsp;{lengthUnit === 'in' ? 'in' : 'mm'}
                                    </Typography>
                                  </InputAdornment>
                                )
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  background: alpha('#fff', 0.9)
                                }
                              }}
                            />
                          </Grid>

                          {/* Length/Width unit radios */}
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl
                              component="fieldset"
                              sx={{ height: '100%', display: 'flex', justifyContent: 'center' }}
                            >
                              <RadioGroup
                                row
                                value={lengthUnit}
                                onChange={(e) => setLengthUnit(e.target.value as 'in' | 'mm')}
                              >
                                <FormControlLabel value="in" control={<Radio size="small" />} label="in" />
                                <FormControlLabel value="mm" control={<Radio size="small" />} label="mm" />
                              </RadioGroup>
                            </FormControl>
                          </Grid>

                          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                            <TextField
                              fullWidth
                              label="Max Weight"
                              type="number"
                              value={newPallet.maxWeight}
                              onChange={(e) => setNewPallet((p) => ({
                                ...p,
                                maxWeight: parseFloat(e.target.value) || 0
                              }))}
                              onBlur={() => setTouched((t) => ({ ...t, maxWeight: true }))}
                              error={!!touched.maxWeight && !!errors.maxWeight}
                              helperText={touched.maxWeight && errors.maxWeight}
                              inputProps={{ step: 'any' }}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Typography variant="caption">
                                      {weightUnit === 'lb' ? 'lbs' : 'kg'}
                                    </Typography>
                                  </InputAdornment>
                                )
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  background: alpha('#fff', 0.9)
                                }
                              }}
                            />
                          </Grid>

                          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                            <FormControl
                              component="fieldset"
                              sx={{ height: '100%', display: 'flex', justifyContent: 'center' }}
                            >
                              <RadioGroup
                                row
                                value={weightUnit}
                                onChange={(e) => setWeightUnit(e.target.value as 'lb' | 'kg')}
                              >
                                <FormControlLabel value="lb" control={<Radio size="small" />} label="lbs" />
                                <FormControlLabel value="kg" control={<Radio size="small" />} label="kg" />
                              </RadioGroup>
                            </FormControl>
                          </Grid>

                          {/* Actions */}
                          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                            <Button
                              type="submit"
                              variant="contained"
                              startIcon={<AddIcon />}
                              fullWidth
                              disabled={!isValid}
                              sx={{
                                borderRadius: 2,
                                py: 1.25,
                                textTransform: 'none',
                                fontWeight: 700,
                                background: brand.primaryG,
                                '&:hover': {
                                  background: brand.primaryG,
                                  transform: 'translateY(-1px)',
                                  boxShadow: `0 10px 26px ${alpha(brand.primary, 0.35)}`
                                },
                                transition: 'all 0.2s ease-in-out'
                              }}
                            >
                              Add Configuration
                            </Button>
                          </Grid>

                          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                            <Button
                              variant="outlined"
                              onClick={openList}
                              fullWidth
                              sx={{
                                borderRadius: 2,
                                py: 1.25,
                                textTransform: 'none',
                                fontWeight: 700,
                                background: alpha('#FFFFFF', 0.8),
                                borderColor: brand.cardBorder,
                                '&:hover': { background: alpha('#FFFFFF', 0.95) }
                              }}
                            >
                              View Saved Pallets
                            </Button>
                          </Grid>
                        </Grid>
                      </Grid>

                      <Grid size={{ xs: 12, md: 5 }}>
                        <Box
                          sx={{
                            height: 360,
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: `1px solid ${brand.cardBorder}`,
                            background: alpha('#fff', 0.8)
                          }}
                        >
                          <PalletPreview3D width={previewWidthIn} depth={previewDepthIn} />
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={`L × W: ${newPallet.width} × ${newPallet.depth} ${lengthUnit}`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Max: ${newPallet.maxWeight} ${weightUnit}`}
                            color="primary"
                            variant="filled"
                          />
                        </Stack>
                      </Grid>
                    </Grid>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Pallet Name"
                          value={newPallet.name}
                          onChange={(e) => setNewPallet((p) => ({ ...p, name: e.target.value }))}
                          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                          required
                          error={!!touched.name && !!errors.name}
                          helperText={touched.name && errors.name}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              background: alpha('#FFFFFF', 0.9)
                            }
                          }}
                        />
                      </Grid>

                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <TextField
                          fullWidth
                          label="Length"
                          type="number"
                          value={newPallet.width}
                          onChange={(e) => setNewPallet((p) => ({
                            ...p,
                            width: parseFloat(e.target.value) || 0
                          }))}
                          onBlur={() => setTouched((t) => ({ ...t, width: true }))}
                          error={!!touched.width && !!errors.width}
                          helperText={touched.width && errors.width}
                          inputProps={{
                            min: 1,
                            max: lengthUnit === 'in' ? 120 : inToMm(120),
                            step: 0.1
                          }}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <Box display="flex" flexDirection="column" sx={{ mr: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setNewPallet((p) => ({
                                        ...p,
                                        width: p.width + 0.1
                                      }))
                                    }
                                    sx={{
                                      padding: 0.25,
                                      '&:hover': { background: alpha(brand.primary, 0.1) }
                                    }}
                                  >
                                    <KeyboardArrowUpIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setNewPallet((p) => ({
                                        ...p,
                                        width: Math.max(1, p.width - 0.1)
                                      }))
                                    }
                                    sx={{
                                      padding: 0.25,
                                      '&:hover': { background: alpha(brand.primary, 0.1) }
                                    }}
                                  >
                                    <KeyboardArrowDownIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                                <Tooltip title="Length (X-axis)">
                                  <StraightenIcon fontSize="small" color="action" />
                                </Tooltip>
                                <Typography variant="caption" sx={{ ml: 0.5 }}>
                                  &nbsp;{lengthUnit === 'in' ? 'in' : 'mm'}
                                </Typography>
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              background: alpha('#fff', 0.9)
                            },
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

                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <TextField
                          fullWidth
                          label="Width"
                          type="number"
                          value={newPallet.depth}
                          onChange={(e) => setNewPallet((p) => ({
                            ...p,
                            depth: parseFloat(e.target.value) || 0
                          }))}
                          onBlur={() => setTouched((t) => ({ ...t, depth: true }))}
                          error={!!touched.depth && !!errors.depth}
                          helperText={touched.depth && errors.depth}
                          inputProps={{
                            min: 1,
                            max: lengthUnit === 'in' ? 120 : inToMm(120),
                            step: 0.1
                          }}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <Box display="flex" flexDirection="column" sx={{ mr: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setNewPallet((p) => ({
                                        ...p,
                                        depth: p.depth + 0.1
                                      }))
                                    }
                                    sx={{
                                      padding: 0.25,
                                      '&:hover': { background: alpha(brand.primary, 0.1) }
                                    }}
                                  >
                                    <KeyboardArrowUpIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setNewPallet((p) => ({
                                        ...p,
                                        depth: Math.max(1, p.depth - 0.1)
                                      }))
                                    }
                                    sx={{
                                      padding: 0.25,
                                      '&:hover': { background: alpha(brand.primary, 0.1) }
                                    }}
                                  >
                                    <KeyboardArrowDownIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                                <Tooltip title="Width (Z-axis)">
                                  <StraightenIcon fontSize="small" color="action" />
                                </Tooltip>
                                <Typography variant="caption" sx={{ ml: 0.5 }}>
                                  &nbsp;{lengthUnit === 'in' ? 'in' : 'mm'}
                                </Typography>
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              background: alpha('#fff', 0.9)
                            },
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

                      {/* Length/Width unit radios */}
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl component="fieldset">
                          <RadioGroup
                            row
                            value={lengthUnit}
                            onChange={(e) => setLengthUnit(e.target.value as 'in' | 'mm')}
                            sx={{ justifyContent: 'center' }}
                          >
                            <FormControlLabel value="in" control={<Radio size="small" />} label="in" />
                            <FormControlLabel value="mm" control={<Radio size="small" />} label="mm" />
                          </RadioGroup>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <Box display="flex" flexDirection="column" gap={1}>
                          <TextField
                            fullWidth
                            label="Max Weight"
                            type="number"
                            value={newPallet.maxWeight}
                            onChange={(e) => setNewPallet((p) => ({
                              ...p,
                              maxWeight: parseFloat(e.target.value) || 0
                            }))}
                            onBlur={() => setTouched((t) => ({ ...t, maxWeight: true }))}
                            error={!!touched.maxWeight && !!errors.maxWeight}
                            helperText={touched.maxWeight && errors.maxWeight}
                            inputProps={{ step: 'any' }}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Box display="flex" flexDirection="column" sx={{ mr: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        setNewPallet((p) => ({
                                          ...p,
                                          maxWeight: p.maxWeight + 1
                                        }))
                                      }
                                      sx={{
                                        padding: 0.25,
                                        '&:hover': { background: alpha(brand.primary, 0.1) }
                                      }}
                                    >
                                      <KeyboardArrowUpIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        setNewPallet((p) => ({
                                          ...p,
                                          maxWeight: Math.max(0, p.maxWeight - 1)
                                        }))
                                      }
                                      sx={{
                                        padding: 0.25,
                                        '&:hover': { background: alpha(brand.primary, 0.1) }
                                      }}
                                    >
                                      <KeyboardArrowDownIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                                  <Typography variant="caption">
                                    {weightUnit === 'lb' ? 'lbs' : 'kg'}
                                  </Typography>
                                </InputAdornment>
                              )
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                background: alpha('#fff', 0.9)
                              },
                              '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0
                              },
                              '& input[type=number]': {
                                MozAppearance: 'textfield'
                              }
                            }}
                          />
                          <FormControl component="fieldset">
                            <RadioGroup
                              row
                              value={weightUnit}
                              onChange={(e) => setWeightUnit(e.target.value as 'lb' | 'kg')}
                              sx={{ justifyContent: 'center' }}
                            >
                              <FormControlLabel value="lb" control={<Radio size="small" />} label="lbs" />
                              <FormControlLabel value="kg" control={<Radio size="small" />} label="kg" />
                            </RadioGroup>
                          </FormControl>
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          startIcon={<AddIcon />}
                          fullWidth
                          disabled={!isValid}
                          sx={{
                            borderRadius: 2,
                            py: 1.25,
                            textTransform: 'none',
                            fontWeight: 700,
                            background: brand.primaryG,
                            '&:hover': {
                              background: brand.primaryG,
                              transform: 'translateY(-1px)',
                              boxShadow: `0 10px 26px ${alpha(brand.primary, 0.35)}`
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          Add Configuration
                        </Button>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Button
                          variant="outlined"
                          onClick={openList}
                          fullWidth
                          sx={{
                            borderRadius: 2,
                            py: 1.25,
                            textTransform: 'none',
                            fontWeight: 700,
                            background: alpha('#FFFFFF', 0.8),
                            borderColor: brand.cardBorder,
                            '&:hover': { background: alpha('#FFFFFF', 0.95) }
                          }}
                        >
                          View Saved Pallets
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </Paper>

                <Box sx={{ flex: 1, minHeight: 0 }} />
              </CardContent>
            </Card>
          </Grid>

          {/* Right: Live 3D Preview (hidden on md) */}
          <Grid size={{ xs: 12, lg: 5 }} sx={{ height: '100%', display: isMd ? 'none' : 'block' }}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                background: brand.cardBg,
                border: `1px solid ${brand.cardBorder}`,
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardHeader
                sx={{ pb: 1.5 }}
                title={<Typography variant="h6" fontWeight={700}>3D Preview</Typography>}
                subheader={<Typography variant="body2">Preview updates as you type</Typography>}
              />
              <CardContent sx={{ pt: 0, flex: 1, minHeight: 320 }}>
                <Box
                  sx={{
                    height: '100%',
                    minHeight: 360,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${brand.cardBorder}`
                  }}
                >
                  <PalletPreview3D width={previewWidthIn} depth={previewDepthIn} />
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={`L × W: ${newPallet.width} × ${newPallet.depth} ${lengthUnit}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`Max: ${newPallet.maxWeight} ${weightUnit}`}
                    color="primary"
                    variant="filled"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Saved Pallets Modal */}
      <Dialog
        open={listOpen}
        onClose={closeList}
        fullWidth
        maxWidth="md"
        fullScreen={fullScreenDialog}
        PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 2 } }}
      >
        <DialogTitle>
          Saved Pallets ({filteredPallets.length}{modalSearch ? ` / ${palletConfigs.length}` : ''})
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: { xs: 2, md: 3 },
            '&.MuiDialogContent-root': { overflowY: 'auto' }
          }}
        >
          <TextField
            fullWidth
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            placeholder='Search name or dimensions (e.g., "euro", "48x40", "48 40", "max 2000")'
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                background: alpha('#FFFFFF', 0.9)
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: modalSearch ? (
                <InputAdornment position="end">
                  <Tooltip title="Clear">
                    <IconButton size="small" onClick={() => setModalSearch('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : null
            }}
          />

          <Stack
            spacing={1.5}
            sx={{
              maxHeight: { xs: '65vh', sm: '70vh', md: '60vh' },
              overflowY: 'auto',
              pr: 0.5
            }}
          >
            {filteredPallets.length === 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 2,
                  border: `1px dashed ${brand.cardBorder}`,
                  background: alpha('#FFFFFF', 0.7)
                }}
              >
                <Typography variant="body2">No pallets match your search.</Typography>
              </Paper>
            )}

            {filteredPallets.map((pallet: any, index: number) => {
              const lenUnit: 'in' | 'mm' = pallet.lengthUnit ? pallet.lengthUnit : 'in';
              const displayWidth =
                lenUnit === 'in' ? pallet.width : Math.round(inToMm(pallet.width ?? 0));
              const displayDepth =
                lenUnit === 'in' ? pallet.depth : Math.round(inToMm(pallet.depth ?? 0));
              const dimSuffix = lenUnit === 'in' ? '"' : ` ${lenUnit}`;

              return (
                <Fade in timeout={200 + index * 70} key={pallet.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      background: alpha('#FFFFFF', 0.92),
                      border: `1px solid ${brand.cardBorder}`,
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box flex={1} minWidth={0}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          noWrap
                          title={pallet.name}
                        >
                          {pallet.name}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={`${displayWidth}×${displayDepth} ${lenUnit === 'mm' ? 'mm' : ''}`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Max: ${
                              pallet.maxWeight ??
                              (pallet.maxWeightKg
                                ? pallet.maxWeightUnit
                                  ? `${pallet.maxWeight} ${pallet.maxWeightUnit}`
                                  : `${Math.round(kgToLbs(pallet.maxWeightKg))} lbs`
                                : '—')
                            }`}
                            color="primary"
                            variant="filled"
                          />
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={0.5} flexShrink={0}>
                        <Tooltip title="Edit">
                          <IconButton
                            onClick={() => openEdit(pallet)}
                            sx={{ '&:hover': { transform: 'scale(1.06)' } }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => removePalletConfig(pallet.id)}
                            color="error"
                            sx={{
                              '&:hover': {
                                transform: 'scale(1.06)',
                                background: alpha(brand.danger, 0.12)
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </Paper>
                </Fade>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeList} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onClose={closeEdit}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreenDialog}
        PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 2 } }}
      >
        <DialogTitle>Edit Pallet</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Pallet Name"
              value={editData.name}
              onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
              fullWidth
            />
            {/* aligned fields: Length / Width / Max Weight (with unit radios) */}
            <Grid container spacing={1} alignItems="center">
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Length"
                  type="number"
                  size="small"
                  fullWidth
                  value={editData.width}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      width: parseFloat(e.target.value) || 0
                    }))
                  }
                  inputProps={{ min: 0, step: 0.1 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Width"
                  type="number"
                  size="small"
                  fullWidth
                  value={editData.depth}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      depth: parseFloat(e.target.value) || 0
                    }))
                  }
                  inputProps={{ min: 0, step: 0.1 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl component="fieldset" sx={{ ml: 0, mt: 1 }}>
                  <RadioGroup
                    row
                    value={editData.lengthUnit ?? 'in'}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        lengthUnit: e.target.value as 'in' | 'mm'
                      }))
                    }
                  >
                    <FormControlLabel value="in" control={<Radio size="small" />} label="in" />
                    <FormControlLabel value="mm" control={<Radio size="small" />} label="mm" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Box display="flex" gap={1} alignItems="center" sx={{ width: '100%' }}>
                  <TextField
                    label="Max Weight"
                    type="number"
                    size="small"
                    fullWidth
                    value={editData.maxWeight}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        maxWeight: parseFloat(e.target.value) || 0
                      }))
                    }
                    inputProps={{ min: 0, step: 'any' }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                  <FormControl
                    component="fieldset"
                    sx={{ ml: 1, display: 'flex', alignItems: 'center', height: '100%' }}
                  >
                    <RadioGroup
                      row
                      value={editData.maxWeightUnit ?? 'lb'}
                      onChange={(e) =>
                        setEditData((d) => ({
                          ...d,
                          maxWeightUnit: e.target.value as 'lb' | 'kg'
                        }))
                      }
                    >
                      <FormControlLabel value="lb" control={<Radio size="small" />} label="lbs" />
                      <FormControlLabel value="kg" control={<Radio size="small" />} label="kg" />
                    </RadioGroup>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>

            {/* <Typography variant="caption">
              Note: pallet height is fixed to {PALLET_HEIGHT}" and is preserved for existing saved pallets.
            </Typography> */}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} variant="text">Cancel</Button>
          <Button onClick={saveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Pallet added successfully.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PalletConfigurationPage;
