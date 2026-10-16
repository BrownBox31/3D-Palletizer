import { alpha } from '@mui/material/styles';

/**
 * StackIt / Brown Box design tokens.
 * Single source of truth for colors, gradients, surfaces, and elevation.
 */
export const brand = {
  // Core palette
  primary: '#1E4ED8',
  primaryBlue: '#1E4ED8',
  deepBlue: '#173E9E',
  navy: '#0B1F4A',
  accent: '#0F4CFF',
  emerald: '#10B981',
  success: '#10B981',
  amber: '#F59E0B',
  warning: '#F59E0B',
  violet: '#7C3AED',
  danger: '#EF4444',
  error: '#EF4444',

  // Neutrals
  ink: '#0F172A',
  muted: '#64748B',
  border: '#E6EEF5',
  cardBorder: '#E6EEF5',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8FB',
  soft: '#EDF2F7',

  // Surfaces (with translucency for glass cards)
  cardBg: alpha('#FFFFFF', 0.94),

  // Gradients
  primaryG: 'linear-gradient(135deg, #2A5BFF 0%, #1E4ED8 100%)',
  headerGrad: 'linear-gradient(180deg, #173E9E 0%, #1E4ED8 100%)',
  navGrad: 'linear-gradient(90deg, #0F4CFF 0%, #0A3EDB 55%, #022B95 100%)',
  successG: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  secondaryG: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  warningG: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  softBg: 'linear-gradient(135deg, #F6F8FB 0%, #EDF2F7 100%)',
  pageBg: 'linear-gradient(160deg, #F4F7FB 0%, #E8EEF6 48%, #DCE6F2 100%)',

  // Nav chrome
  navRing: 'rgba(255,255,255,0.28)',
  navActive: 'rgba(255,255,255,0.16)',
  navHover: 'rgba(255,255,255,0.22)',

  // Elevation
  shadowSm: '0 4px 14px rgba(15, 23, 42, 0.06)',
  shadowMd: '0 10px 28px rgba(15, 23, 42, 0.10)',
  shadowLg: '0 18px 40px rgba(15, 23, 42, 0.14)',
  shadowPrimary: '0 10px 26px rgba(30, 78, 216, 0.32)',

  // Shape
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
} as const;

export type BrandTokens = typeof brand;

/** Convenience helper for translucent brand colors */
export const brandAlpha = (color: string, opacity: number) => alpha(color, opacity);
