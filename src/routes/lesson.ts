import { Hono } from "hono";
import { db } from "../services/firebase";

const lessonRoute = new Hono();

// GET /lesson/:id
lessonRoute.get("/:id", async (c) => {
  const { id } = c.req.param();

  try {
    const doc = await db.collection("lessons").doc(id).get();
    
    if (!doc.exists) {
      return c.json({ error: "Lesson not found" }, 404);
    }

    // CRITICAL FIX: Manually attaching the ID
    const lessonData = {
      id: doc.id, 
      ...doc.data()
    };

    return c.json(lessonData);
  } catch (error) {
    console.error("Error fetching single lesson:", error);
    return c.json({ error: "Internal Error" }, 500);
  }
});

export default lessonRoute;