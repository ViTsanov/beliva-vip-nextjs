import { useState, useEffect } from 'react';
import { Facebook, Link as LinkIcon, Smartphone, Share2 } from 'lucide-react';

interface ShareProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareProps) {
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    // Проверка:
    // 1. Поддържа ли устройството Native Share?
    // 2. Екранът по-малък ли е от 768px (стандарт за мобилни/таблети)?
    const supportsShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const isSmallScreen = window.innerWidth < 1024; // < 1024 хваща телефони и вертикални таблети

    if (supportsShare && isSmallScreen) {
      setIsMobileView(true);
    } else {
      setIsMobileView(false);
    }
  }, []);

  // --- ЛОГИКА ЗА ТЕЛЕФОН (Native Share) ---
  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: title,
        text: `Виж тази оферта от Beliva VIP Tour: ${title}`,
        url: url,
      });
    } catch (error) {
      console.log('Споделянето отказано:', error);
    }
  };

  // --- ЛОГИКА ЗА КОМПЮТЪР (Desktop) ---
  
  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareViber = () => {
    window.open(`viber://forward?text=${encodeURIComponent(title + " " + url)}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    alert('Линкът е копиран!');
  };

  return (
    <div className="flex flex-col">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
        Сподели с приятели
      </p>

      {/* АКО Е ТЕЛЕФОН -> ЕДИН БУТОН */}
      {isMobileView ? (
        <button 
          onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 w-full p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg font-semibold"
        >
          <Share2 size={20} />
          Сподели офертата
        </button>
      ) : (
        /* АКО Е КОМПЮТЪР -> 3 БУТОНА */
        <div className="flex gap-2">
          
          {/* Facebook */}
          <button 
            onClick={shareFacebook}
            className="p-3 bg-[#1877F2] text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            title="Сподели във Facebook"
          >
            <Facebook size={18} />
          </button>

          {/* Viber */}
          <button 
            onClick={shareViber}
            className="p-3 bg-[#7360f2] text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            title="Изпрати по Viber"
          >
            <Smartphone size={18} />
          </button>

          {/* Copy Link */}
          <button 
            onClick={copyLink}
            className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors shadow-sm"
            title="Копирай линка"
          >
            <LinkIcon size={18} />
          </button>
        </div>
      )}
    </div>
  );
}