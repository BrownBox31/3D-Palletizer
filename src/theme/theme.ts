import { createTheme, alpha } from '@mui/material/styles';
import { brand } from '../ui/brand';

declare module '@mui/material/styles' {
  interface Palette {
    brand: {
      deepBlue: string;
      emerald: string;
      amber: string;
      violet: string;
      navy: string;
    };
  }
  interface PaletteOptions {
    brand?: {
      deepBlue?: string;
      emerald?: string;
      amber?: string;
      violet?: string;
      navy?: string;
    };
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brand.primary,
      dark: brand.deepBlue,
      light: '#4B6FE8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: brand.emerald,
      dark: '#059669',
      light: '#34D399',
      contrastText: '#FFFFFF',
    },
    success: { main: brand.success },
    warning: { main: brand.warning },
    error: { main: brand.danger },
    info: { main: brand.accent },
    text: {
      primary: brand.ink,
      secondary: brand.muted,
    },
    divider: brand.border,
    background: {
      default: brand.surfaceAlt,
      paper: brand.surface,
    },
    brand: {
      deepBlue: brand.deepBlue,
      emerald: brand.emerald,
      amber: brand.amber,
      violet: brand.violet,
      navy: brand.navy,
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 800, letterSpacing: '-0.015em' },
    h4: { fontWeight: 800, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: {
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '0.01em',
    },
    body1: { lineHeight: 1.55 },
    body2: { lineHeight: 1.5 },
  },
  shape: { borderRadius: brand.radiusMd },
  shadows: [
    'none',
    brand.shadowSm,
    brand.shadowSm,
    brand.shadowMd,
    brand.shadowMd,
    brand.shadowMd,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
    brand.shadowLg,
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { height: '100%', overflow: 'hidden' },
        body: {
          height: '100%',
          margin: 0,
          overflow: 'hidden',
          background: brand.pageBg,
          color: brand.ink,
        },
        '#root': {
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        },
        '*, *::before, *::after': { boxSizing: 'border-box' },
        a: { color: 'inherit' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: brand.radiusMd,
          textTransform: 'none',
          fontWeight: 700,
          paddingInline: 16,
          minHeight: 44, // touch / HMI friendly default
        },
        containedPrimary: {
          background: brand.primaryG,
          boxShadow: brand.shadowPrimary,
          '&:hover': {
            background: brand.primaryG,
            filter: 'brightness(1.05)',
            boxShadow: brand.shadowPrimary,
          },
        },
        outlined: {
          borderColor: brand.border,
          '&:hover': {
            borderColor: alpha(brand.primary, 0.45),
            background: alpha(brand.primary, 0.04),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: brand.radiusLg,
          border: `1px solid ${brand.cardBorder}`,
          background: brand.cardBg,
          backdropFilter: 'blur(12px)',
          boxShadow: brand.shadowSm,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: brand.radiusLg,
        },
        outlined: {
          borderColor: brand.cardBorder,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: brand.radiusMd,
          backgroundColor: alpha('#FFFFFF', 0.9),
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(brand.primary, 0.4),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: brand.primary,
            borderWidth: 1.5,
          },
        },
        notchedOutline: {
          borderColor: brand.border,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 999,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: brand.radiusXl,
          border: `1px solid ${brand.cardBorder}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: brand.surfaceAlt,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: brand.navy,
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: brand.radiusMd,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: brand.radiusSm,
        },
      },
    },
  },
});

export default theme;
export { brand };
