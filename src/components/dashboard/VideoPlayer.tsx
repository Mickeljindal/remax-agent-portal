import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  PlayCircle,
  Pause,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize,
  SkipForward,
} from "lucide-react";
import { toEmbedUrl, getYouTubeId, loadYouTubeIframeApi } from "@/lib/videoEmbed";

interface VideoPlayerProps {
  moduleId: string;
  agentId: string;
  videoUrl: string;
  durationMinutes: number | null;
  initialWatchedSeconds?: number;
  isCompleted?: boolean;
  onProgressUpdate?: (watchedSeconds: number) => void;
  onComplete?: () => void;
}

/**
 * Determines if a URL is a direct video file (mp4/webm) or an embed URL (YouTube/Vimeo).
 */
function isDirectVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com/embed") || lower.includes("youtu.be")) return false;
  if (lower.includes("player.vimeo.com") || lower.includes("vimeo.com")) return false;
  if (lower.includes("dailymotion.com") || lower.includes("wistia.com")) return false;
  // If it ends with a video extension or comes from our upload server / supabase storage, it's direct
  if (lower.match(/\.(mp4|webm|mov|ogg|avi|mkv)(\?.*)?$/)) return true;
  if (lower.includes("supabase") && lower.includes("storage")) return true;
  if (lower.includes("/files/course-videos")) return true;
  if (lower.includes("course-videos")) return true;
  // Default: treat as embed
  return false;
}

export default function VideoPlayer({
  moduleId,
  agentId,
  videoUrl,
  durationMinutes,
  initialWatchedSeconds = 0,
  isCompleted = false,
  onProgressUpdate,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchedRef = useRef(initialWatchedSeconds);
  const isDirect = isDirectVideoUrl(videoUrl);
  const ytId = !isDirect ? getYouTubeId(videoUrl) : null;
  const isYouTube = !!ytId;

  // YouTube IFrame API tracking refs
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(isCompleted);
  useEffect(() => { completedRef.current = completed; }, [completed]);

  const totalSeconds = durationMinutes ? durationMinutes * 60 : duration;
  const progressPercent = totalSeconds > 0 ? Math.min((watchedSeconds / totalSeconds) * 100, 100) : 0;
  const COMPLETION_THRESHOLD = 0.9;

  // Save progress to Supabase
  const saveProgress = useCallback(async (seconds: number) => {
    if (!agentId || !moduleId) return;
    const shouldComplete = completed || (totalSeconds > 0 && seconds >= totalSeconds * COMPLETION_THRESHOLD);
    await supabase.from("course_progress").upsert({
      agent_id: agentId,
      module_id: moduleId,
      watched_seconds: seconds,
      completed: shouldComplete,
      completed_at: shouldComplete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "agent_id,module_id" });
  }, [agentId, moduleId, completed, totalSeconds]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!isDirect) return;
    const interval = setInterval(() => {
      if (watchedRef.current > initialWatchedSeconds) {
        saveProgress(watchedRef.current);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isDirect, saveProgress, initialWatchedSeconds]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (watchedRef.current > initialWatchedSeconds) {
        saveProgress(watchedRef.current);
      }
    };
  }, []);

  // ─── YouTube IFrame API: real watch-time tracking for embedded YouTube videos ───
  useEffect(() => {
    if (!isYouTube || !ytId) return;
    let cancelled = false;

    const stopPolling = () => {
      if (ytPollRef.current) { clearInterval(ytPollRef.current); ytPollRef.current = null; }
    };

    const startPolling = () => {
      if (ytPollRef.current) return;
      ytPollRef.current = setInterval(() => {
        const p = ytPlayerRef.current;
        if (!p?.getCurrentTime) return;
        const ct = Math.floor(p.getCurrentTime());
        const dur = Math.floor(p.getDuration?.() || 0);
        if (dur && dur !== duration) setDuration(dur);
        if (ct > watchedRef.current) {
          watchedRef.current = ct;
          setWatchedSeconds(ct);
          setCurrentTime(ct);
          onProgressUpdate?.(ct);
          if (ct % 10 === 0) saveProgress(ct); // periodic save
          const total = durationMinutes ? durationMinutes * 60 : dur;
          if (total > 0 && ct >= total * COMPLETION_THRESHOLD && !completedRef.current) {
            setCompleted(true);
            onComplete?.();
            saveProgress(ct);
          }
        }
      }, 1000);
    };

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !YT || !ytContainerRef.current) return;
        ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
          width: "100%",
          height: "100%",
          videoId: ytId,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: (e) => {
              if (initialWatchedSeconds > 0) e.target.seekTo(initialWatchedSeconds, true);
            },
            onStateChange: (e) => {
              const S = YT.PlayerState;
              if (e.data === S.PLAYING) { setIsPlaying(true); startPolling(); }
              else if (e.data === S.PAUSED) { setIsPlaying(false); stopPolling(); saveProgress(watchedRef.current); }
              else if (e.data === S.ENDED) {
                setIsPlaying(false);
                stopPolling();
                if (!completedRef.current) { setCompleted(true); onComplete?.(); }
                saveProgress(watchedRef.current);
              }
            },
          },
        });
      })
      .catch(() => { /* API failed to load — falls back to manual completion */ });

    return () => {
      cancelled = true;
      stopPolling();
      try { ytPlayerRef.current?.destroy?.(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, ytId]);

  // Video element event handlers (for direct video)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const ct = Math.floor(videoRef.current.currentTime);
    setCurrentTime(ct);
    if (ct > watchedSeconds) {
      setWatchedSeconds(ct);
      watchedRef.current = ct;
      onProgressUpdate?.(ct);
      // Auto-complete
      if (totalSeconds > 0 && ct >= totalSeconds * COMPLETION_THRESHOLD && !completed) {
        setCompleted(true);
        onComplete?.();
        saveProgress(ct);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(Math.floor(videoRef.current.duration));
      // Resume from where they left off
      if (initialWatchedSeconds > 0 && initialWatchedSeconds < videoRef.current.duration) {
        videoRef.current.currentTime = initialWatchedSeconds;
      }
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => { setIsPlaying(false); saveProgress(watchedRef.current); };
  const handleEnded = () => {
    setIsPlaying(false);
    if (!completed) { setCompleted(true); onComplete?.(); }
    saveProgress(watchedRef.current);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
  };

  const seekTo = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else videoRef.current.requestFullscreen();
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Build an embeddable URL (converts youtube.com/watch, youtu.be, vimeo.com, etc.
  // into the provider's /embed/ form so the iframe is allowed to load).
  const getEmbedUrl = () => toEmbedUrl(videoUrl);

  // ─── RENDER: DIRECT VIDEO (MP4/WebM from storage) ──────────
  if (isDirect) {
    return (
      <div className="space-y-3">
        {/* Video element */}
        <div className="relative rounded-xl overflow-hidden bg-black group">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            muted={muted}
            playsInline
          />

          {/* Custom controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Seek bar */}
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={seekTo}
              className="mb-3 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setMuted(!muted)}>
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <span className="text-xs text-white/80 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {completed && (
                  <Badge className="bg-green-600 text-white text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </Badge>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleFullscreen}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Play button overlay when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
              <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <PlayCircle className="h-8 w-8 text-primary ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Progress info below video */}
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatTime(watchedSeconds)} watched
              </span>
              {totalSeconds > 0 && <span>{formatTime(totalSeconds)} total</span>}
            </div>
          </div>
          {completed && (
            <Badge className="bg-green-600 gap-1 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: YOUTUBE (tracked via IFrame API) ──────────────
  if (isYouTube) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <div ref={ytContainerRef} className="h-full w-full" />
        </div>

        {/* Progress info */}
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatTime(watchedSeconds)} watched
              </span>
              {totalSeconds > 0 && <span>{formatTime(totalSeconds)} total</span>}
            </div>
          </div>
          {completed && (
            <Badge className="bg-green-600 gap-1 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          )}
        </div>

        {!completed && (
          <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
            ▶️ Watch progress is tracked automatically. This module completes once you've watched about 90%.
          </p>
        )}
      </div>
    );
  }

  // ─── RENDER: EMBED VIDEO (Vimeo / other) ───────────────────
  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black">
        <iframe
          title="Course video"
          src={getEmbedUrl()}
          className="w-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Progress info */}
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatTime(watchedSeconds)} watched
            </span>
            {totalSeconds > 0 && <span>{formatTime(totalSeconds)} total</span>}
          </div>
        </div>
        {completed && (
          <Badge className="bg-green-600 gap-1 shrink-0">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        )}
      </div>

      {!completed && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          💡 For embedded videos, mark modules complete manually from the syllabus below after watching.
        </p>
      )}
    </div>
  );
}
