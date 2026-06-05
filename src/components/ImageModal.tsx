import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  image: string;
  caption?: string;
  currentIndex?: number;   // optional — defaults to 0
  totalCount?: number;     // optional — hides counter when omitted
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ImageModal({ 
  isOpen, image, caption, currentIndex = 0, totalCount,
  onClose, onNext, onPrev, hasNext, hasPrev 
}: ImageModalProps) {
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hasNext, hasPrev, onClose, onNext, onPrev]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
      
      {/* Top bar: close + counter (only shown when totalCount is provided) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 z-50">
      {totalCount ? (
      <span className="text-white/50 text-xs font-black uppercase tracking-widest">
          {currentIndex + 1} / {totalCount}
            </span>
          ) : <span />}
        <button 
          onClick={onClose} 
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
        >
          <X size={22} />
        </button>
      </div>

      {/* Prev */}
      {hasPrev && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 md:left-8 p-3 bg-white/10 hover:bg-brand-gold text-white rounded-full transition-all z-50"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Image — takes remaining vertical space between top bar and caption bar */}
      <div 
        className="relative w-full flex-1 flex items-center justify-center px-16 py-4"
        onClick={onClose}
      >
        <img 
          src={image} 
          alt={caption || 'Снимка от екскурзия'} 
          className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl animate-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Next */}
      {hasNext && (
        <button 
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 md:right-8 p-3 bg-white/10 hover:bg-brand-gold text-white rounded-full transition-all z-50"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Caption bar — always rendered at bottom, shown only if caption exists */}
      <div className={`w-full px-6 pb-8 pt-4 flex items-center justify-center gap-2 transition-all duration-300 ${
        caption ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 max-w-lg">
          <MapPin size={14} className="text-brand-gold shrink-0" />
          <span className="text-white text-sm font-semibold tracking-wide">{caption || ''}</span>
        </div>
      </div>
    </div>
  );
}
