import React, { useEffect, useState } from 'react';
import { PostMediaItem } from '../../types';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface MediaViewerProps {
  media: PostMediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  initialIndex = 0,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, media.length]);

  if (!isOpen || media.length === 0) return null;

  const currentItem = media[currentIndex] || media[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
    setZoomLevel(1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
    setZoomLevel(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in select-none">
      {/* Top Action Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3 text-white">
        {currentItem.type === 'image' && (
          <>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
          </>
        )}
        <a
          href={currentItem.cloudinaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Download full media"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-rose-500/80 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Index indicator */}
      {media.length > 1 && (
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full bg-black/60 text-xs font-mono text-white/90">
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {/* Navigation Arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Media Canvas */}
      <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-4 overflow-hidden">
        {currentItem.type === 'video' ? (
          <video
            src={currentItem.cloudinaryUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={currentItem.cloudinaryUrl}
            alt="Expanded visual attachment"
            className="max-h-[85vh] max-w-full object-contain rounded-lg transition-transform duration-200 shadow-2xl"
            style={{ transform: `scale(${zoomLevel})` }}
          />
        )}
      </div>
    </div>
  );
};
