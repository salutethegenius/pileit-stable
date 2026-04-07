import { createTheme } from "@mui/material/styles";

export const PILEIT_THEME = {
  bg: "#141414",
  surface: "#1f1f1f",
  card: "#2a2a2a",
  border: "#333333",
  accent: "#f97316",
  accentLight: "#fb923c",
  accentDark: "#c2410c",
  accentDeep: "#7c2d12",
  textPrimary: "#e5e5e5",
  textSecondary: "#999999",
  textDim: "#555555",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  red: "#ef4444",
} as const;

export function createPileItTheme() {
  return createTheme({
    palette: {
      mode: "dark",
      background: {
        default: PILEIT_THEME.bg,
        paper: PILEIT_THEME.surface,
      },
      primary: {
        main: PILEIT_THEME.accent,
        dark: PILEIT_THEME.accentDark,
        light: PILEIT_THEME.accentLight,
      },
      text: {
        primary: PILEIT_THEME.textPrimary,
        secondary: PILEIT_THEME.textSecondary,
      },
      divider: PILEIT_THEME.border,
      warning: {
        main: PILEIT_THEME.accent,
        light: PILEIT_THEME.accentLight,
        dark: PILEIT_THEME.accentDark,
        contrastText: "#1a1a1a",
      },
      success: { main: PILEIT_THEME.green },
      info: { main: PILEIT_THEME.blue },
      error: { main: PILEIT_THEME.red },
    },
    typography: {
      fontFamily:
        'var(--font-dmsans), "DM Sans", "Segoe UI", sans-serif',
      h1: {
        fontFamily:
          'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
        fontWeight: 800,
        fontStyle: "italic",
      },
      h2: {
        fontFamily:
          'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
        fontWeight: 800,
        fontStyle: "italic",
      },
      h3: {
        fontFamily:
          'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
        fontWeight: 800,
        fontStyle: "italic",
      },
      h4: {
        fontFamily:
          'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
        fontWeight: 800,
        fontStyle: "italic",
      },
      h5: {
        fontFamily:
          'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
        fontWeight: 800,
        fontStyle: "italic",
      },
      h6: {
        fontFamily:
          'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
        fontWeight: 800,
        fontStyle: "italic",
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            background: PILEIT_THEME.accent,
            "&:hover": { background: PILEIT_THEME.accentDark },
          },
        },
      },
    },
  });
}
