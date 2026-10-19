import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Maximize2 } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlayOnVisible?: boolean;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  className = '',
  autoPlayOnVisible = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  const [centerIconType, setCenterIconType] = useState<'play' | 'pause'>('play');

  // Autoplay when visible in viewport via IntersectionObserver (X-style)
  useEffect(() => {
    if (!autoPlayOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = videoRef.current;
          if (!video) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            video.muted = isMuted;
            video
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                // Browser policy fallback
              });
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: [0.2, 0.5, 0.8] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [autoPlayOnVisible, isMuted]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        triggerCenterIcon('play');
      });
    } else {
      video.pause();
      setIsPlaying(false);
      triggerCenterIcon('pause');
    }
  };

  const triggerCenterIcon = (type: 'play' | 'pause') => {
    setCenterIconType(type);
    setShowCenterIcon(true);
    setTimeout(() => setShowCenterIcon(false), 500);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !bar) return;

    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * (duration || 1);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={`relative group overflow-hidden bg-black select-none cursor-pointer rounded-2xl ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        playsInline
        loop
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-full object-cover max-h-[500px] bg-black"
      />

      {/* Center transient play/pause splash indicator */}
      {showCenterIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-4 rounded-full bg-black/60 backdrop-blur-md text-white animate-out fade-out zoom-out duration-300">
            {centerIconType === 'play' ? (
              <Play className="w-8 h-8 fill-white" />
            ) : (
              <Pause className="w-8 h-8 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Floating play state indicator if paused */}
      {!isPlaying && !showCenterIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/25">
          <div className="p-4 rounded-full bg-black/60 text-white backdrop-blur-sm shadow-xl ring-1 ring-white/20">
            <Play className="w-8 h-8 fill-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Modern X-Style Floating Audio Mute/Unmute Control */}
      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 z-20 p-2.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md shadow-lg border border-white/10 transition-transform active:scale-95"
        title={isMuted ? 'Unmute audio' : 'Mute audio'}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-white" />
        ) : (
          <Volume2 className="w-4 h-4 text-white" />
        )}
      </button>

      {/* Duration Chip (X-Style bottom-left) */}
      <div className="absolute bottom-4 left-4 z-20 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-mono tabular-nums text-white/90 border border-white/10 pointer-events-none">
        {formatSeconds(currentTime)} / {formatSeconds(duration || 0)}
      </div>

      {/* Modern Hairline Progress Scrub Bar */}
      <div
        onClick={handleSeek}
        className="absolute bottom-0 inset-x-0 h-1 bg-white/20 hover:h-2 transition-all cursor-pointer z-20"
      >
        <div
          className="h-full bg-indigo-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
