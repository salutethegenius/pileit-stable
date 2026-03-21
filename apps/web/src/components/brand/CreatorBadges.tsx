"use client";

import Stack from "@mui/material/Stack";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

const VERIFIED_BLUE = "#3b82f6";
const MONETIZATION_GOLD = "#d4af37";

type Size = "small" | "medium";

const sizes: Record<
  Size,
  { verified: number; premium: number; gap: number }
> = {
  small: { verified: 16, premium: 17, gap: 0.25 },
  medium: { verified: 20, premium: 22, gap: 0.5 },
};

/** Blue check = platform verified (admin). Gold = payouts / monetization approved (KYC). */
export default function CreatorBadges({
  verified,
  monetizationEligible,
  size = "medium",
}: {
  verified?: boolean;
  /** Gold badge only when explicitly monetization-approved. */
  monetizationEligible?: boolean;
  size?: Size;
}) {
  const s = sizes[size];
  const showGold = monetizationEligible === true;

  if (!verified && !showGold) return null;

  return (
    <Stack direction="row" alignItems="center" spacing={s.gap} component="span">
      {verified ? (
        <VerifiedIcon
          sx={{ fontSize: s.verified, color: VERIFIED_BLUE }}
          titleAccess="Verified creator"
        />
      ) : null}
      {showGold ? (
        <WorkspacePremiumIcon
          sx={{ fontSize: s.premium, color: MONETIZATION_GOLD }}
          titleAccess="Monetization enabled"
        />
      ) : null}
    </Stack>
  );
}
