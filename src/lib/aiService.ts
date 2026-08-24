import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase'; // Сега това вече ще работи!

interface AIChatRequest {
  message: string;
  history: { role: string; content: string }[];
  context?: Record<string, unknown>;
  pageType?: string;
}

interface AIChatResponse {
  reply: string;
}

// src/lib/aiService.ts - Обновената функция
export const sendMessageToAI = async (
  userMessage: string, 
  history: {role: string, content: string}[], 
  currentTourContext?: Record<string, unknown>,
  currentPageType?: string // добавяме тип на страницата
) => {
  try {
    const chatFunction = httpsCallable<AIChatRequest, AIChatResponse>(functions, 'chatWithAI');

    // Изпращаме заявката
    const result = await chatFunction({ 
      message: userMessage,
      history: history,
      context: currentTourContext, // Данни за текущия тур (ако има)
      pageType: currentPageType     // Напр. "home", "tour_page", "blog"
    });

    return result.data.reply;
  } catch (error) {
    console.error("AI Error:", error);
    return "Възникна грешка при връзката с асистента.";
  }
};