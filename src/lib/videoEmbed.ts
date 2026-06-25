/**
 * Convert common video share URLs (YouTube, Vimeo) into an embeddable iframe URL.
 *
 * Plain watch/share links (e.g. youtube.com/watch?v=ID, youtu.be/ID) CANNOT be
 * shown in an iframe — the provider sends X-Frame-Options and the browser shows
 * "refused to connect". They must be converted to the provider's /embed/ form.
 *
 * Any URL we don't recognize (direct mp4, PDFs, Google Docs, etc.) is returned
 * unchanged, so this is safe to call on any media URL.
 */
export function toEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  const url = rawUrl.trim();

  // ─── YouTube ───
  const yt = extractYouTubeId(url);
  if (yt) {
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", enablejsapi: "1" });
    if (yt.start) params.set("start", String(yt.start));
    return `https://www.youtube.com/embed/${yt.id}?${params.toString()}`;
  }

  // ─── Vimeo ───
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}?byline=0&portrait=0`;
  }

  // Unknown provider (direct video file, document, etc.) — leave untouched.
  return url;
}

function parseTimeToSeconds(t: string): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  const [, h, mn, s] = m;
  return parseInt(h || "0", 10) * 3600 + parseInt(mn || "0", 10) * 60 + parseInt(s || "0", 10);
}

function extractYouTubeId(url: string): { id: string; start?: number } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const isYouTube =
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com";
    if (!isYouTube) return null;

    let id = "";
    if (host === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0];
    } else if (u.pathname.startsWith("/watch")) {
      id = u.searchParams.get("v") || "";
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.split("/embed/")[1]?.split("/")[0] || "";
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    } else if (u.pathname.startsWith("/live/")) {
      id = u.pathname.split("/live/")[1]?.split("/")[0] || "";
    }

    if (!id) return null;
    const t = u.searchParams.get("start") || u.searchParams.get("t");
    return { id, start: t ? parseTimeToSeconds(t) : undefined };
  } catch {
    return null;
  }
}

function extractVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "player.vimeo.com") {
      const m = u.pathname.match(/\/video\/(\d+)/);
      return m ? m[1] : null;
    }
    if (host === "vimeo.com") {
      const m = u.pathname.match(/\/(\d+)/);
      return m ? m[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Returns the YouTube video id for any YouTube URL, or null if not YouTube. */
export function getYouTubeId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  return extractYouTubeId(rawUrl.trim())?.id ?? null;
}

// Loads the YouTube IFrame Player API once and resolves with window.YT.
let ytApiPromise: Promise<typeof window.YT> | null = null;
export function loadYouTubeIframeApi(): Promise<typeof window.YT> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}
