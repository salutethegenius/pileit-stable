'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Button,
  Typography,
  Divider,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  ThumbUpOutlined,
  ThumbUp,
  ThumbDownOutlined,
  ThumbDown,
  ChatBubbleOutline,
  Share,
  BookmarkBorder,
  MoreHoriz,
} from '@mui/icons-material';
import { useAuth } from '@/providers/AuthProvider';
import { apiFetch } from '@/lib/api';

interface ReactionResponse {
  liked: boolean;
  disliked: boolean;
  like_count: number;
  dislike_count: number;
}

interface VideoActionsProps {
  videoId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialPileCount: number;
  initialUserLiked: boolean;
  initialUserDisliked: boolean;
  initialUserSaved: boolean;
  onPileClick?: () => void;
  onShareClick?: () => void;
}

export default function VideoActions({
  videoId,
  initialLikeCount,
  initialDislikeCount,
  initialPileCount,
  initialUserLiked,
  initialUserDisliked,
  onPileClick,
  onShareClick,
}: VideoActionsProps) {
  const { user, accessToken } = useAuth();

  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userLiked, setUserLiked] = useState(initialUserLiked);
  const [userDisliked, setUserDisliked] = useState(initialUserDisliked);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleLike = useCallback(async () => {
    if (!user) {
      setSnackbar('Sign in to like videos');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      const r = await apiFetch<ReactionResponse>(`/videos/${videoId}/like`, {
        method: 'POST',
        accessToken,
      });
      setUserLiked(r.liked);
      setUserDisliked(r.disliked);
      setLikeCount(r.like_count);
      setDislikeCount(r.dislike_count);
    } catch {
      setSnackbar('Failed to update. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [videoId, user, accessToken, isLoading]);

  const handleDislike = useCallback(async () => {
    if (!user) {
      setSnackbar('Sign in to dislike videos');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      const r = await apiFetch<ReactionResponse>(`/videos/${videoId}/dislike`, {
        method: 'POST',
        accessToken,
      });
      setUserLiked(r.liked);
      setUserDisliked(r.disliked);
      setLikeCount(r.like_count);
      setDislikeCount(r.dislike_count);
    } catch {
      setSnackbar('Failed to update. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [videoId, user, accessToken, isLoading]);

  const handleShare = useCallback(async () => {
    if (onShareClick) {
      onShareClick();
      return;
    }
    const url = `${window.location.origin}/watch/${videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setSnackbar('Link copied to clipboard');
    }
  }, [videoId, onShareClick]);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 1.5,
          px: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tooltip title={userLiked ? 'Remove like' : 'Like'}>
          <Button
            onClick={handleLike}
            disabled={isLoading}
            sx={{
              minWidth: 'auto',
              px: 1.5,
              py: 1,
              borderRadius: 2,
              color: userLiked ? 'primary.main' : 'text.primary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            startIcon={userLiked ? <ThumbUp /> : <ThumbUpOutlined />}
          >
            <Typography variant="body2" fontWeight={500}>
              {likeCount > 0 ? likeCount.toLocaleString() : ''}
            </Typography>
          </Button>
        </Tooltip>

        <Tooltip title={userDisliked ? 'Remove dislike' : 'Dislike'}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
            }}
          >
            <IconButton
              onClick={handleDislike}
              disabled={isLoading}
              sx={{
                color: userDisliked ? 'error.main' : 'text.primary',
                borderRadius: 2,
                px: 1.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {userDisliked ? <ThumbDown /> : <ThumbDownOutlined />}
            </IconButton>
            {dislikeCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 16 }}>
                {dislikeCount.toLocaleString()}
              </Typography>
            )}
          </Box>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Tooltip title="View pile">
          <Button
            onClick={onPileClick}
            sx={{
              minWidth: 'auto',
              px: 1.5,
              py: 1,
              borderRadius: 2,
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            startIcon={<ChatBubbleOutline />}
          >
            <Typography variant="body2" fontWeight={500} sx={{ mr: 0.5 }}>
              Pile
            </Typography>
            {initialPileCount > 0 && (
              <Typography variant="body2" color="text.secondary">
                {initialPileCount.toLocaleString()}
              </Typography>
            )}
          </Button>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Tooltip title="Share">
          <Button
            onClick={handleShare}
            sx={{
              minWidth: 'auto',
              px: 1.5,
              py: 1,
              borderRadius: 2,
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            startIcon={<Share />}
          >
            <Typography variant="body2" fontWeight={500}>
              Share
            </Typography>
          </Button>
        </Tooltip>

        {/* Save — watchlist API not wired yet (Sprint 2) */}
        <Tooltip title="Save to watchlist (coming soon)">
          <span style={{ marginLeft: 'auto' }}>
            <Button
              disabled
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                color: 'text.primary',
              }}
              startIcon={<BookmarkBorder />}
            >
              <Typography variant="body2" fontWeight={500}>
                Save
              </Typography>
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="More options">
          <IconButton
            sx={{
              color: 'text.primary',
              borderRadius: 2,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <MoreHoriz />
          </IconButton>
        </Tooltip>
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
