"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import HomeIcon from "@mui/icons-material/Home";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import PeopleIcon from "@mui/icons-material/People";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useAuth } from "@/providers/AuthProvider";
import { PILEIT_THEME } from "@/theme/theme";
import { IMG } from "@/lib/imageUrls";
import { getApiBase } from "@/lib/api";
import { safeMapApiCreators, type ApiCreatorRow } from "@/lib/mapApiCreator";
import { allowMockCatalogFallback } from "@/lib/mockCatalog";
import { mockCreators } from "@/data/mock";
import type { Creator } from "@/types/content";

const SIDEBAR_WIDTH = 220;

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
  show?: boolean;
};

function NavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <Box
      component={Link}
      href={item.href}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        textDecoration: "none",
        color: active ? PILEIT_THEME.accent : PILEIT_THEME.textSecondary,
        bgcolor: active ? "rgba(249, 115, 22, 0.12)" : "transparent",
        fontWeight: active ? 700 : 500,
        fontSize: 14,
        transition: "all 0.15s ease",
        "&:hover": {
          bgcolor: active
            ? "rgba(249, 115, 22, 0.16)"
            : "rgba(255, 255, 255, 0.06)",
          color: active ? PILEIT_THEME.accent : PILEIT_THEME.textPrimary,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          color: active ? PILEIT_THEME.accent : PILEIT_THEME.textSecondary,
          "& svg": { fontSize: 22 },
        }}
      >
        {item.icon}
      </Box>
      {item.label}
    </Box>
  );
}

function CreatorCircle({ creator }: { creator: Creator }) {
  return (
    <Tooltip title={creator.displayName} placement="right" arrow>
      <Box
        component={Link}
        href={`/creator/${encodeURIComponent(creator.handle)}`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.5,
          py: 0.75,
          borderRadius: 1.5,
          textDecoration: "none",
          color: PILEIT_THEME.textSecondary,
          transition: "all 0.15s ease",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.06)",
            color: PILEIT_THEME.textPrimary,
          },
        }}
      >
        <Avatar
          src={creator.avatarUrl ? IMG.avatar(creator.avatarUrl) : undefined}
          alt=""
          sx={{
            width: 28,
            height: 28,
            fontSize: "0.7rem",
            border: `2px solid ${creator.accentColor || PILEIT_THEME.accent}`,
          }}
        >
          {creator.displayName.slice(0, 1).toUpperCase()}
        </Avatar>
        <Typography
          variant="body2"
          noWrap
          sx={{
            fontSize: 13,
            fontWeight: 500,
            flex: 1,
            minWidth: 0,
          }}
        >
          {creator.displayName}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [showAllCreators, setShowAllCreators] = useState(false);

  useEffect(() => {
    const base = getApiBase();
    fetch(`${base}/creators`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: ApiCreatorRow[]) => {
        if (Array.isArray(rows)) setCreators(safeMapApiCreators(rows));
      })
      .catch(() => {
        if (allowMockCatalogFallback()) setCreators(mockCreators);
      });
  }, []);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      {
        label: "Home",
        href: "/",
        icon: <HomeIcon />,
        match: (p) => p === "/" || p === "/browse",
      },
      { label: "Live", href: "/live", icon: <LiveTvIcon /> },
      { label: "Creators", href: "/creators", icon: <PeopleIcon /> },
    ];

    if (user) {
      const isCreatorOrAdmin =
        user.accountType === "creator" || user.accountType === "admin";
      if (isCreatorOrAdmin && user.handle) {
        items.push({
          label: "My Channel",
          href: `/creator/${encodeURIComponent(user.handle)}`,
          icon: <VideoLibraryIcon />,
        });
      }
      if (isCreatorOrAdmin) {
        items.push({
          label: "Dashboard",
          href: "/dashboard",
          icon: <DashboardIcon />,
        });
      }
      if (user.accountType === "admin") {
        items.push({
          label: "Admin",
          href: "/admin",
          icon: <AdminPanelSettingsIcon />,
        });
      }
    }

    return items;
  }, [user]);

  const visibleCreators = showAllCreators ? creators : creators.slice(0, 7);

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: SIDEBAR_WIDTH,
        minWidth: SIDEBAR_WIDTH,
        height: "calc(100vh - 64px)",
        position: "sticky",
        top: 64,
        overflowY: "auto",
        overflowX: "hidden",
        bgcolor: PILEIT_THEME.bg,
        py: 1.5,
        px: 1,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        flexShrink: 0,
        scrollbarWidth: "thin",
        scrollbarColor: `${PILEIT_THEME.border} transparent`,
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": {
          background: PILEIT_THEME.border,
          borderRadius: 2,
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
        {navItems.map((item) => {
          const isActive = item.match
            ? item.match(pathname)
            : pathname.startsWith(item.href);
          return <NavLink key={item.href} item={item} active={isActive} />;
        })}
      </Box>

      {creators.length > 0 && (
        <>
          <Divider sx={{ my: 1.5, borderColor: PILEIT_THEME.border }} />
          <Typography
            variant="overline"
            sx={{
              px: 1.5,
              mb: 0.5,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: PILEIT_THEME.textSecondary,
            }}
          >
            Featured Creators
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            {visibleCreators.map((c) => (
              <CreatorCircle key={c.id} creator={c} />
            ))}
          </Box>
          {creators.length > 7 && (
            <Box
              component="button"
              onClick={() => setShowAllCreators((v) => !v)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 0.75,
                mt: 0.25,
                border: "none",
                borderRadius: 1.5,
                bgcolor: "transparent",
                color: PILEIT_THEME.textSecondary,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.06)",
                  color: PILEIT_THEME.textPrimary,
                },
              }}
            >
              {showAllCreators ? "Show less" : `Show ${creators.length - 7} more`}
            </Box>
          )}
        </>
      )}

      <Box sx={{ flex: 1 }} />

      {!user && (
        <>
          <Divider sx={{ my: 1.5, borderColor: PILEIT_THEME.border }} />
          <Box sx={{ px: 1.5, pb: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: PILEIT_THEME.textSecondary, fontSize: 13, mb: 1.5 }}
            >
              Sign in to follow creators, tip, and join The Pile.
            </Typography>
            <Box
              component={Link}
              href="/login"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 1,
                border: `1px solid ${PILEIT_THEME.accent}`,
                borderRadius: 2,
                color: PILEIT_THEME.accent,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "rgba(249, 115, 22, 0.08)",
                },
              }}
            >
              Sign in
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

export { SIDEBAR_WIDTH };
