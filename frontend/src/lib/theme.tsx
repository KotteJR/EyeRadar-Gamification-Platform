"use client";

import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode } from "react";

/**
 * EyeRadar Kid-Friendly Theme
 * 
 * Clean, white-friendly design that's approachable for kids aged 4-14
 * but still looks like a professional medical/educational platform.
 * 
 * Inspired by Duolingo, Khan Academy Kids, and Material Design 3.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#FF5A39",
      light: "#FF9E75",
      dark: "#E04525",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#475093",
      light: "#6B74B5",
      dark: "#303FAE",
      contrastText: "#ffffff",
    },
    success: {
      main: "#34D399",
      light: "#A7F3D0",
      dark: "#059669",
    },
    warning: {
      main: "#FBBF24",
      light: "#FDE68A",
      dark: "#D97706",
    },
    error: {
      main: "#EF4444",
      light: "#FCA5A5",
      dark: "#DC2626",
    },
    info: {
      main: "#5EB8FB",
      light: "#BFDBFE",
      dark: "#2563EB",
    },
    background: {
      default: "#F9FAFB",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1F2937",
      secondary: "#6B7280",
    },
  },
  typography: {
    fontFamily: "'Nunito', 'Quicksand', 'Inter', system-ui, sans-serif",
    h1: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600 },
    h4: { fontFamily: "'Nunito', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Nunito', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Nunito', sans-serif", fontWeight: 700 },
    button: { fontFamily: "'Nunito', sans-serif", fontWeight: 700, textTransform: "none" },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          padding: "10px 24px",
          fontSize: "0.95rem",
          boxShadow: "none",
          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
        },
        sizeLarge: {
          padding: "14px 32px",
          fontSize: "1.1rem",
          minHeight: 52,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #F3F4F6",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 10,
        },
      },
    },
  },
});

export function KidsThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
