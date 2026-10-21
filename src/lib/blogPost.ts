import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// Статия по slug или по ID на документа (сървърна). Ползва се от /blog/[id] и от снимката за превю /blog/[id]/og.jpg.
export async function getPostData(identifier: string) {
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
