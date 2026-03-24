/**
 * Mux static image API — use when `playback_id` is set but `thumbnail_url` was never stored
 * (e.g. uploads before the API persisted a poster URL).
 * @see https://docs.mux.com/guides/video/get-images-from-a-video
 */
export function muxThumbnailUrl(playbackId: string | null | undefined): string {
  const id = playbackId?.trim();
  if (!id) return "";
  return `https://image.mux.com/${id}/thumbnail.jpg?time=1&width=640&fit_mode=smartcrop`;
}
