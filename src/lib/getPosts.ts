import { collection, getDocs, query, where, doc, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Helper за почистване на дати
const serializePost = (data: any, id: string) => {
  return {
    ...data,
    id: id,
    // ВАЖНО: Тук оправяме грешката с Timestamp
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null, 
  };
};

// 1. Взимане на ВСИЧКИ статии
export async function getAllPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => serializePost(doc.data(), doc.id));
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

// 2. Взимане на ЕДНА статия
export async function getPost(slugOrId: string) {
  try {
    const q = query(collection(db, "posts"), where("slug", "==", slugOrId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return serializePost(snapshot.docs[0].data(), snapshot.docs[0].id);
    }

    const docRef = doc(db, "posts", slugOrId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return serializePost(docSnap.data(), docSnap.id);
    }

    return null;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}