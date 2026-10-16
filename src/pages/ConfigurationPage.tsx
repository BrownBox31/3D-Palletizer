import React, { useState } from 'react';
import { useAppStore } from '../store/store';

// MUI Components
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  IconButton,
  Box,
  Chip,
  Stack,
  Paper,
  Avatar,
  Fade,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

// MUI Icons
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import ScaleIcon from '@mui/icons-material/Scale';
import StraightenIcon from '@mui/icons-material/Straighten';
import HeightIcon from '@mui/icons-material/Height';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { brand } from '../ui/brand';

interface NewPalletState {
  name: string;
  width: number;
  depth: number;
  height: number;
  maxWeight: number;
}

interface NewBoxState {
  name: string;
  width: number;
  depth: number;
  height: number;
  weight: number;
}

const ConfigurationPage: React.FC = () => {
  const {
    palletConfigs,
    boxConfigs,
    addPalletConfig,
    addBoxConfig,
    removePalletConfig,
    removeBoxConfig,
  } = useAppStore();

  const [newPallet, setNewPallet] = useState<NewPalletState>({
    name: '',
    width: 48,
    depth: 40,
    height: 2.5,
    maxWeight: 2000,
  });

  const [newBox, setNewBox] = useState<NewBoxState>({
    name: '',
    width: 8,
    depth: 10,
    height: 5,
    weight: 25,
  });

  const handleAddPallet = (e: React.FormEvent): void => {
    e.preventDefault();
    if (newPallet.name.trim()) {
      addPalletConfig(newPallet);
      setNewPallet({ name: '', width: 48, depth: 40, height: 2.5, maxWeight: 2000 });
    }
  };

  const handleAddBox = (e: React.FormEvent): void => {
    e.preventDefault();
    if (newBox.name.trim()) {
      addBoxConfig(newBox);
      setNewBox({ name: '', width: 8, depth: 10, height: 5, weight: 25 });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: brand.pageBg,
        py: { xs: 3, md: 4 },
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={3} alignItems="stretch">
          {/* Pallet Configurations */}
          <Grid size={{ xs: 12, sm: 6, md: 5 }}>
            <Card
              elevation={0}
              sx={{
                background: brand.cardBg,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${brand.cardBorder}`,
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardHeader
                sx={{ pb: 1.5 }}
                avatar={
                  <Avatar sx={{ background: brand.primaryG }}>
                    <ViewInArIcon />
                  </Avatar>
                }
                title={
                  <Typography variant="h5" fontWeight={700}>
                    Pallet Configurations
                  </Typography>
                }
                subheader="Define your pallet specifications and weight limits"
              />

              <CardContent sx={{ pt: 0, pb: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Add Pallet Form */}
                <Paper
                  elevation={0}
                  component="form"
                  onSubmit={handleAddPallet}
                  sx={{
                    p: 2.5,
                    mb: 3,
                    background: alpha('#F6F8FB', 0.9),
                    border: `1px solid ${alpha('#E2E8F0', 0.7)}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Add New Pallet
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Pallet Name"
                        value={newPallet.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPallet((p) => ({ ...p, name: e.target.value }))
                        }
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            background: alpha('#FFFFFF', 0.9),
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Length"
                        type="number"
                        value={newPallet.width}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPallet((p) => ({ ...p, width: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Length (X-axis)">
                                <StraightenIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.9) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Width"
                        type="number"
                        value={newPallet.depth}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPallet((p) => ({ ...p, depth: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Width (Z-axis)">
                                <StraightenIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.9) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Height"
                        type="number"
                        value={newPallet.height}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPallet((p) => ({ ...p, height: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Height (Y-axis)">
                                <HeightIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.9) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Max Weight"
                        type="number"
                        value={newPallet.maxWeight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPallet((p) => ({ ...p, maxWeight: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Maximum weight capacity">
                                <ScaleIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.9) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<AddIcon />}
                        fullWidth
                        sx={{
                          borderRadius: 2,
                          py: 1.25,
                          textTransform: 'none',
                          fontWeight: 700,
                          background: brand.primaryG,
                          '&:hover': {
                            background: brand.primaryG,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 10px 26px ${alpha(brand.primary, 0.35)}`,
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        Add Pallet Configuration
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Pallet List (display + delete only) */}
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Saved Pallets ({palletConfigs.length})
                </Typography>

                <Stack
                  spacing={1.5}
                  sx={{
                    maxHeight: { xs: 300, md: 380 },
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  {palletConfigs.map((pallet, index) => (
                    <Fade in timeout={300 + index * 100} key={pallet.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 1,
                          background: alpha('#FFFFFF', 0.92),
                          border: `1px solid ${brand.cardBorder}`,
                          borderRadius: 2,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                          },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {pallet.name}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip size="small" label={`${pallet.width}×${pallet.depth}×${pallet.height}"`} variant="outlined" />
                              <Chip size="small" label={`Max: ${pallet.maxWeight} lbs`} color="primary" variant="filled" />
                            </Stack>
                          </Box>
                          <IconButton
                            onClick={() => removePalletConfig(pallet.id)}
                            color="error"
                            sx={{
                              '&:hover': {
                                transform: 'scale(1.06)',
                                background: alpha(brand.danger, 0.12),
                              },
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Paper>
                    </Fade>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Item Configurations */}
          <Grid size={{ xs: 12, sm: 6, md: 5 }}>
            <Card
              elevation={0}
              sx={{
                background: brand.cardBg,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${brand.cardBorder}`,
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardHeader
                sx={{ pb: 1.5 }}
                avatar={
                  <Avatar sx={{ background: brand.successG }}>
                    <AllInboxIcon />
                  </Avatar>
                }
                title={
                  <Typography variant="h5" fontWeight={700}>
                    Item Configurations
                  </Typography>
                }
                subheader="Define your box types and their properties"
              />

              <CardContent sx={{ pt: 0, pb: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Add Box Form */}
                <Paper
                  elevation={0}
                  component="form"
                  onSubmit={handleAddBox}
                  sx={{
                    p: 2.5,
                    mb: 3,
                    background: alpha('#ECFEF4', 0.9),
                    border: `1px solid ${alpha('#DCFCE7', 0.9)}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Add New Item Type
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Item Name"
                        value={newBox.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewBox((b) => ({ ...b, name: e.target.value }))
                        }
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#FFFFFF', 0.92) },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Length"
                        type="number"
                        value={newBox.width}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewBox((b) => ({ ...b, width: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Length (X-axis)">
                                <StraightenIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.92) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Width"
                        type="number"
                        value={newBox.depth}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewBox((b) => ({ ...b, depth: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Width (Z-axis)">
                                <StraightenIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.92) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Height"
                        type="number"
                        value={newBox.height}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewBox((b) => ({ ...b, height: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Height (Y-axis)">
                                <HeightIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.92) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Weight"
                        type="number"
                        value={newBox.weight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewBox((b) => ({ ...b, weight: parseFloat(e.target.value) || 0 }))
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Box weight">
                                <FitnessCenterIcon fontSize="small" color="action" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: alpha('#fff', 0.92) } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<AddIcon />}
                        fullWidth
                        sx={{
                          borderRadius: 2,
                          py: 1.25,
                          textTransform: 'none',
                          fontWeight: 700,
                          background: brand.successG,
                          '&:hover': {
                            background: brand.successG,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 10px 26px ${alpha(brand.success, 0.35)}`,
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        Add Item Type
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Box List (display + delete only) */}
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Saved Items ({boxConfigs.length})
                </Typography>

                <Stack
                  spacing={1.5}
                  sx={{
                    maxHeight: { xs: 300, md: 380 },
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  {boxConfigs.map((box, index) => (
                    <Fade in timeout={300 + index * 100} key={box.id}>
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
                            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                          },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {box.name}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip size="small" label={`${box.width}×${box.depth}×${box.height}"`} variant="outlined" />
                              <Chip size="small" label={`${box.weight} lbs`} color="success" variant="filled" />
                            </Stack>
                          </Box>
                          <IconButton
                            onClick={() => removeBoxConfig(box.id)}
                            color="error"
                            sx={{
                              '&:hover': {
                                transform: 'scale(1.06)',
                                background: alpha('#EF4444', 0.12),
                              },
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Paper>
                    </Fade>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ConfigurationPage;
