import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import BlogClient from "@/components/BlogClient";
import { getPostData } from "@/lib/blogPost";
import { blogShareImage, shareMetadata } from "@/lib/shareMeta";

// Константа за вашия домейн
const SITE_URL = "https://belivavip.bg";

// Готовата страница се обновява на 30 минути (като списъка /blog)
export const revalidate = 1800;

// Празен списък = статиите не се правят при build, а при първото отваряне, и после се пазят готови (ISR).
// Така мета таговете (og:image и т.н.) са в <head> — иначе Next ги пращаше в <body> и Messenger показваше гол линк.
export async function generateStaticParams() {
  return [];
}

type Props = {
  params: { id: string }
};

/**
 * 1. ГЕНЕРИРАНЕ НА ДИНАМИЧНИ МЕТАДАННИ (SEO)
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post: any = await getPostData(resolvedParams.id);

  if (!post) {
    return {
      title: 'Статията не е намерена',
    };
  }

  // Без собствен суфикс — шаблонът в layout.tsx добавя „| Beliva VIP Tour“ (иначе излизаха два суфикса)
  const title = post.title;
  const description = (post.excerpt || post.content || "").substring(0, 160).replace(/<[^>]*>/g, '') + "...";
  // Каноничният адрес е по slug, дори статията да е отворена по ID на документа
  const url = `${SITE_URL}/blog/${post.slug || resolvedParams.id}`;

  // Снимката за превю — корицата като JPEG 1200×630 (/blog/<id>/og.jpg); без корица — снимката по подразбиране
  const imageUrl = blogShareImage(post.slug || resolvedParams.id, post);

  return {
    title: title,
    description: description,
    
    alternates: {
      canonical: url,
    },

    // Социални мрежи (Facebook, Messenger, Viber, LinkedIn, X)
    ...shareMetadata({
      path: `/blog/${post.slug || resolvedParams.id}`,
      title,
      description,
      image: imageUrl,
      imageAlt: post.title,
      type: 'article',
      article: { publishedTime: post.createdAt, authors: [post.author || 'Beliva VIP'] },
    }),

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
 * 2. ОСНОВЕН КОМПОНЕНТ НА СТРАНИЦАТА
 */
export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post: any = await getPostData(resolvedParams.id);

  if (!post) {
    notFound();
  }

  // Същата снимка като в превюто — за JSON-LD
  const imageUrl = blogShareImage(post.slug || resolvedParams.id, post);

  // Структурирани данни (JSON-LD) за Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": imageUrl,
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