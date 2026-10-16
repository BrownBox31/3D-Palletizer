import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { brand } from '../ui/brand';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 1100,
        width: '100%',
        background: brand.navGrad,
        borderTop: `1px solid ${brand.navRing}`,
        py: 1.25,
        px: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
        <a
          href="https://brownboxin.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'inherit',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Powered by Brown Box Innovations
        </a>
      </Typography>
    </Box>
  );
}
