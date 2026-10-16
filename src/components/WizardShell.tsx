import React from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { brand } from '../ui/brand';
import { WORKFLOW_STEPS, getAdjacentSteps } from '../ui/workflow';

type WizardShellProps = {
  children: React.ReactNode;
  /** Hide bottom nav (useful for fullscreen 3D pages that have their own chrome) */
  compact?: boolean;
};

export default function WizardShell({ children, compact = false }: WizardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { current, prev, next } = getAdjacentSteps(location.pathname);

  if (!current) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </Box>
    );
  }

  const progress = (current.index / WORKFLOW_STEPS.length) * 100;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Compact step rail for tablet */}
      <Box
        sx={{
          flexShrink: 0,
          zIndex: 20,
          borderBottom: `1px solid ${brand.cardBorder}`,
          background: alpha('#fff', 0.97),
          px: { xs: 1.25, md: 2 },
          pt: 0.75,
          pb: 0.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: brand.muted,
                lineHeight: 1.2,
              }}
            >
              Step {current.index} of {WORKFLOW_STEPS.length}
            </Typography>
            <Typography sx={{ fontWeight: 800, color: brand.ink, fontSize: '0.95rem', lineHeight: 1.2 }}>
              {current.label}
            </Typography>
          </Box>
          <Typography
            sx={{
              display: { xs: 'none', md: 'block' },
              color: brand.muted,
              fontSize: 12,
              maxWidth: 280,
              textAlign: 'right',
            }}
          >
            {current.description}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            borderRadius: 99,
            bgcolor: alpha(brand.primary, 0.1),
            mb: 0.75,
            '& .MuiLinearProgress-bar': {
              borderRadius: 99,
              background: brand.primaryG,
            },
          }}
        />

        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            overflowX: 'auto',
            pb: 0.25,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {WORKFLOW_STEPS.map((step) => {
            const active = step.id === current.id;
            const done = step.index < current.index;
            return (
              <Button
                key={step.id}
                size="small"
                onClick={() => navigate(step.path)}
                sx={{
                  minHeight: 34,
                  minWidth: 'auto',
                  px: 1.25,
                  flexShrink: 0,
                  borderRadius: 1.25,
                  fontWeight: 700,
                  fontSize: 11,
                  color: active ? '#fff' : done ? brand.primary : brand.muted,
                  bgcolor: active ? brand.primary : done ? alpha(brand.primary, 0.08) : 'transparent',
                  border: `1px solid ${active ? brand.primary : done ? alpha(brand.primary, 0.2) : brand.border}`,
                  '&:hover': {
                    bgcolor: active ? brand.primary : alpha(brand.primary, 0.1),
                  },
                }}
              >
                {step.index}. {step.short}
              </Button>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>

      {!compact && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${brand.cardBorder}`,
            background: alpha('#fff', 0.97),
            px: { xs: 1.5, md: 2 },
            py: 1,
            display: 'flex',
            gap: 1,
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            disabled={!prev}
            onClick={() => prev && navigate(prev.path)}
            sx={{ minHeight: 44, minWidth: 120, fontWeight: 800 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            disabled={!next}
            onClick={() => next && navigate(next.path)}
            sx={{ minHeight: 44, minWidth: 140, fontWeight: 800 }}
          >
            {next ? `Next: ${next.short}` : 'Done'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
