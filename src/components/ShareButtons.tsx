import { useState, useSyncExternalStore } from 'react';
import { Facebook, Link as LinkIcon, Smartphone, Share2, Check } from 'lucide-react'; // 👈 Добави Check

const emptySubscribe = () => () => {};

interface ShareProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareProps) {
  // Детекция на native share поддръжка + тесен екран — useSyncExternalStore вместо useEffect+setState,
  // така че няма нито допълнителен render pass, нито react-hooks/set-state-in-effect предупреждение.
  const isMobileView = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.innerWidth < 1024,
    () => false,
  );
  const [copied, setCopied] = useState(false); // 👈 Ново състояние за тикчето

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

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareViber = () => {
    window.open(`viber://forward?text=${encodeURIComponent(title + " " + url)}`, '_blank');
  };

  // --- ОБНОВЕНАТА ФУНКЦИЯ ЗА КОПИРАНЕ ---
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // Махаме тикчето след 2 секунди
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Грешка при копиране:', err);
    }
  };

  return (
    <div className="flex flex-col">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
        Сподели с приятели
      </p>

      {isMobileView ? (
        <button 
          onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 w-full p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg font-semibold"
        >
          <Share2 size={20} />
          Сподели офертата
        </button>
      ) : (
        <div className="flex gap-2">
          <button 
            onClick={shareFacebook}
            className="p-3 bg-[#1877F2] text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            title="Сподели във Facebook"
          >
            <Facebook size={18} />
          </button>

          <button 
            onClick={shareViber}
            className="p-3 bg-[#7360f2] text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            title="Изпрати по Viber"
          >
            <Smartphone size={18} />
          </button>

          {/* --- БУТОНЪТ С ТИКЧЕТО --- */}
          <button 
            onClick={copyLink}
            className={`p-3 rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center min-w-[44px] ${
              copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={copied ? "Копирано!" : "Копирай линка"}
          >
            {copied ? (
              <Check size={18} className="animate-in zoom-in duration-300" />
            ) : (
              <LinkIcon size={18} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}