// src/routes/generateLessons.ts
import { Hono } from "hono";
import { db } from "../services/firebase";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const generateRoutes = new Hono();

// Define the difficulties to generate lessons for
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

generateRoutes.post("/", async (c) => {
  const { topics } = await c.req.json<{ topics: string[] }>();
  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    return c.json({ error: "topics[] required" }, 400);
  }

  // NOTE: The `google()` function relies on the GOOGLE_GENERATIVE_AI_API_KEY environment variable.
  const model = google("gemini-2.5-flash");
  const results: Record<string, any[]> = {};

  for (const topic of topics) {
    // 1. Find or create the topicId
    const topicRef = await db
      .collection("topics")
      .where("name", "==", topic)
      .limit(1)
      .get();
    let topicId: string;
    if (topicRef.empty) {
      // Create new topic if it doesn't exist (e.g., if seed data wasn't run)
      const doc = await db.collection("topics").add({ name: topic, createdAt: new Date() });
      topicId = doc.id;
    } else {
      topicId = topicRef.docs[0].id;
    }

    try {
      const generatedLessons = [];
      const batch = db.batch();
      let lessonOrder = 1; // Counter to ensure lessons are ordered sequentially (1-9)

      // 2. Loop through each difficulty level (easy, medium, hard)
      for (const difficulty of DIFFICULTIES) {
        
        // Define dynamic XP and estimated time based on difficulty
        const xp = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 150;
        const estimatedMinutes = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15;

        // 3. Define the dynamic system prompt
        const systemPrompt = `You are an expert instructional designer. For the topic "${topic}", generate a JSON array of 3 unique, **${difficulty}**-level lessons. Respond ONLY with a raw JSON array. The 'difficulty' field in the schema MUST be set to '${difficulty}'.

Each object in the array must match this schema:
{
  "title": "string",
  "xp": ${xp},
  "estimatedMinutes": ${estimatedMinutes},
  "difficulty": "${difficulty}", // IMPORTANT: Ensure this matches the current level
  "tags": "string[]",
  "content": [{ "type": "string", "text": "string" }],
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

        // 4. API Call using dynamic systemPrompt
        const { text } = await generateText({ model, prompt: systemPrompt, temperature: 0.4 });
        
        // 5. ROBUST JSON CLEANUP AND PARSING
        // Match the entire array structure to remove surrounding text/markdown fences (```json)
        const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/); 
      
        if (!jsonMatch || jsonMatch.length === 0) {
            throw new Error(`AI output for ${topic} (${difficulty}) did not contain a recognizable JSON array.`);
        }
        
        const clean = jsonMatch[0].trim();
        const lessons = JSON.parse(clean); 
        
        if (!Array.isArray(lessons)) {
            throw new Error(`Parsed JSON for ${topic} (${difficulty}) is not an array of lessons.`);
        }

        // 6. Add lessons to the Firestore Batch
        for (const lesson of lessons) {
          const lessonRef = db.collection("lessons").doc();
          batch.set(lessonRef, {
            ...lesson,
            topicId,
            order: lessonOrder++, // Incrementing order across all difficulties
            createdAt: new Date(),
          });
          generatedLessons.push({ id: lessonRef.id, ...lesson });
        }
      } // End of difficulty loop

      // 7. Commit the batch for all 9 lessons of the current topic
      await batch.commit();
      results[topic] = generatedLessons;

    } catch (error) {
      console.error(
        `Failed to generate lessons for topic "${topic}". Error:`,
        error
      );
      // Log the failure but allow the overall route to return a 200 with partial results
      results[topic] = []; 
    }
  }

  return c.json({ status: "ok", results });
});

export default generateRoutes;