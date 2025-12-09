import { Hono } from "hono";
import { db } from "../services/firebase";
import { Lesson } from "../types/models";

const lessonsRoutes = new Hono();

// GET /lessons/:topicId
lessonsRoutes.get("/:topicId", async (c) => {
  const { topicId } = c.req.param();

  try {
    const snapshot = await db
      .collection("lessons")
      .where("topicId", "==", topicId)
      .get();

    if (snapshot.empty) return c.json([]);

    const lessons = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Lesson, "id">),
    }));

    // Sort by order: 1, 2, 3...
    lessons.sort((a: any, b: any) => a.order - b.order);

    return c.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons list:", error);
    return c.json({ error: "Failed to fetch lessons" }, 500);
  }
});

export default lessonsRoutes;