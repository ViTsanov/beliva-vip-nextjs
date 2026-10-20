"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Bot, Sparkles, ChevronDown } from 'lucide-react';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageToAI } from '@/lib/aiService';
import { useBackToClose } from '@/lib/hooks/useBackToClose';

// „Рисуване“ на отговора: показваме текста постепенно, но никога не режем по средата на Markdown линк,
// удебелен текст или код — иначе за миг се виждат суровите [..](https://..) и **. Ако краят попадне вътре
// в такъв откъс, показваме откъса целия.
const MARKDOWN_SPANS = /\[[^\]]*\]\([^)]*\)|\*\*[^*]+\*\*|`[^`]+`/g;
function safeRevealEnd(text: string, n: number): number {
  if (n >= text.length) return text.length;
  for (const m of text.matchAll(MARKDOWN_SPANS)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (n > start && n < end) return end;
    if (start >= n) break;
  }
  return n;
}
// Отговорът се „изписва“ за около 2–3 секунди независимо от дължината (поне 2 знака на кадър).
const REVEAL_FRAMES = 150;

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTour, setCurrentTour] = useState<any>(null);
  // Държавите на тура като текст — полето може да е масив („Япония, Южна Корея“), иначе се слепват.
  const tourCountryLabel = currentTour
    ? (Array.isArray(currentTour.country) ? currentTour.country.join(', ') : String(currentTour.country || ''))
    : '';
  
  const pathname = usePathname();
  const isTourPage = pathname.startsWith('/tour/');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Кой отговор се „изписва“ в момента и колко знака от него се виждат.
  const [typing, setTyping] = useState<{ index: number; shown: number } | null>(null);
  // След като пристигне отговор — скролваме до въпроса (той и началото на отговора са най-горе), не до края.
  const scrollToQuestionRef = useRef(false);

  // Снифване на URL за контекст на екскурзия
  useEffect(() => {
    const updateContext = async () => {
      // В Next.js проверяваме дали пътят започва с /tour/
      if (pathname.startsWith('/tour/')) {
        const urlId = pathname.split('/')[2]; // Взимаме ID-то от /tour/[id]
        
        try {
          // 1. Пробваме по документ ID
          const docRef = doc(db, "tours", urlId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setCurrentTour({ id: docSnap.id, ...docSnap.data() });
          } else {
            // 2. Пробваме по tourId полето (ако ползвате него в URL)
            const q = query(collection(db, "tours"), where("tourId", "==", urlId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const foundDoc = querySnapshot.docs[0];
              setCurrentTour({ id: foundDoc.id, ...foundDoc.data() });
            } else {
              setCurrentTour(null);
            }
          }
        } catch (err) {
          console.error("Context fetch error:", err);
          setCurrentTour(null);
        }
      } else {
        setCurrentTour(null);
      }
    };
    updateContext();
  }, [pathname]); 

  // Скрол на съобщенията:
  // - при отваряне и при изпратен въпрос (с точките „пише…“) — най-долу, за да се види въпросът;
  // - при пристигнал отговор — въпросът застава най-горе, а отговорът започва точно под него. Така дългият
  //   отговор се чете отгоре надолу, вместо да прескочим директно на края му.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;
      if (scrollToQuestionRef.current) {
        scrollToQuestionRef.current = false;
        const questions = container.querySelectorAll<HTMLElement>('[data-role="user"]');
        const lastQuestion = questions[questions.length - 1];
        if (lastQuestion) {
          container.scrollTo({ top: Math.max(0, lastQuestion.offsetTop - 16), behavior: 'smooth' });
          return;
        }
      }
      container.scrollTop = container.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isLoading, isOpen]);

  // „Изписване“ на отговора кадър по кадър. Всички setState са в requestAnimationFrame, не директно в ефекта.
  useEffect(() => {
    if (!typing) return;
    const full = messages[typing.index]?.content ?? '';
    const step = Math.max(2, Math.ceil(full.length / REVEAL_FRAMES));
    const frame = requestAnimationFrame(() => {
      setTyping(t => {
        if (!t) return t;
        const next = safeRevealEnd(full, t.shown + step);
        return next >= full.length ? null : { ...t, shown: next };
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [typing, messages]);

  // Бутонът Назад на телефона затваря чата. Само за мобилни — там чатът е на цял екран
  // и се възприема като отделен "екран"; на десктоп е малък плаващ прозорец.
  useBackToClose(isOpen, () => setIsOpen(false), { mobileOnly: true });

  // На телефон чатът е на цял екран. Страницата отзад се заключва с position: fixed (само overflow: hidden не
  // спира скрола на iPhone), а при затваряне се връща точно където е била. Ефектът е СЛЕД useBackToClose: записът
  // в историята трябва да се добави, преди страницата да се заключи — иначе браузърът запомня позиция 0 и при
  // затваряне (history.back) връща страницата най-горе.
  useEffect(() => {
    if (!isOpen || window.innerWidth >= 768) return;
    const scrollY = window.scrollY;
    const body = document.body.style;
    Object.assign(body, { position: 'fixed', top: `-${scrollY}px`, left: '0', right: '0', overflow: 'hidden' });
    return () => {
      Object.assign(body, { position: '', top: '', left: '', right: '', overflow: '' });
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }, [isOpen]);

  // Клавиатурата на телефона намалява видимата част на екрана, а 100dvh не се намалява с нея — браузърът
  // избутва страницата нагоре и отдолу прозира сайтът. Затова прозорецът следи visualViewport: точно с
  // височината и мястото на видимото над клавиатурата.
  const [visibleArea, setVisibleArea] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!isOpen || window.innerWidth >= 768 || !vv) return;
    const update = () => setVisibleArea({ height: vv.height, top: vv.offsetTop });
    const first = setTimeout(update, 0);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      clearTimeout(first);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setVisibleArea(null);
    };
  }, [isOpen]);


  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setTyping(null); // ако предишният отговор още се „изписва“ — показваме го целия
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setIsLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const aiResponse = await sendMessageToAI(userText, history, currentTour);
    
    // Отговорът ще е след сегашните съобщения и току-що добавения въпрос.
    scrollToQuestionRef.current = true;
    setTyping({ index: messages.length + 1, shown: 0 });
    setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* БУТОН ЗА ОТВАРЯНЕ. data-floating-button: скрива се, докато е отворен диалог (globals.css) */}
      <div data-floating-button className={`fixed z-[100] font-sans transition-transform duration-300 right-6
        ${isTourPage ? 'bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'}
        ${isOpen ? 'scale-0 md:scale-100' : 'scale-100'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Затвори AI асистент' : 'Отвори AI асистент'}
          className="bg-brand-gold text-brand-dark p-4 rounded-full shadow-2xl hover:scale-110 transition-all group relative border-2 border-white"
        >
          <div className="absolute top-1/2 -left-4 -translate-x-full -translate-y-1/2 bg-white text-brand-dark text-[10px] font-black px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-brand-gold/20 uppercase tracking-widest pointer-events-none">
            AI Асистент
          </div>
          {isOpen ? <X size={28} /> : <Bot size={28} />}
          {!isOpen && currentTour && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </button>
      </div>

      {/* ЧАТ ПРОЗОРЕЦ */}
      {isOpen && (
        <div
          className="
            fixed z-[9999] bg-white flex flex-col overflow-hidden overscroll-contain border-brand-gold/10 shadow-2xl
            inset-0 w-full h-[100dvh] rounded-none
            md:fixed md:inset-auto md:bottom-24 md:right-8 md:w-[400px] md:h-[600px] md:rounded-[2.5rem] md:border
          "
          style={visibleArea ? { top: visibleArea.top, height: visibleArea.height, bottom: 'auto' } : undefined}
        >
          
          {/* HEADER */}
          <div className="bg-brand-dark p-4 md:p-6 text-white flex items-center justify-between border-b border-brand-gold/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-gold rounded-full text-brand-dark shadow-lg">
                <Bot size={20} />
              </div>
              <div className="text-left">
                <span className="font-serif italic text-lg block leading-none">Beliva AI</span>
                {currentTour ? (
                  <span className="text-[9px] uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <Sparkles size={10} /> Специалист: {tourCountryLabel}
                  </span>
                ) : (
                  <span className="text-[9px] uppercase tracking-widest text-brand-gold">VIP Асистент</span>
                )}
              </div>
            </div>
            
            <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 transition-all rounded-full flex items-center justify-center bg-red-600 text-white shadow-md active:scale-95 md:bg-transparent md:text-white/70 md:shadow-none md:hover:text-white md:hover:bg-white/10"
            >
               <span className="md:hidden"><ChevronDown size={24} strokeWidth={3} /></span>
               <span className="hidden md:block"><X size={20} /></span>
            </button>
          </div>

          {/* MESSAGES AREA */}
          <div ref={messagesContainerRef} className="relative flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 bg-[#fcfaf7] space-y-4">
            {messages.length === 0 && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                 <div className="max-w-[90%] bg-white p-5 rounded-2xl rounded-tl-none border border-brand-gold/20 shadow-md text-brand-dark">
                    <p className="text-sm font-medium leading-relaxed">
                      {currentTour 
                        ? `Здравейте! Виждам, че разглеждате "${currentTour.title}". Мога да Ви разкажа за програмата, нужните документи или интересни факти за ${tourCountryLabel}.`
                        : "Здравейте! Аз съм Вашият VIP пътеводител. Мога да Ви предложа ексклузивни дестинации или да Ви дам контактите на агенцията."}
                    </p>
                 </div>
              </div>
            )}

            {messages.map((msg, i) => {
              // Отговорът, който се „изписва“ в момента: показваме част от текста + курсор; натискане показва всичко.
              // Екранните четци получават целия текст веднага (sr-only), а анимираната част е скрита за тях.
              const isTyping = typing?.index === i;
              const visibleText = isTyping ? `${msg.content.slice(0, typing.shown)} ▍` : msg.content;
              return (
              <div key={i} data-role={msg.role} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  onClick={isTyping ? () => setTyping(null) : undefined}
                  title={isTyping ? 'Покажи целия отговор' : undefined}
                  className={`max-w-[90%] p-4 rounded-2xl text-sm break-words shadow-sm ${
                  msg.role === 'user' ? 'bg-brand-dark text-white rounded-tr-none' : 'bg-white text-gray-700 border border-brand-gold/10 rounded-tl-none'
                } ${isTyping ? 'cursor-pointer' : ''}`}>
                  {isTyping && <span className="sr-only">{msg.content}</span>}
                  <div aria-hidden={isTyping || undefined}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({...props}) => (
                        <a 
                          {...props} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-gold font-bold underline hover:text-brand-dark transition-colors cursor-pointer"
                        />
                      )
                    }}
                  >
                    {visibleText}
                  </ReactMarkdown>
                  </div>
                </div>
              </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start items-center gap-2 ml-2">
                <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="p-3 md:p-5 bg-white border-t border-brand-gold/10 flex gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Задайте въпрос..." 
              className="flex-1 bg-gray-50 p-3 rounded-2xl outline-none text-base focus:bg-white focus:border-brand-gold border border-transparent transition-all" 
            />
            <button type="submit" disabled={!input.trim() || isLoading} className="bg-brand-dark text-brand-gold p-3 rounded-xl hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-30">
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}