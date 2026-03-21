"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createPileItTheme } from "@/theme/theme";
import AuthProvider from "@/providers/AuthProvider";
import PortalProvider from "@/providers/PortalProvider";
import DetailModalProvider from "@/providers/DetailModalProvider";

const theme = createPileItTheme();

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider options={{ key: "mui", enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <PortalProvider>
            <DetailModalProvider>{children}</DetailModalProvider>
          </PortalProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
