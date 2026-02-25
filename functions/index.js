const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { OpenAI } = require("openai");

// Инициализираме Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// 1. AI CHAT FUNCTION
// ============================================================================
exports.chatWithAI = onCall({ 
    region: "us-central1",
    secrets: ["OPENAI_API_KEY"] 
}, async (request) => {
    // 0. Инициализация на OpenAI
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, 
    });

    const { message, history, context: tourContext } = request.data;

    try {
        // 1. Извличане на информация за компанията
        const companySnap = await db.doc("settings/company").get();
        const companyInfo = companySnap.exists 
            ? companySnap.data().info 
            : "Beliva VIP Tour е туристическа агенция за екзотични пътешествия.";

        // 2. Извличане на каталога
        const toursSnap = await db.collection("tours").where("status", "==", "public").get();
        const toursList = toursSnap.docs.map(doc => {
            const t = doc.data();
            return `- ${t.title} (${t.country}): Цена ${t.price}, Дати: ${t.date || 'По запитване'}`;
        }).join("\n");

        // 3. Промпт
        const systemPrompt = `
Ти си Beliva VIP Assistant – експерт по луксозни пътешествия.

ИНФОРМАЦИЯ ЗА КОМПАНИЯТА:
${companyInfo}

НАШИЯТ КАТАЛОГ С ЕКСКУРЗИИ:
${toursList}

${tourContext ? `ВАЖНО: Потребителят разглежда в момента: "${tourContext.title}".` : "Потребителят е на началната страница или разглежда общия списък."}

ИНСТРУКЦИИ ЗА ПОВЕДЕНИЕ:
1. Отговаряй винаги на БЪЛГАРСКИ език. Тонът ти трябва да е любезен, интригуващ и вдъхновяващ.
2. Използвай Markdown: **bold** за акценти и списъци за прегледност.
3. Когато предлагаш дестинация, споменавай цената и защо е специална.
4. Ако потребителят се интересува от конкретна оферта, дай му детайли за нея.
5. Завършвай с покана за връзка (Email/WhatsApp), ако усетиш, че клиентът е готов за резервация.
6. Ако усетиш, че потребителят иска да следи офертите ни дългосрочно, предложи му да се запише за нашия "VIP Бюлетин" в най-долната част на страницата.
`;

        // 4. Заявка към OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", 
            messages: [
                { role: "system", content: systemPrompt },
                ...(history || []),
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        return {
            reply: completion.choices[0].message.content
        };

    } catch (error) {
        console.error("AI Error:", error);
        throw new HttpsError("internal", "Извинете, асистентът има временна техническа трудност.");
    }
});

// ============================================================================
// 2. FACEBOOK OG IMAGE PROXY
// ============================================================================
exports.proxyOgImage = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  const tourId = req.query.id;
  const fallbackImg = "https://belivavip.bg/hero/australia.webp";

  if (!tourId) {
    return res.redirect(fallbackImg);
  }

  try {
    // 1. Търсим тура
    const snapshot = await db.collection("tours").where("tourId", "==", tourId).limit(1).get();

    if (snapshot.empty) {
      return res.redirect(fallbackImg);
    }

    const tour = snapshot.docs[0].data();
    let rawImage = "";

    // 2. Намираме снимката
    if (tour.img && typeof tour.img === "string") rawImage = tour.img;
    else if (tour.images && typeof tour.images === "string") rawImage = tour.images;
    else if (Array.isArray(tour.gallery) && tour.gallery.length > 0) rawImage = tour.gallery[0];

    // Чистим запетаи
    if (rawImage.includes(",")) {
      rawImage = rawImage.split(",")[0].trim();
    }

    if (!rawImage || rawImage.length < 5) {
      return res.redirect(fallbackImg);
    }

    let targetUrl = rawImage;

    // 3. Форматираме URL-а за Facebook
    if (targetUrl.includes("unsplash.com")) {
      targetUrl = targetUrl.split("?")[0] + "?w=1200&h=630&fit=crop&q=80";
    } else if (targetUrl.startsWith("/")) {
      targetUrl = `https://belivavip.bg${targetUrl}`;
    }

    // 4. Теглим и сервираме снимката (Сървърно)
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
       return res.redirect(fallbackImg);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000"); 
    return res.status(200).send(buffer);

  } catch (error) {
    console.error("Error proxying image:", error);
    return res.redirect(fallbackImg);
  }
});