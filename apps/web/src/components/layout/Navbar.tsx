"use client";

import { useState } from "react";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Skeleton from "@mui/material/Skeleton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import MenuIcon from "@mui/icons-material/Menu";
import PileItLockup from "@/components/brand/PileItLockup";
import { useAuth } from "@/providers/AuthProvider";
import { PILEIT_THEME } from "@/theme/theme";

const navLinkSx = {
  color: "text.secondary",
  fontSize: 14,
  fontWeight: 600,
  "&:hover": { color: "text.primary" },
};

/** Public channel URL — same as viewers use (`/creator/[handle]`). */
function myChannelHref(handle: string) {
  return `/creator/${encodeURIComponent(handle)}`;
}

function canOpenPublicChannel(user: {
  accountType: string;
  handle: string | null;
}): user is typeof user & { handle: string } {
  if (!user.handle?.trim()) return false;
  return user.accountType === "creator" || user.accountType === "admin";
}

export default function Navbar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const { user, logout, loading: authLoading } = useAuth();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState<null | HTMLElement>(null);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        height: 64,
        backgroundColor: "rgba(20,20,20,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${PILEIT_THEME.border}`,
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: "48px" }, gap: 2 }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            lineHeight: 0,
          }}
        >
          <PileItLockup markSize={32} textSize={22} gap={32 * 0.28} />
        </Link>

        {!isMobile && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <Typography component={Link} href="/" sx={navLinkSx}>
              Browse
            </Typography>
            <Typography component={Link} href="/creators" sx={navLinkSx}>
              Creators
            </Typography>
            <Typography component={Link} href="/live" sx={navLinkSx}>
              Live
            </Typography>
            {user && canOpenPublicChannel(user) ? (
              <Typography
                component={Link}
                href={myChannelHref(user.handle)}
                sx={navLinkSx}
              >
                My channel
              </Typography>
            ) : null}
          </Box>
        )}

        {isMobile && (
          <>
            <Box sx={{ flex: 1 }} />
            <IconButton
              color="inherit"
              onClick={(e) => setMobileOpen(e.currentTarget)}
              aria-label="menu"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={mobileOpen}
              open={Boolean(mobileOpen)}
              onClose={() => setMobileOpen(null)}
            >
              <MenuItem component={Link} href="/" onClick={() => setMobileOpen(null)}>
                Browse
              </MenuItem>
              <MenuItem
                component={Link}
                href="/creators"
                onClick={() => setMobileOpen(null)}
              >
                Creators
              </MenuItem>
              <MenuItem component={Link} href="/live" onClick={() => setMobileOpen(null)}>
                Live
              </MenuItem>
              {user && canOpenPublicChannel(user) ? (
                <MenuItem
                  component={Link}
                  href={myChannelHref(user.handle)}
                  onClick={() => setMobileOpen(null)}
                >
                  My channel
                </MenuItem>
              ) : null}
              {user && (
                <>
                  <MenuItem
                    component={Link}
                    href="/profile"
                    onClick={() => setMobileOpen(null)}
                  >
                    My profile
                  </MenuItem>
                  {user.accountType === "viewer" && (
                    <MenuItem
                      component={Link}
                      href="/creator/apply"
                      onClick={() => setMobileOpen(null)}
                    >
                      Become a creator
                    </MenuItem>
                  )}
                  {(user.accountType === "creator" || user.accountType === "admin") && (
                    <MenuItem
                      component={Link}
                      href="/dashboard"
                      onClick={() => setMobileOpen(null)}
                    >
                      Dashboard
                    </MenuItem>
                  )}
                  {user.accountType === "admin" && (
                    <MenuItem
                      component={Link}
                      href="/admin"
                      onClick={() => setMobileOpen(null)}
                    >
                      Admin
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      setMobileOpen(null);
                      void logout();
                    }}
                  >
                    Log out
                  </MenuItem>
                </>
              )}
              {!user && !authLoading && (
                <>
                  <MenuItem component={Link} href="/login" onClick={() => setMobileOpen(null)}>
                    Log in
                  </MenuItem>
                  <MenuItem component={Link} href="/register" onClick={() => setMobileOpen(null)}>
                    Sign up
                  </MenuItem>
                </>
              )}
            </Menu>
          </>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton color="inherit" size="small" aria-label="search">
            <SearchIcon />
          </IconButton>
          <IconButton color="inherit" size="small" aria-label="notifications">
            <NotificationsNoneIcon />
          </IconButton>
          {authLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: 0.5 }}>
              <Skeleton
                variant="rounded"
                width={56}
                height={28}
                sx={{ bgcolor: "rgba(255,255,255,0.08)" }}
              />
              <Skeleton
                variant="rounded"
                width={64}
                height={28}
                sx={{ bgcolor: "rgba(255,255,255,0.08)" }}
              />
            </Box>
          ) : !user ? (
            <>
              <Button
                component={Link}
                href="/login"
                variant="text"
                sx={{
                  color: "text.secondary",
                  textTransform: "none",
                  minWidth: 0,
                  px: 0.75,
                  py: 0.5,
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Log in
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="text"
                color="primary"
                sx={{
                  textTransform: "none",
                  minWidth: 0,
                  px: 0.75,
                  py: 0.5,
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Sign up
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="text"
                onClick={(e) => setAnchor(e.currentTarget)}
                aria-haspopup="true"
                aria-expanded={Boolean(anchor)}
                sx={{
                  color: "text.primary",
                  textTransform: "none",
                  minWidth: 0,
                  px: 0.5,
                  borderRadius: "50%",
                }}
              >
                <Avatar
                  src={user.avatarUrl ?? undefined}
                  alt={`${user.displayName} account menu`}
                  sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 700 }}
                >
                  {user.displayName.slice(0, 1).toUpperCase()}
                </Avatar>
              </Button>
              <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
              >
                <MenuItem
                  component={Link}
                  href="/profile"
                  onClick={() => setAnchor(null)}
                >
                  My profile
                </MenuItem>
                {canOpenPublicChannel(user) ? (
                  <MenuItem
                    component={Link}
                    href={myChannelHref(user.handle)}
                    onClick={() => setAnchor(null)}
                    title="Your public channel — the same URL viewers use."
                  >
                    My channel
                  </MenuItem>
                ) : null}
                {user.accountType === "viewer" && (
                  <MenuItem
                    component={Link}
                    href="/creator/apply"
                    onClick={() => setAnchor(null)}
                  >
                    Become a creator
                  </MenuItem>
                )}
                {(user.accountType === "creator" || user.accountType === "admin") && (
                  <MenuItem
                    component={Link}
                    href="/dashboard"
                    onClick={() => setAnchor(null)}
                  >
                    Dashboard
                  </MenuItem>
                )}
                {user.accountType === "admin" && (
                  <MenuItem
                    component={Link}
                    href="/admin"
                    onClick={() => setAnchor(null)}
                  >
                    Admin
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setAnchor(null);
                    void logout();
                  }}
                >
                  Log Out
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
