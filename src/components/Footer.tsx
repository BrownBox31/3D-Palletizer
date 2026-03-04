import * as React from 'react';
import { Box, Typography } from '@mui/material';

const BRAND = {
    start: '#0F4CFF',
    mid: '#0A3EDB',
    end: '#f5f6f7ff',
    surface: '#F3F6FB',
    ring: 'rgba(255,255,255,0.28)',
    active: 'rgba(255,255,255,0.16)',
    hover: 'rgba(255,255,255,0.22)'
};

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                background: `linear-gradient(90deg, ${BRAND.start} 0%, ${BRAND.mid} 55%, ${BRAND.start} 100%)`,
                borderTop: `1px solid ${BRAND.mid}`,
                py: 1.25,
                px: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <Typography variant="body2" sx={{ color: BRAND.end, fontWeight: 600 }}>
                <a
                    href="https://brownboxin.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: "inherit",
                        textDecoration: "none",
                        fontWeight: 500,
                    }}
                >
                    Powered by Brown Box Innovation
                </a>
            </Typography>
        </Box>
    );
}
