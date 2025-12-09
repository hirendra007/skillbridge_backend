import { Hono } from "hono";
import { db } from "../services/firebase";
import { FieldValue } from "firebase-admin/firestore";

const contentRoutes = new Hono<{ Variables: { user: any } }>();

// GET /content/:topicId
// Fetch resources for a topic
contentRoutes.get("/:topicId", async (c) => {
  const { topicId } = c.req.param();
  try {
    const snapshot = await db.collection("mentorContent")
      .where("topicId", "==", topicId)
      .get();
      
    const content = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return c.json(content);
  } catch (error) {
    return c.json({ error: "Failed to fetch content" }, 500);
  }
});

// POST /content
// Mentor uploads a resource
contentRoutes.post("/", async (c) => {
  const user = c.get("user");
  const { topicId, title, type, url, description } = await c.req.json();

  try {
    const newContent = {
      mentorId: user.uid,
      mentorName: user.name || "Mentor",
      topicId,
      title,
      type,
      url,
      description,
      createdAt: FieldValue.serverTimestamp()
    };
    
    await db.collection("mentorContent").add(newContent);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Upload failed" }, 500);
  }
});

export default contentRoutes;