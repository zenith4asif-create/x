import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, Maximize2, Loader2 } from 'lucide-react';

interface XVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  onExpand?: () => void;
  autoPlayThreshold?: number;
}

export const XVideoPlayer: React.FC<XVideoPlayerProps> = ({
  src,
  poster,
  className = '',
  onExpand,
  autoPlayThreshold = 0.5
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [shouldLoad, setShouldLoad] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  const [centerIconType, setCenterIconType] = useState<'play' | 'pause'>('play');

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // IntersectionObserver:
  // 1. DO NOT load video bytes on opening website (lazy load only when in/near viewport)
  // 2. Autoplay muted when >= 50% in viewport, pause when scrolled away
  useEffect(() => {
    const videoElement = videoRef.current;
    const containerElement = containerRef.current;
    if (!containerElement) return;

    let userManuallyPaused = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start progressive network loading when near viewport
            setShouldLoad(true);

            if (entry.intersectionRatio >= autoPlayThreshold) {
              if (videoElement && !userManuallyPaused) {
                videoElement.muted = true;
                setIsMuted(true);
                const playPromise = videoElement.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                      // Autoplay policy fallback: ensure muted and retry
                      if (videoElement) {
                        videoElement.muted = true;
                        videoElement.play().catch(() => {});
                      }
                    });
                }
              }
            } else {
              // Out of focus or partially scrolled: pause to save network/buffer
              if (videoElement && !videoElement.paused) {
                videoElement.pause();
                setIsPlaying(false);
              }
            }
          } else {
            // Completely out of viewport: pause immediately to prevent background buffering
            if (videoElement && !videoElement.paused) {
              videoElement.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      {
        rootMargin: '200px 0px', // Pre-fetch shortly before entering view, avoiding page open lag
        threshold: [0, autoPlayThreshold, 1.0]
      }
    );

    observer.observe(containerElement);

    return () => {
      observer.disconnect();
    };
  }, [autoPlayThreshold, src]);

  // Track progressive buffer (e.g. 10-second chunks loaded)
  const handleProgress = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (v.buffered.length > 0) {
      const end = v.buffered.end(v.buffered.length - 1);
      const total = v.duration || 1;
      setBufferedEnd(Math.min(100, (end / total) * 100));
    }
  };

  // Video time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || 1;
    setCurrentTime(current);
    setProgress((current / total) * 100);
    handleProgress();
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      handleProgress();
    }
  };

  // Toggle Play / Pause on tap
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setCenterIconType('play');
          flashCenterIcon();
        })
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setCenterIconType('pause');
      flashCenterIcon();
    }
  };

  const flashCenterIcon = () => {
    setShowCenterIcon(true);
    setTimeout(() => setShowCenterIcon(false), 500);
  };

  // Toggle Mute / Unmute (Iconic X feature: single tap on sound badge)
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);

    if (!newMuted && videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Seek on progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * (videoRef.current.duration || 0);
    videoRef.current.currentTime = targetTime;
  };

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={`relative group w-full bg-black overflow-hidden rounded-2xl cursor-pointer select-none border border-[#2f3336] shadow-sm ${className}`}
    >
      {/* Video Element: Lazy loads source only when near/in viewport */}
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        poster={poster}
        muted={isMuted}
        loop
        playsInline
        preload={shouldLoad ? 'auto' : 'none'}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        className="w-full max-h-[540px] object-cover bg-black block"
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-md" />
        </div>
      )}

      {/* Center Action Flash Ripple */}
      {showCenterIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in duration-150">
          <div className="p-4 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-2xl">
            {centerIconType === 'play' ? (
              <Play className="w-8 h-8 fill-white" />
            ) : (
              <Pause className="w-8 h-8 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Subtle Pause Overlay Button when paused */}
      {!isPlaying && !isBuffering && shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
          <div className="p-3.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10 group-hover:scale-110 transition-transform shadow-xl">
            <Play className="w-7 h-7 fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (X Style) */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between gap-3 pointer-events-auto">
        {/* Time / Duration Badge */}
        <div className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-mono text-[#e7e9ea] border border-white/10 shadow-sm flex items-center gap-1">
          <span>{formatTime(currentTime)}</span>
          <span className="text-[#71767b]">/</span>
          <span className="text-[#71767b]">{formatTime(duration)}</span>
        </div>

        {/* Right Controls: Mute/Unmute toggle (Exact X design) & Fullscreen */}
        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white border border-white/15 transition-all"
              title="Expand video"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* MUTE / UNMUTE Floating Button */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full backdrop-blur-md border transition-all active:scale-95 flex items-center justify-center ${
              isMuted
                ? 'bg-black/75 hover:bg-black text-[#e7e9ea] border-white/15'
                : 'bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white border-[#1d9bf0] shadow-md shadow-[#1d9bf0]/30'
            }`}
            title={isMuted ? 'Click to unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive Progress Bar with Buffer indicator */}
      <div
        onClick={handleProgressClick}
        className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20 hover:h-2 transition-all cursor-pointer group/bar"
      >
        {/* Progressive buffer chunk bar (e.g. 10s loaded) */}
        <div
          className="h-full bg-white/30 transition-all duration-300"
          style={{ width: `${bufferedEnd}%` }}
        />
        {/* Playback progress */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[#1d9bf0] transition-all duration-100"
          style={{ width: `${progress}%` }}
        >
          {/* Thumb circle */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
};
