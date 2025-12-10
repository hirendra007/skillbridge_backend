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

  // Ensure the API Key is available via environment variables for @ai-sdk/google
  if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set.");
      return c.json({ error: "Server configuration error: AI key missing." }, 500);
  }

  const model = google("gemini-2.0-flash");
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
      // Should not happen if seed.ts ran, but added for robustness
      const doc = await db.collection("topics").add({ name: topic, createdAt: new Date() });
      topicId = doc.id;
    } else {
      topicId = topicRef.docs[0].id;
    }

    // 2. Define the elaborated, forceful prompt
    const systemPrompt = `You are an expert instructional designer. For the topic "${topic}", generate a JSON array of 3 unique, beginner-level lessons. Respond ONLY with a raw JSON array.

**CRITICAL CONTENT INSTRUCTIONS:**
1.  **MINIMUM LENGTH:** The 'content' array for each lesson MUST contain a total of at least 5 distinct objects.
2.  **ELABORATION REQUIREMENT:** The text field within any object of type **"paragraph"** must be **VERBOSE and EXHAUSTIVE**, containing detailed explanations and clear examples. **EACH "paragraph" TEXT BLOCK MUST BE A MINIMUM OF 150 WORDS LONG.**
3.  **FORMATTING CONSTRAINT:** DO NOT use bullet points, numbered lists, or short sentences within the 'text' fields. DO NOT summarize; elaborate fully.

Each object in the array MUST strictly adhere to this schema:
{
  "title": "string",
  "xp": 150,
  "estimatedMinutes": 15,
  "difficulty": "beginner",
  "tags": "string[]",
  "content": [
    { "type": "paragraph", "text": "This must be the primary, most robust explanation. Explain the core concept, its purpose, why it's important, and provide a strong real-world example. ENSURE THIS SECTION IS AT LEAST 150 WORDS LONG." },
    { "type": "key-concept", "text": "KEY CONCEPT: A precise, one-sentence definition of the main term." },
    { "type": "paragraph", "text": "This secondary paragraph must elaborate on the implications, common mistakes, or advanced usage of the key concept. Provide another, distinct example or analogy to solidify the student's understanding. ENSURE THIS SECTION IS AT LEAST 150 WORDS LONG." },
    { "type": "tip", "text": "PRO TIP: Offer specific, actionable, and practical advice related to the lesson content." },
    { "type": "paragraph", "text": "A concluding and synthesizing paragraph that ties the concepts together and prepares the student for the assessment section. This should also be a full paragraph, NOT a short summary. ENSURE THIS SECTION IS AT LEAST 150 WORDS LONG." }
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
      // 3. API Call using systemPrompt
      const { text } = await generateText({ model, prompt: systemPrompt, temperature: 0.4 });
      
      // 4. ROBUST JSON CLEANUP AND PARSING
      // Match the entire array structure to remove surrounding text/markdown fences (```json)
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/); 
    
      if (!jsonMatch || jsonMatch.length === 0) {
          throw new Error("AI output did not contain a recognizable JSON array.");
      }
      
      const clean = jsonMatch[0].trim();
      const lessons = JSON.parse(clean); 
      
      // Ensure the result is an array before processing
      if (!Array.isArray(lessons)) {
          throw new Error("Parsed JSON is not an array of lessons.");
      }

      // 5. Save to Firestore
      const batch = db.batch();
      const generatedLessons = [];

      for (const [index, lesson] of lessons.entries()) {
        const lessonRef = db.collection("lessons").doc();
        batch.set(lessonRef, {
          ...lesson,
          topicId,
          order: index + 1,
          createdAt: new Date(),
        });
        generatedLessons.push({ id: lessonRef.id, ...lesson });
      }

      await batch.commit();
      results[topic] = generatedLessons;
    } catch (error) {
      console.error(
        `Failed to generate lessons for topic "${topic}". Error:`,
        error
      );
      // If one topic fails, it doesn't block the rest, but logs the error
      results[topic] = []; 
    }
  }

  return c.json({ status: "ok", results });
});

export default generateRoutes;