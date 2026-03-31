"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { Creator } from "@/types/content";
import CreatorBadges from "@/components/brand/CreatorBadges";
import { formatCreatorAudienceLine } from "@/utils/format";
import { IMG } from "@/lib/imageUrls";
import CategoryMediaPlaceholder from "@/components/brand/CategoryMediaPlaceholder";

export default function CreatorCard({ creator }: { creator: Creator }) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [creator.avatarUrl]);

  const showAvatarPlaceholder = !creator.avatarUrl || avatarFailed;

  return (
    <Paper
      component={Link}
      href={`/creator/${creator.handle}`}
      elevation={0}
      sx={{
        display: "block",
        p: 2,
        maxWidth: "100%",
        overflow: "hidden",
        bgcolor: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(240,237,232,0.08)",
        borderRadius: "10px",
        textDecoration: "none",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
        "&:hover": {
          bgcolor: "rgba(255,255,255,0.05)",
          borderColor: "rgba(240,237,232,0.12)",
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            position: "relative",
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: "50%",
            overflow: "hidden",
            border: `1.5px solid ${creator.accentColor}`,
            boxShadow: "none",
            bgcolor: "#1a0f05",
          }}
        >
          {showAvatarPlaceholder ? (
            <CategoryMediaPlaceholder category={creator.category} variant="avatar" />
          ) : (
            <Box
              component="img"
              src={IMG.avatar(creator.avatarUrl)}
              alt={`${creator.displayName} profile photo`}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="lazy"
              onError={() => setAvatarFailed(true)}
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={500}
              fontStyle="normal"
              noWrap
              sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}
            >
              {creator.displayName}
            </Typography>
            <Box sx={{ flexShrink: 0 }}>
              <CreatorBadges
                verified={creator.verified}
                monetizationEligible={creator.monetizationEligible}
                size="small"
              />
            </Box>
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
              mt: 0.25,
              opacity: 0.65,
              fontSize: 11,
            }}
          >
            @{creator.handle}
          </Typography>
          <Chip
            label={creator.category}
            size="small"
            sx={{
              mt: 0.75,
              height: 20,
              fontSize: "0.65rem",
              bgcolor: "rgba(249,115,22,0.12)",
              color: "primary.main",
              border: "none",
            }}
          />
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontSize: 11, opacity: 0.55 }}>
            {formatCreatorAudienceLine(creator)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
