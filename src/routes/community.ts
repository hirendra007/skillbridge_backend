import { Hono } from "hono";
import { db } from "../services/firebase";
import { FieldValue } from "firebase-admin/firestore";

const communityRoutes = new Hono<{ Variables: { user: any } }>();

// GET /community/:topicId - Get all posts for a topic
communityRoutes.get("/:topicId", async (c) => {
  const { topicId } = c.req.param();
  try {
    const snapshot = await db.collection("communityPosts")
      .where("topicId", "==", topicId)
      .orderBy("createdAt", "desc")
      .get();

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return c.json(posts);
  } catch (error) {
    console.error("Error fetching community posts:", error);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

// POST /community - Create a new post
communityRoutes.post("/", async (c) => {
  const user = c.get("user");
  const { topicId, title, content, authorName } = await c.req.json();

  if (!title || !content) return c.json({ error: "Missing fields" }, 400);

  try {
    const newPost = {
      topicId,
      authorId: user.uid,
      authorName: authorName || "Learner",
      title,
      content,
      likes: 0,
      replyCount: 0,
      createdAt: FieldValue.serverTimestamp()
    };
    
    await db.collection("communityPosts").add(newPost);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to post" }, 500);
  }
});

// GET /community/post/:postId - Get a single post details + replies
communityRoutes.get("/post/:postId", async (c) => {
  const { postId } = c.req.param();
  
  try {
    // 1. Get Post
    const postDoc = await db.collection("communityPosts").doc(postId).get();
    if (!postDoc.exists) return c.json({ error: "Post not found" }, 404);
    
    // 2. Get Replies (Sub-collection)
    const repliesSnap = await postDoc.ref.collection("replies").orderBy("createdAt", "asc").get();
    const replies = repliesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return c.json({ post: { id: postDoc.id, ...postDoc.data() }, replies });
  } catch (error) {
    return c.json({ error: "Failed to fetch details" }, 500);
  }
});

// POST /community/post/:postId/reply - Add a reply
communityRoutes.post("/post/:postId/reply", async (c) => {
  const user = c.get("user");
  const { postId } = c.req.param();
  const { content, authorName } = await c.req.json();

  try {
    const reply = {
      postId,
      authorId: user.uid,
      authorName: authorName || "Learner",
      content,
      createdAt: FieldValue.serverTimestamp()
    };

    const postRef = db.collection("communityPosts").doc(postId);
    
    await db.runTransaction(async (t) => {
      // Add reply to subcollection
      const replyRef = postRef.collection("replies").doc();
      t.set(replyRef, reply);
      
      // Increment reply count on parent
      t.update(postRef, { replyCount: FieldValue.increment(1) });
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to reply" }, 500);
  }
});

export default communityRoutes;