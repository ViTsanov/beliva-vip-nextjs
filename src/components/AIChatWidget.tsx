"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Bot, Sparkles, ChevronDown } from 'lucide-react';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageToAI } from '@/lib/aiService';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTour, setCurrentTour] = useState<any>(null);
  
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Забрана на скрола на тялото при отворен чат на мобилни
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setIsLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const aiResponse = await sendMessageToAI(userText, history, currentTour);
    
    setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* БУТОН ЗА ОТВАРЯНЕ */}
      <div className={`fixed bottom-6 right-6 z-[100] font-sans transition-transform duration-300 ${isOpen ? 'scale-0 md:scale-100' : 'scale-100'}`}>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
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
        <div className="
            fixed z-[9999] bg-white flex flex-col overflow-hidden border-brand-gold/10 shadow-2xl
            inset-0 w-full h-[100dvh] rounded-none
            md:fixed md:inset-auto md:bottom-24 md:right-8 md:w-[400px] md:h-[600px] md:rounded-[2.5rem] md:border
        ">
          
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
                    <Sparkles size={10} /> Специалист: {currentTour.country}
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
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#fcfaf7] space-y-4">
            {messages.length === 0 && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                 <div className="max-w-[90%] bg-white p-5 rounded-2xl rounded-tl-none border border-brand-gold/20 shadow-md text-brand-dark">
                    <p className="text-sm font-medium leading-relaxed">
                      {currentTour 
                        ? `Здравейте! Виждам, че разглеждате "${currentTour.title}". Мога да Ви разкажа за програмата, нужните документи или интересни факти за ${currentTour.country}.`
                        : "Здравейте! Аз съм Вашият VIP пътеводител. Мога да Ви предложа ексклузивни дестинации или да Ви дам контактите на агенцията."}
                    </p>
                 </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-2xl text-sm break-words shadow-sm ${
                  msg.role === 'user' ? 'bg-brand-dark text-white rounded-tr-none' : 'bg-white text-gray-700 border border-brand-gold/10 rounded-tl-none'
                }`}>
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
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
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