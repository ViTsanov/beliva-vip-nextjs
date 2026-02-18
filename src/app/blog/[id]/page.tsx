import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import BlogClient from "@/components/BlogClient";

// Константа за вашия домейн
const SITE_URL = "https://belivavip.bg";

type Props = {
  params: { id: string }
};

/**
 * 1. Функция за извличане на данни (Сървърна)
 */
async function getPostData(identifier: string) {
  if (!identifier) return null;
  
  const decodedId = decodeURIComponent(identifier);

  try {
    let postData = null;
    let postId = null;

    // А. Търсене по Slug
    const q = query(collection(db, "posts"), where("slug", "==", decodedId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      postData = doc.data();
      postId = doc.id;
    } 
    else {
      // Б. Търсене по ID
      try {
        const docRef = doc(db, "posts", decodedId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
           postData = docSnap.data();
           postId = docSnap.id;
        }
      } catch (e) {
        return null;
      }
    }

    if (!postData) return null;

    // Сериализация на датите за Next.js
    return {
      id: postId,
      ...postData,
      createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: postData.updatedAt?.toDate ? postData.updatedAt.toDate().toISOString() : null,
    };

  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

/**
 * 2. ГЕНЕРИРАНЕ НА ДИНАМИЧНИ МЕТАДАННИ (SEO)
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post: any = await getPostData(resolvedParams.id);

  if (!post) {
    return {
      title: 'Статията не е намерена | Beliva VIP Blog',
    };
  }

  const title = `${post.title} | Beliva VIP Blog`;
  const description = (post.excerpt || post.content || "").substring(0, 160).replace(/<[^>]*>/g, '') + "...";
  const url = `${SITE_URL}/blog/${resolvedParams.id}`;

  // --- ЛОГИКА ЗА СНИМКАТА (FIX) ---
  // 1. Взимаме снимката (coverImg или img) или слагаме дефолтна
  const rawImage = post.coverImg || post.img || "/og-default.jpg";
  
  // 2. Правим я абсолютен път (ако вече не е)
  const imageUrl = rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: title,
    description: description,
    
    alternates: {
      canonical: `/blog/${resolvedParams.id}`,
    },

    // Социални мрежи (Facebook, Viber, LinkedIn)
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: 'Beliva VIP Tour',
      images: [
        {
          url: imageUrl, // 👈 Вече е гарантирано пълен URL
          width: 1200,   // 👈 Задължително за Facebook
          height: 630,   // 👈 Задължително за Facebook
          alt: post.title,
        }
      ],
      locale: 'bg_BG',
      type: 'article',
      publishedTime: post.createdAt,
      authors: [post.author || 'Beliva VIP'],
    },

    // Twitter / X
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * 3. ОСНОВЕН КОМПОНЕНТ НА СТРАНИЦАТА
 */
export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post: any = await getPostData(resolvedParams.id);

  if (!post) {
    notFound();
  }

  // Изчисляваме снимката и тук за JSON-LD
  const rawImage = post.coverImg || post.img || "/og-default.jpg";
  const imageUrl = rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage}`;

  // Структурирани данни (JSON-LD) за Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": imageUrl, // 👈 Ползваме пълния URL
    "datePublished": post.createdAt,
    "author": {
      "@type": "Person",
      "name": post.author || "Beliva VIP"
    },
    "description": post.excerpt || post.title,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${resolvedParams.id}`
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <BlogClient post={post} />
    </>
  );
}