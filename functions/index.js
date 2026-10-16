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

    // Логваме въпроса за статистиката "най-често задавани въпроси" в admin панела — fire-and-forget,
    // не блокираме/чупиме чата, ако логването гръмне по някаква причина.
    if (message && typeof message === "string" && message.trim()) {
        db.collection("chatQuestions").add({
            message: message.trim(),
            normalized: message.trim().toLowerCase(),
            tourTitle: tourContext?.title || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch((err) => console.error("[chatQuestions log]", err));
    }

    try {
        // 1. Извличане на информация за компанията
        const companySnap = await db.doc("settings/company").get();
        const companyInfo = companySnap.exists 
            ? companySnap.data().info 
            : "Beliva VIP Tour е туристическа агенция за екзотични пътешествия.";

        // 2. Извличане на каталога — с линк към всеки тур, всички предстоящи дати и маркери за промоция,
        //    потвърдена група и турове, водени от Поли. Без линка AI-ят не може да препраща към тура.
        const SITE_URL = "https://belivavip.bg";
        const today = new Date().toISOString().slice(0, 10);
        const toIso = (d) => {
            if (!d) return "";
            if (typeof d === "object" && typeof d.toDate === "function") return d.toDate().toISOString().slice(0, 10);
            const str = String(d).trim().split("T")[0];
            const a = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (a) return `${a[1]}-${a[2].padStart(2, "0")}-${a[3].padStart(2, "0")}`;
            const b = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
            return b ? `${b[3]}-${b[2].padStart(2, "0")}-${b[1].padStart(2, "0")}` : "";
        };
        const display = (iso) => iso.split("-").reverse().join(".");

        const toursSnap = await db.collection("tours").where("status", "==", "public").get();
        const catalog = toursSnap.docs.map(doc => {
            const t = doc.data();
            const url = `${SITE_URL}/tour/${encodeURIComponent(t.slug || t.tourId || doc.id)}`;
            const countries = (Array.isArray(t.country) ? t.country : [t.country])
                .flatMap(c => String(c || "").split(","))
                .map(c => c.trim())
                .filter(Boolean);
            const dates = [...new Set([...(Array.isArray(t.dates) ? t.dates : []), t.date].map(toIso).filter(Boolean))]
                .filter(d => d >= today)
                .sort();
            const promoActive = !!(t.isPromo && t.discountPrice) &&
                (!t.promoStart || !t.promoEnd || (today >= String(t.promoStart).slice(0, 10) && today <= String(t.promoEnd).slice(0, 10)));
            const marks = [
                promoActive ? `ПРОМОЦИЯ: ${t.discountPrice} вместо ${t.price}` : null,
                t.groupStatus === "confirmed" ? "ПОТВЪРДЕНА ГРУПА" : null,
                t.groupStatus === "last-places" ? "ПОСЛЕДНИ МЕСТА" : null,
                Array.isArray(t.categories) && t.categories.includes("Водена от ПОЛИ") ? "ВОДЕНА ОТ ПОЛИ" : null,
            ].filter(Boolean);
            const line = `- ${t.title} | Държави: ${countries.join(", ")} | Цена от: ${t.price || "по запитване"} | Дати: ${dates.length ? dates.map(display).join(", ") : "по запитване"}${marks.length ? " | " + marks.join(" | ") : ""} | Линк: ${url}`;
            return { line, countries, priority: marks.length, firstDate: dates[0] || "9999" };
        });
        const toursList = catalog.map(c => c.line).join("\n");

        // 2a. Кои дестинации споменава въпросът — търсим го в кода, а не оставяме модела да „преценява“
        //     (иначе за „Япония“ предлагаше и „Тибет и Китай“). Сравняваме по корена на думата, за да хване
        //     и форми като „Японията“, „Китай/Китая“; при имена от няколко думи („Южна Корея“) — по последната.
        const words = String(message || "").toLowerCase().match(/[\p{L}]+/gu) || [];
        const mentions = (country) => {
            const name = country.toLowerCase().split(/\s+/).pop();
            if (!name) return false;
            const stem = name.length <= 4 ? name : name.slice(0, name.length - (name.length >= 6 ? 2 : 1));
            return words.some(w => w.startsWith(stem) && w.length <= name.length + 4);
        };
        const allCountries = [...new Set(catalog.flatMap(c => c.countries))];
        const askedCountries = allCountries.filter(mentions);
        const matching = askedCountries.length
            ? catalog
                .filter(c => c.countries.some(cn => askedCountries.includes(cn)))
                .sort((a, b) => b.priority - a.priority || a.firstDate.localeCompare(b.firstDate))
            : [];
        const matchingSection = askedCountries.length
            ? (matching.length
                ? `ТУРОВЕ ЗА ДЕСТИНАЦИЯТА ОТ ВЪПРОСА (${askedCountries.join(", ")}) — вече филтрирани по полето „Държави“ и подредени по приоритет.\nПрепоръчвай САМО от този списък, в този ред; не добавяй турове за други държави:\n${matching.map(c => c.line).join("\n")}`
                : `Въпросът е за ${askedCountries.join(", ")}, но в момента нямаме тур за тази дестинация.`)
            : "";

        // 3. Промпт
        const systemPrompt = `
Ти си Beliva VIP Assistant – експерт по луксозни пътешествия.

ИНФОРМАЦИЯ ЗА КОМПАНИЯТА:
${companyInfo}

НАШИЯТ КАТАЛОГ С ЕКСКУРЗИИ:
${toursList}

${matchingSection}

${tourContext ? `ВАЖНО: Потребителят разглежда в момента: "${tourContext.title}".` : "Потребителят е на началната страница или разглежда общия списък."}

ИНСТРУКЦИИ ЗА ПОВЕДЕНИЕ:
1. Отговаряй винаги на БЪЛГАРСКИ език. Тонът ти трябва да е любезен, интригуващ и вдъхновяващ.
2. Използвай Markdown: **bold** за акценти и списъци за прегледност.
3. Когато предлагаш дестинация, споменавай цената и защо е специална.
4. Ако потребителят се интересува от конкретна оферта, дай му детайли за нея.
5. Завършвай с покана за връзка (Email/WhatsApp), ако усетиш, че клиентът е готов за резервация.
6. Ако усетиш, че потребителят иска да следи офертите ни дългосрочно, предложи му да се запише за нашия "VIP Бюлетин" в най-долната част на страницата.
7. ЛИНКОВЕ — ЗАДЪЛЖИТЕЛНО: Всеки път, когато споменаваш или препоръчваш конкретна екскурзия от каталога, дай линк към нея
   като Markdown линк със заглавието на тура и ТОЧНИЯ адрес от полето „Линк“ в каталога, например:
   [Омагьосващата Япония: Токио, Киото и Осака](${SITE_URL}/tour/...)
   Текстът на линка е ВИНАГИ заглавието на тура — никога „тук“, „научете повече“ или самия адрес.
   Никога не измисляй адрес и не съкращавай линка. Ако тур няма в каталога, не го предлагай.
8. Когато потребителят пита за пътувания в държава, регион или континент: ако по-горе има „ТУРОВЕ ЗА ДЕСТИНАЦИЯТА
   ОТ ВЪПРОСА“, ползвай само тях. Иначе намери подходящите турове в каталога САМО по полето „Държави“ (тур за
   друга държава не е подходящ). Изброй до 4 — всеки на отделен ред: линк със заглавието, цена и ВСИЧКИ дати от каталога.
   Първо подреди тези с ПРОМОЦИЯ, ПОТВЪРДЕНА ГРУПА, ПОСЛЕДНИ МЕСТА или ВОДЕНА ОТ ПОЛИ и кажи защо са специални.
   Ако има повече от 4, кажи колко още има и дай линк към всички: ${SITE_URL}/#tours-grid
9. Ако няма тур за исканата дестинация, кажи го честно и предложи запитване: ${SITE_URL}/contacts
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
            // Отговорите вече съдържат линкове (дълги адреси) — 500 токена отрязваха списъка с турове.
            max_tokens: 900
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
// 2. FACEBOOK OG IMAGE PROXY (СЪС ЗАЩИТА СРЕЩУ БЛОКИРАНЕ)
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
    // 🚀 ТУК Е ФИКСЪТ: Преструваме се на реален Chrome браузър!
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    
    if (!response.ok) {
       console.error("Unsplash Error:", response.status, response.statusText);
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