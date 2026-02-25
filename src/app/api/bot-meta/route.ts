import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

const SITE_URL = "https://belivavip.bg";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  // Дефолтни данни
  let title = "Beliva VIP Tour";
  let description = "Луксозни екскурзии и почивки.";
  let image = `${SITE_URL}/hero/australia.webp`;

  try {
    if (!id) throw new Error("No ID");
    const decodedId = decodeURIComponent(id);

    // А) ЕКСКУРЗИИ
    if (type === 'tour') {
      const q = query(collection(db, "tours"), where("tourId", "==", decodedId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        title = `${data.title} | Beliva VIP Tour`;
        const rawDesc = data.intro || data.generalInfo || "";
        description = rawDesc.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...";
        
        let rawImg = data.img || data.images || (data.gallery && data.gallery[0]);
        if (rawImg && rawImg.includes(',')) rawImg = rawImg.split(',')[0].trim();
        
        if (rawImg) {
          // ИЗЧИСТВАМЕ UNSPLASH ЛИНКА ОТ ПРОБЛЕМНИТЕ ПАРАМЕТРИ
          if (rawImg.includes('unsplash.com')) rawImg = rawImg.split('?')[0];
          else if (rawImg.startsWith('/')) rawImg = `${SITE_URL}${rawImg}`;
          image = rawImg;
        }
      }
    } 
    // Б) БЛОГ
    else if (type === 'blog') {
      let blogSnapshot = await getDocs(query(collection(db, "posts"), where("slug", "==", decodedId)));
      
      if (blogSnapshot.empty) {
         const docRef = doc(db, "posts", decodedId);
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
           blogSnapshot = { empty: false, docs: [{ data: () => docSnap.data() }] } as any;
         }
      }

      if (!blogSnapshot.empty) {
        const data = blogSnapshot.docs[0].data();
        title = `${data.title} | Beliva VIP Blog`;
        const rawDesc = data.excerpt || data.content || "";
        description = rawDesc.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...";
        
        let rawImg = data.coverImg || data.image;
        if (rawImg) {
           if (rawImg.startsWith('/')) rawImg = `${SITE_URL}${rawImg}`;
           image = rawImg;
        }
      }
    }

    // ВРЪЩАМЕ ТОЧНО ТВОЯ HTML ЗА РОБОТИ!
    const botHtml = `
      <!DOCTYPE html>
      <html lang="bg">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <meta name="description" content="${description}">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="Beliva VIP Tour">
        <meta property="og:url" content="${SITE_URL}/${type}/${id}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:image" content="${image}">
      </head>
      <body>
        <h1>${title}</h1>
        <img src="${image}" alt="Preview" />
      </body>
      </html>
    `;

    return new NextResponse(botHtml, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600'
      },
    });

  } catch (error) {
    return new NextResponse(`<html><body><h1>Beliva VIP Tour</h1></body></html>`, { 
      headers: { 'Content-Type': 'text/html' }
    });
  }
}