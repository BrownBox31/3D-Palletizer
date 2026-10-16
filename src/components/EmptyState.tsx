import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { brand } from '../ui/brand';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  compact?: boolean;
};

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  compact = false,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        px: compact ? 2 : 3,
        py: compact ? 3 : 5,
        borderRadius: 3,
        border: `1px dashed ${brand.cardBorder}`,
        background: alpha(brand.surface, 0.85),
      }}
    >
      {icon && (
        <Box
          sx={{
            width: compact ? 48 : 64,
            height: compact ? 48 : 64,
            mx: 'auto',
            mb: 1.5,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(brand.primary, 0.08),
            color: brand.primary,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography sx={{ fontWeight: 800, color: brand.ink, mb: 0.75, fontSize: compact ? '1rem' : '1.15rem' }}>
        {title}
      </Typography>
      <Typography sx={{ color: brand.muted, fontSize: 14, maxWidth: 360, mx: 'auto', mb: actionLabel ? 2 : 0 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{ minHeight: 48, px: 2.5, fontWeight: 800 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
