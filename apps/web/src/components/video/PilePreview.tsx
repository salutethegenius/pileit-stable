'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  FavoriteBorder,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useAuth } from '@/providers/AuthProvider';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@/utils/format';

interface PileCommentRow {
  id: string;
  user_display_name: string;
  comment_type: string;
  content: string | null;
  media_url: string | null;
  like_count: number;
  created_at: string;
}

interface PilePreviewProps {
  videoId: string;
  totalCount: number;
  onViewAll?: () => void;
  /** When set, "Add to the pile..." opens full panel (drawer) instead of inline composer. */
  onAddToPileClick?: () => void;
}

export default function PilePreview({
  videoId,
  totalCount,
  onViewAll,
  onAddToPileClick,
}: PilePreviewProps) {
  const { user, accessToken } = useAuth();

  const [comments, setComments] = useState<PileCommentRow[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    apiFetch<PileCommentRow[]>(`/videos/${videoId}/pile?limit=5`)
      .then(setComments)
      .catch(() => {});
  }, [videoId]);

  const visibleComments = expanded ? comments.slice(0, 3) : comments.slice(0, 1);

  const getInitials = (name: string): string =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleSubmit = useCallback(async () => {
    const text = newComment.trim();
    if (!text || !user) return;

    setIsSubmitting(true);
    try {
      await apiFetch(`/pile/${videoId}`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ comment_type: 'text', content: text }),
      });
      setNewComment('');
      setShowInput(false);
      const fresh = await apiFetch<PileCommentRow[]>(`/videos/${videoId}/pile?limit=5`);
      setComments(fresh);
    } catch {
      /* noop */
    } finally {
      setIsSubmitting(false);
    }
  }, [videoId, newComment, user, accessToken]);

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Typography variant="subtitle1" fontWeight={500}>
          Pile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalCount} comment{totalCount !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {visibleComments.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibleComments.map((c) => (
            <Box
              key={c.id}
              sx={{
                display: 'flex',
                gap: 1.5,
                p: 1.5,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'info.main',
                  color: 'info.contrastText',
                  fontSize: 13,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {getInitials(c.user_display_name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {c.user_display_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(c.created_at)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {c.content}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <FavoriteBorder fontSize="small" />
                </IconButton>
                {c.like_count > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {c.like_count}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No comments yet. Be the first to add to the pile!
        </Typography>
      )}

      {totalCount > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          {comments.length > 1 && (
            <Button
              onClick={() => setExpanded(!expanded)}
              size="small"
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ color: 'text.secondary' }}
            >
              {expanded ? 'Show less' : `Show ${Math.min(comments.length - 1, 2)} more`}
            </Button>
          )}
          {totalCount > 3 && (
            <Button onClick={onViewAll} size="small" sx={{ color: 'primary.main' }}>
              View all {totalCount} comments
            </Button>
          )}
        </Box>
      )}

      <Collapse in={showInput}>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
          <TextField
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add your thoughts..."
            size="small"
            multiline
            maxRows={4}
            fullWidth
            disabled={isSubmitting}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 2,
              bgcolor: 'warning.main',
              '&:hover': { bgcolor: 'warning.dark' },
            }}
          >
            Post
          </Button>
        </Box>
      </Collapse>

      {!showInput && (
        <Button
          onClick={() => {
            if (!user) return;
            if (onAddToPileClick) {
              onAddToPileClick();
              return;
            }
            setShowInput(true);
          }}
          fullWidth
          variant="outlined"
          sx={{
            mt: 1.5,
            py: 1.5,
            borderRadius: 2,
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
          }}
        >
          Add to the pile...
        </Button>
      )}
    </Box>
  );
}
