import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase'; // Сега това вече ще работи!

// src/lib/aiService.ts - Обновената функция
export const sendMessageToAI = async (
  userMessage: string, 
  history: {role: string, content: string}[], 
  currentTourContext?: any,
  currentPageType?: string // добавяме тип на страницата
) => {
  try {
    const chatFunction = httpsCallable(functions, 'chatWithAI');

    // Изпращаме заявката
    const result: any = await chatFunction({ 
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