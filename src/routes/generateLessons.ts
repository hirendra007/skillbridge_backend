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

 const model = google("gemini-2.5-flash");
 const results: Record<string, any[]> = {};

 for (const topic of topics) {
  let topicId: string;
  let topicDescription: string | undefined;

  try {
   // 1. Check if Topic exists and get its ID
   const topicRef = await db
    .collection("topics")
    .where("name", "==", topic)
    .limit(1)
    .get();
   
   if (!topicRef.empty) {
    topicId = topicRef.docs[0].id;
    topicDescription = topicRef.docs[0].data().description;
   } else {
    // 1a. If topic does not exist, GENERATE A DESCRIPTION first
    console.log(`Topic "${topic}" not found. Generating description...`);
    const descPrompt = `Provide a concise (max 2 sentences) description for the topic: "${topic}". Respond ONLY with the text description.`;
    const { text: descriptionText } = await generateText({ model, prompt: descPrompt });
    topicDescription = descriptionText.trim().replace(/['"“”]/g, ''); // Basic cleanup

    // 1b. Create the new topic document with the description
    const doc = await db.collection("topics").add({ 
     name: topic, 
     description: topicDescription, // <-- Storing the description
     createdAt: new Date() 
    });
    topicId = doc.id;
   }

   // 2. Generate and save lessons (1 easy, 1 medium, 1 hard)
   const generatedLessons = [];
   const batch = db.batch();
   let lessonOrder = 1; // Counter to ensure lessons are ordered sequentially (1-3)

   for (const difficulty of DIFFICULTIES) {
    
    // Define dynamic XP and estimated time based on difficulty
    const xp = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 150;
    const estimatedMinutes = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15;

    // 3. Define the dynamic system prompt (1 lesson, with 'proTip' field)
    const systemPrompt = `You are an expert instructional designer. For the topic "${topic}", generate a JSON array of **1 unique, ${difficulty}**-level lesson. Respond ONLY with a raw JSON array. The 'difficulty' field in the schema MUST be set to '${difficulty}'.

Each object in the array must match this schema:
{
 "title": "string",
 "xp": ${xp},
 "estimatedMinutes": ${estimatedMinutes},
 "difficulty": "${difficulty}",
 "tags": "string[]",
  "proTip": "string (A single, one-line, valuable tip related to the lesson)", // <--- THE NEW REQUIRED FIELD
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

    // 4. API Call
    const { text } = await generateText({ model, prompt: systemPrompt, temperature: 0.4 });
    
    // 5. JSON Parsing
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/); 
   
    if (!jsonMatch || jsonMatch.length === 0) {
      throw new Error(`AI output for ${topic} (${difficulty}) did not contain a recognizable JSON array.`);
    }
    
    const clean = jsonMatch[0].trim();
    const lessons = JSON.parse(clean); 
    
    if (!Array.isArray(lessons) || lessons.length !== 1) {
      throw new Error(`Parsed JSON for ${topic} (${difficulty}) did not contain exactly 1 lesson.`);
    }

    // 6. Add the single lesson to the Firestore Batch
    const lesson = lessons[0];
    const lessonRef = db.collection("lessons").doc();
    batch.set(lessonRef, {
     ...lesson,
     topicId,
     order: lessonOrder++, // Incrementing order (1, 2, 3)
     createdAt: new Date(),
    });
    generatedLessons.push({ id: lessonRef.id, ...lesson });

   } // End of difficulty loop

   // 7. Commit the batch for all 3 lessons of the current topic
   await batch.commit();
   results[topic] = generatedLessons;

  } catch (error) {
   console.error(
    `Failed to process topic "${topic}". Error:`,
    error
   );
   results[topic] = []; 
  }
 }

 return c.json({ status: "ok", results });
});

export default generateRoutes;