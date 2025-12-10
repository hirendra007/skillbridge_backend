// src/routes/generateLessons.ts
import { Hono } from "hono";
import { db } from "../services/firebase";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const generateRoutes = new Hono();

generateRoutes.post("/", async (c) => {
  const { topics } = await c.req.json<{ topics: string[] }>();
  if (!topics || !Array.isArray(topics)) {
    return c.json({ error: "topics[] required" }, 400);
  }

  const model = google("gemini-2.5-flash");
  const results: Record<string, any[]> = {};

  for (const topic of topics) {
    // Find or create the topicId
    const topicRef = await db
      .collection("topics")
      .where("name", "==", topic)
      .limit(1)
      .get();
    let topicId: string;
    if (topicRef.empty) {
      const doc = await db.collection("topics").add({ name: topic });
      topicId = doc.id;
    } else {
      topicId = topicRef.docs[0].id;
    }

    // UPDATED: The new, more efficient prompt
    // The correct way to define the elaborated schema within the template string:

    const systemPrompt = `You are an expert instructional designer. For the topic "${topic}", generate a JSON array of 3 unique, beginner-level lessons. Respond ONLY with a raw JSON array.

**IMPORTANT CONTENT INSTRUCTIONS:**
1.  **Elaboration:** The 'content' array for each lesson must be highly elaborated, consisting of at least 5 distinct objects.
2.  **Detail:** Ensure each text block is comprehensive, not just a short sentence.

Each object in the array must match this schema:
{
  "title": "string",
  "xp": 100,
  "estimatedMinutes": 10,
  "difficulty": "beginner",
  "tags": "string[]",
  "content": [
    { "type": "paragraph", "text": "The primary explanation of the concept goes here. This should be a robust paragraph detailing the core idea." },
    { "type": "key-concept", "text": "KEY CONCEPT: A concise, impactful definition of the most vital term or rule in the lesson." },
    { "type": "paragraph", "text": "A secondary paragraph that provides supporting context, examples, or differentiates this concept from related ideas. This ensures complexity and depth." },
    { "type": "tip", "text": "PRO TIP: Offer specific, actionable advice or a common pitfall to avoid in the real world." },
    { "type": "paragraph", "text": "A concluding statement that summarizes the main takeaways and transitions the student mentally toward the assessment." }
  ],
  "assessment": {
    "passingScore": 80,
    "questions": [
      {
        "id": "string (e.g., 'q1')",
        "questionText": "string",
        "quizType": "multiple-choice",
        "tags": "string[]",
        "options": [{ "id": "string", "text": "string" }],
        "correctAnswerId": "string",
        "explanation": "string"
      }
    ]
  }
}`;

    try {
      // FIX: Use systemPrompt instead of the undefined 'prompt' variable
      const { text } = await generateText({ model, prompt: systemPrompt, temperature: 0.4 });
      
      const clean = text.replace(/```json|```/g, "").trim();
      const lessons = JSON.parse(clean); // This is now an array of lessons

      const batch = db.batch();
      const generatedLessons = [];

      // UPDATED: Loop through the array of lessons returned by the AI
      for (const [index, lesson] of lessons.entries()) {
        // Use .entries() to get the index
        const lessonRef = db.collection("lessons").doc();
        batch.set(lessonRef, {
          ...lesson,
          topicId,
          order: index + 1, // <-- ADD THIS LINE (e.g., 1, 2, 3, 4, 5)
          createdAt: new Date(),
        });
        generatedLessons.push({ id: lessonRef.id, ...lesson });
      }

      await batch.commit(); // Commit all lessons to Firestore at once
      results[topic] = generatedLessons;
    } catch (error) {
      console.error(
        `Failed to generate lessons for topic "${topic}". Error:`,
        error
      );
      results[topic] = []; // Add an empty array for failed topics
    }
  }

  return c.json({ status: "ok", results });
});

export default generateRoutes;