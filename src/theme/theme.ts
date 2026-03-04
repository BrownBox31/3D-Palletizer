// src/theme.ts
import { createTheme } from "@mui/material/styles";

export const simplify = {
  primary: "#3B82F6",
  secondary: "#7C3AED",
  success: "#10B981",
  warning: "#F59E0B",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F7FA",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",

  gradients: {
    primary: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    success: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    secondary: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
    warning: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    brand:   "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
  },
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: simplify.primary },
    secondary: { main: simplify.secondary },
    success: { main: simplify.success },
    warning: { main: simplify.warning },
    text: {
      primary: simplify.textPrimary,
      secondary: simplify.textSecondary,
    },
    background: {
      default: simplify.surfaceAlt,
      paper: simplify.surface,
    },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 12, textTransform: "none", fontWeight: 600 } } },
  },
});

export default theme;
