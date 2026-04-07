'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Button,
  Snackbar,
  Tooltip,
} from '@mui/material';
import { Verified } from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { apiFetch } from '@/lib/api';

interface CreatorRowProps {
  creatorId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  followerCount: number;
  isVerified: boolean;
  isPayoutApproved: boolean;
  initialIsFollowing: boolean;
  onTipClick?: () => void;
}

export default function CreatorRow({
  creatorId,
  handle,
  displayName,
  avatarUrl,
  followerCount,
  isVerified,
  isPayoutApproved,
  initialIsFollowing,
  onTipClick,
}: CreatorRowProps) {
  const { user, accessToken } = useAuth();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [currentFollowerCount, setCurrentFollowerCount] = useState(followerCount);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const isOwnProfile = user?.id === creatorId;

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFollow = useCallback(async () => {
    if (!user) {
      setSnackbar('Sign in to follow creators');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await apiFetch(`/creators/${creatorId}/follow`, {
          method: 'DELETE',
          accessToken,
        });
        setIsFollowing(false);
        setCurrentFollowerCount((c) => Math.max(0, c - 1));
        setSnackbar(`Unfollowed ${displayName}`);
      } else {
        await apiFetch(`/creators/${creatorId}/follow`, {
          method: 'POST',
          accessToken,
        });
        setIsFollowing(true);
        setCurrentFollowerCount((c) => c + 1);
        setSnackbar(`Following ${displayName}`);
      }
    } catch {
      setSnackbar('Failed to update. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [creatorId, displayName, isFollowing, user, accessToken, isLoading]);

  const formatFollowerCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          gap: { xs: 1.5, md: 2 },
          mb: { xs: 2, md: 2.25 },
          width: '100%',
        }}
      >
        <Link href={`/creator/${handle}`} style={{ textDecoration: 'none' }}>
          <Avatar
            src={avatarUrl}
            alt={displayName}
            sx={{
              width: 44,
              height: 44,
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              fontWeight: 500,
              fontSize: 16,
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'scale(1.05)' },
            }}
          >
            {initials}
          </Avatar>
        </Link>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Link
              href={`/creator/${handle}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Typography
                variant="body1"
                fontWeight={500}
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                {displayName}
              </Typography>
            </Link>
            {isVerified && (
              <Tooltip title="Verified creator">
                <Verified sx={{ fontSize: 16, color: 'warning.main' }} />
              </Tooltip>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {formatFollowerCount(currentFollowerCount)} follower
            {currentFollowerCount !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {!isOwnProfile && (
          <Button
            onClick={handleFollow}
            disabled={isLoading}
            variant={isFollowing ? 'outlined' : 'contained'}
            sx={{
              borderRadius: 2,
              px: 2.5,
              py: 1,
              fontWeight: 500,
              textTransform: 'none',
              bgcolor: isFollowing ? 'transparent' : 'warning.main',
              color: isFollowing ? 'warning.main' : 'warning.contrastText',
              borderColor: isFollowing ? 'warning.main' : undefined,
              '&:hover': {
                bgcolor: isFollowing ? 'warning.light' : 'warning.dark',
                borderColor: isFollowing ? 'warning.dark' : undefined,
              },
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}

        {!isOwnProfile && (
          <Tooltip
            title={
              isPayoutApproved
                ? 'Send a tip'
                : "This creator hasn't completed payout verification"
            }
          >
            <span>
              <Button
                onClick={onTipClick}
                disabled={!isPayoutApproved}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontWeight: 500,
                  textTransform: 'none',
                  borderWidth: 2,
                  borderColor: 'warning.main',
                  color: 'warning.main',
                  '&:hover': { borderWidth: 2, bgcolor: 'warning.light' },
                  '&.Mui-disabled': {
                    borderColor: 'action.disabled',
                    color: 'action.disabled',
                  },
                }}
              >
                $ Tip
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
