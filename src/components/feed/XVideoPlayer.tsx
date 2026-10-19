import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, Maximize2 } from 'lucide-react';

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
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

  // IntersectionObserver to auto play / pause based on viewport visibility
  useEffect(() => {
    const videoElement = videoRef.current;
    const containerElement = containerRef.current;
    if (!containerElement || !videoElement) return;

    let isManuallyPaused = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= autoPlayThreshold) {
            if (!isManuallyPaused) {
              videoElement
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                  // If browser blocked unmuted autoplay, enforce mute & try again
                  videoElement.muted = true;
                  setIsMuted(true);
                  videoElement.play().then(() => setIsPlaying(true)).catch(() => {});
                });
            }
          } else {
            videoElement.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: [0, autoPlayThreshold, 1.0]
      }
    );

    observer.observe(containerElement);

    return () => {
      observer.disconnect();
    };
  }, [autoPlayThreshold, src]);

  // Video time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || 1;
    setCurrentTime(current);
    setProgress((current / total) * 100);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  // Toggle Play / Pause on click
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

  // Flash play/pause indicator briefly in the center
  const flashCenterIcon = () => {
    setShowCenterIcon(true);
    setTimeout(() => setShowCenterIcon(false), 500);
  };

  // Toggle Mute / Unmute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);

    // If unmuting and video was paused, ensure it keeps playing
    if (!newMuted && videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Seek on progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * (videoRef.current.duration || 0);
    videoRef.current.currentTime = targetTime;
  };

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={`relative group w-full bg-black overflow-hidden rounded-2xl cursor-pointer select-none border border-[#2f3336] ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="w-full max-h-[500px] object-cover bg-black block mx-auto"
      />

      {/* Center Animated Play/Pause Feedback */}
      {showCenterIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white scale-110 transition-transform animate-in fade-in zoom-in-75 duration-150">
            {centerIconType === 'play' ? (
              <Play className="w-8 h-8 fill-white ml-1 text-white" />
            ) : (
              <Pause className="w-8 h-8 fill-white text-white" />
            )}
          </div>
        </div>
      )}

      {/* Top Gradient Overlay */}
      <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Expand / Fullscreen Button (Top Right) */}
      {onExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-20"
          title="Expand video"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}

      {/* Bottom Controls Bar (X Style) */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between z-20 pointer-events-none">
        {/* Left: Duration Badge / Current Time */}
        <div className="pointer-events-auto">
          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white font-mono text-[11px] font-semibold tabular-nums border border-white/10 shadow-sm">
            {isPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : formatTime(duration)}
          </span>
        </div>

        {/* Right: Sound Mute / Unmute Button (X Platform Style) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-lg flex items-center justify-center ${
              isMuted
                ? 'bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/15'
                : 'bg-white hover:bg-neutral-200 text-black shadow-white/10'
            }`}
            title={isMuted ? 'Click to unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Sleek X-Style Progress Bar */}
      <div
        onClick={handleProgressClick}
        className="absolute bottom-0 inset-x-0 h-1 bg-white/20 hover:h-1.5 transition-all cursor-pointer z-30 pointer-events-auto"
      >
        <div
          className="h-full bg-[#1d9bf0] transition-all duration-75 relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
};
