/**
 * YouTube helper — parse any YouTube URL into a videoId, embed URL and thumbnail.
 * Also used by the moderation scanner to whitelist YouTube links in course videoUrl.
 */

export interface YouTubeMeta {
  videoId: string
  /** https://www.youtube.com/embed/<id> */
  embedUrl: string
  /** https://www.youtube.com/watch?v=<id> */
  watchUrl: string
  /** https://img.youtube.com/vi/<id>/maxresdefault.jpg (highest quality) */
  thumbnail: string
  /** https://img.youtube.com/vi/<id>/hqdefault.jpg (always exists) */
  thumbnailHq: string
}

/**
 * Extract a YouTube video id from any common URL shape:
 *   https://www.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   https://m.youtube.com/watch?v=ID
 * Returns null when the URL isn't a YouTube link.
 */
export function parseYouTubeUrl(raw: string): YouTubeMeta | null {
  if (!raw || typeof raw !== 'string') return null
  let url: URL
  try {
    url = raw.trim().startsWith('http') ? new URL(raw.trim()) : new URL(`https://${raw.trim()}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')
  if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'youtube-nocookie.com') return null

  let videoId: string | null = null
  if (host === 'youtu.be') {
    videoId = url.pathname.slice(1)
  } else if (url.pathname === '/watch' || url.pathname.startsWith('/watch')) {
    videoId = url.searchParams.get('v')
  } else if (url.pathname.startsWith('/embed/')) {
    videoId = url.pathname.slice('/embed/'.length)
  } else if (url.pathname.startsWith('/shorts/')) {
    videoId = url.pathname.slice('/shorts/'.length)
  } else if (url.pathname.startsWith('/v/')) {
    videoId = url.pathname.slice('/v/'.length)
  }
  // YouTube ids are 11 chars, [A-Za-z0-9_-]
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null

  return {
    videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    thumbnailHq: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  }
}

export function isYouTubeLink(raw: string): boolean {
  return parseYouTubeUrl(raw) !== null
}
