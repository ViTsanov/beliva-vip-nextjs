import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  image: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ImageModal({ 
  isOpen, image, onClose, onNext, onPrev, hasNext, hasPrev 
}: ImageModalProps) {
  
  // Затваряне с ESC бутон
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Спира скрола на сайта отзад
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hasNext, hasPrev, onClose, onNext, onPrev]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50"
      >
        <X size={24} />
      </button>

      {/* Prev Button */}
      {hasPrev && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 md:left-8 p-3 bg-white/10 hover:bg-brand-gold text-white rounded-full transition-all z-50"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Image Container */}
      <div 
        className="relative max-w-7xl w-full h-full flex items-center justify-center"
        onClick={onClose} // Клик извън снимката затваря
      >
        <img 
          src={image} 
          alt="Full screen" 
          className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()} // Клик върху снимката НЕ затваря
        />
      </div>

      {/* Next Button */}
      {hasNext && (
        <button 
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 md:right-8 p-3 bg-white/10 hover:bg-brand-gold text-white rounded-full transition-all z-50"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>
  );
}