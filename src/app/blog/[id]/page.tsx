import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"; // 👈 Добавени импорти
import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import BlogClient from "@/components/BlogClient";

type Props = {
  params: { id: string }
};

// 1. Подобрена функция за извличане (Търси по ID или Slug)
async function getPostData(identifier: string) {
  if (!identifier) return null;
  
  // URL decoder (в случай че има кирилица в URL-а, напр. /blog/австралия)
  const decodedId = decodeURIComponent(identifier);

  try {
    let postData = null;
    let postId = null;

    // A. Първо пробваме да намерим по Slug (това е най-вероятното)
    const q = query(collection(db, "posts"), where("slug", "==", decodedId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      postData = doc.data();
      postId = doc.id;
    } 
    else {
      // B. Ако не намерим по Slug, пробваме директно по ID
      try {
        const docRef = doc(db, "posts", decodedId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
           postData = docSnap.data();
           postId = docSnap.id;
        }
      } catch (e) {
        // Ако decodedId не е валидно ID, просто продължаваме
      }
    }

    if (!postData) return null;

    // ВАЖНО: Сериализираме датите (Firebase Timestamp -> String)
    return {
      id: postId,
      ...postData,
      createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString() : null,
      updatedAt: postData.updatedAt?.toDate ? postData.updatedAt.toDate().toISOString() : null,
    };

  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

// 2. ДИНАМИЧНИ МЕТАДАННИ
export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const resolvedParams = await params;
  const post: any = await getPostData(resolvedParams.id);

  if (!post) {
    return {
      title: 'Статията не е намерена | Beliva VIP Blog',
    };
  }

  return {
    title: `${post.title} | Beliva VIP Blog`,
    description: post.excerpt || `Прочетете повече за ${post.title}`,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.img ? [post.img] : [],
      type: 'article',
    },
  };
}

// 3. Основен компонент
export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post: any = await getPostData(resolvedParams.id);

  // Ако статията не съществува -> 404 страница
  if (!post) {
    notFound();
  }

  return <BlogClient post={post} />;
}