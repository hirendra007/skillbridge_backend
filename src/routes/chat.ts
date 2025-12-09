import { Hono } from "hono";
import { db } from "../services/firebase";
import { FieldValue } from "firebase-admin/firestore";

const chatRoutes = new Hono<{ Variables: { user: any } }>();

// GET /chat/:requestId
// Fetch chat history for a specific mentorship request
chatRoutes.get("/:requestId", async (c) => {
  const { requestId } = c.req.param();
  try {
    const snapshot = await db.collection("mentorshipRequests")
      .doc(requestId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .get();

    const messages = snapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data(),
      // Convert timestamp to date string for frontend safety
      createdAt: doc.data().createdAt?.toDate() || new Date() 
    }));

    return c.json(messages);
  } catch (error) {
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

// POST /chat/:requestId
// Send a new message
chatRoutes.post("/:requestId", async (c) => {
  const user = c.get("user");
  const { requestId } = c.req.param();
  const { text } = await c.req.json();

  if (!text) return c.json({ error: "Message empty" }, 400);

  try {
    const newMessage = {
      text,
      user: {
        _id: user.uid,
        name: user.name || "User",
      },
      createdAt: FieldValue.serverTimestamp()
    };

    await db.collection("mentorshipRequests")
      .doc(requestId)
      .collection("messages")
      .add(newMessage);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to send" }, 500);
  }
});

export default chatRoutes;