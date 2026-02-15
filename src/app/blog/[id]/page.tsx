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
 * Търси първо по SLUG, после по ID.
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
 * Тук се решава проблема с индексирането чрез динамичен Canonical URL.
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
  const description = post.excerpt || post.content?.substring(0, 160).replace(/<[^>]*>/g, '') + "...";
  const url = `${SITE_URL}/blog/${resolvedParams.id}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: title,
    description: description,
    
    // КРИТИЧНО ЗА GOOGLE: Динамичен каноничен адрес
    alternates: {
      canonical: `/blog/${resolvedParams.id}`,
    },

    // Социални мрежи (Facebook, Viber, LinkedIn)
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: 'Beliva VIP Tour',
      images: post.img ? [{ url: post.img, width: 1200, height: 630 }] : [],
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
      images: post.img ? [post.img] : [],
    },

    // Инструкции за роботите
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

  // Структурирани данни (JSON-LD) за Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": post.img,
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
      {/* Добавяне на структурираните данни в head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Клиентският компонент, който управлява визията */}
      <BlogClient post={post} />
    </>
  );
}