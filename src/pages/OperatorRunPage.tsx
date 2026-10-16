import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  PlayArrow,
  Stop,
  Pause,
  CheckCircle,
  WarningAmber,
} from '@mui/icons-material';
import { brand } from '../ui/brand';
import { useAppStore } from '../store/store';
import EmptyState from '../components/EmptyState';
import { useNavigate } from 'react-router-dom';

type RunStatus = 'idle' | 'running' | 'paused' | 'complete';

const OperatorRunPage: React.FC = () => {
  const navigate = useNavigate();
  const builds = useAppStore((s) => s.savedPalletBuilds);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [cycle, setCycle] = useState(0);

  const selected = useMemo(
    () => builds.find((b) => b.id === selectedId),
    [builds, selectedId]
  );

  const statusMeta = {
    idle: { label: 'READY', color: brand.muted, hint: 'Select a recipe and press Start' },
    running: { label: 'RUNNING', color: brand.emerald, hint: 'Simulated production cycle in progress' },
    paused: { label: 'PAUSED', color: brand.amber, hint: 'Line paused — press Start to resume' },
    complete: { label: 'COMPLETE', color: brand.primary, hint: 'Cycle finished — ready for next batch' },
  }[status];

  const start = () => {
    if (!selected) return;
    setStatus('running');
    setCycle((c) => c + 1);
  };

  const pause = () => setStatus('paused');
  const stop = () => {
    setStatus('idle');
  };
  const complete = () => setStatus('complete');

  return (
      <Box
        sx={{
          height: '100%',
          minHeight: 0,
          overflow: 'auto',
          px: { xs: 1.5, md: 2.5 },
          py: { xs: 1.5, md: 2 },
          background: `
            radial-gradient(800px 360px at 10% 0%, ${alpha(brand.emerald, 0.1)}, transparent 50%),
            ${brand.pageBg}
          `,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
            gap: 2.5,
            maxWidth: 1200,
          }}
        >
          {/* Recipe picker */}
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 3,
              border: `1px solid ${brand.cardBorder}`,
              background: alpha('#fff', 0.94),
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: brand.ink, mb: 0.5 }}>
              Production / Run
            </Typography>
            <Typography sx={{ color: brand.muted, fontSize: 14, mb: 2.5 }}>
              Operator view — load a saved pallet build recipe and control the line. (UI simulation only)
            </Typography>

            {builds.length === 0 ? (
              <EmptyState
                compact
                title="No recipes yet"
                description="Compose and save a pallet build first, then return here to run it."
                actionLabel="Open Build Composer"
                onAction={() => navigate('/build-composer')}
                icon={<WarningAmber />}
              />
            ) : (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="recipe-label">Recipe (saved build)</InputLabel>
                  <Select
                    labelId="recipe-label"
                    label="Recipe (saved build)"
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value as number);
                      setStatus('idle');
                    }}
                    sx={{ minHeight: 52 }}
                  >
                    {builds.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.name} — {b.totalLayers} layers / {Math.round(b.totalWeight)} wt
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selected && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(brand.primary, 0.04),
                      border: `1px solid ${alpha(brand.primary, 0.12)}`,
                      mb: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 800, mb: 1 }}>{selected.name}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip size="small" label={`Pallet: ${selected.pallet?.name ?? '—'}`} />
                      <Chip size="small" label={`${selected.totalLayers} layers`} />
                      <Chip size="small" label={`Weight ${Math.round(selected.totalWeight)}`} />
                    </Box>
                  </Box>
                )}

                {/* Big HMI controls */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.25,
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow sx={{ fontSize: 28 }} />}
                    disabled={!selected || status === 'running'}
                    onClick={start}
                    sx={{
                      minHeight: 64,
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      bgcolor: brand.emerald,
                      background: brand.successG,
                      gridColumn: { sm: '1 / -1' },
                    }}
                  >
                    Start
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Pause />}
                    disabled={status !== 'running'}
                    onClick={pause}
                    sx={{ minHeight: 56, fontWeight: 800 }}
                  >
                    Pause
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Stop />}
                    disabled={status === 'idle'}
                    onClick={stop}
                    sx={{ minHeight: 56, fontWeight: 800 }}
                  >
                    Stop
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<CheckCircle />}
                    disabled={status !== 'running'}
                    onClick={complete}
                    sx={{ minHeight: 48, fontWeight: 700, gridColumn: { sm: '1 / -1' } }}
                  >
                    Mark cycle complete (demo)
                  </Button>
                </Box>
              </>
            )}
          </Box>

          {/* Status board */}
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 3,
              border: `1px solid ${brand.cardBorder}`,
              background: `linear-gradient(160deg, ${brand.navy} 0%, ${brand.deepBlue} 100%)`,
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 360,
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: alpha('#fff', 0.55),
                mb: 1,
              }}
            >
              Line status
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.4rem', md: '3rem' },
                letterSpacing: '-0.03em',
                color: statusMeta.color === brand.muted ? '#fff' : statusMeta.color,
                mb: 1,
              }}
            >
              {statusMeta.label}
            </Typography>
            <Typography sx={{ color: alpha('#fff', 0.7), mb: 3 }}>{statusMeta.hint}</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 'auto' }}>
              {[
                { k: 'Recipe', v: selected?.name ?? '—' },
                { k: 'Cycle #', v: String(cycle) },
                { k: 'Layers', v: selected ? String(selected.totalLayers) : '—' },
                { k: 'Mode', v: 'Simulation' },
              ].map((row) => (
                <Box
                  key={row.k}
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    bgcolor: alpha('#fff', 0.08),
                    border: `1px solid ${alpha('#fff', 0.12)}`,
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: alpha('#fff', 0.5), textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {row.k}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.35 }}>{row.v}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
  );
};

export default OperatorRunPage;
