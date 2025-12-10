import { Hono } from "hono";
import { db } from "../services/firebase";
import { Lesson, UserProfile } from "../types/models";
import { FieldValue } from "firebase-admin/firestore";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type AssessmentContext = {
  Variables: {
    user: { uid: string };
  };
};

const assessmentRoutes = new Hono<AssessmentContext>();

// POST /assessments/:lessonId/submit
assessmentRoutes.post("/:lessonId/submit", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { lessonId } = c.req.param();
    const { answers } = await c.req.json<{
      answers: { questionId: string; selectedOptionId: string }[];
    }>();

    if (!answers || !Array.isArray(answers)) {
      return c.json({ error: "Invalid submission format" }, 400);
    }

    // 1. Fetch Lesson Data
    const lessonRef = db.collection("lessons").doc(lessonId);
    const lessonDoc = await lessonRef.get();
    if (!lessonDoc.exists) {
      return c.json({ error: "Lesson not found" }, 404);
    }
    const lesson = lessonDoc.data() as Lesson;
    const { questions, passingScore } = lesson.assessment;

    // 2. Grading Logic
    let correctAnswers = 0;
    const weakTags = new Set<string>();
    const answerMap = new Map(questions.map((q) => [q.id, q]));

    answers.forEach((userAnswer) => {
      const question = answerMap.get(userAnswer.questionId);
      if (question) {
        if (question.correctAnswerId === userAnswer.selectedOptionId) {
          correctAnswers++;
        } else {
          // Collect tags for concepts the user missed
          question.tags?.forEach((tag) => weakTags.add(tag));
        }
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= passingScore;

    // 3. Record Attempt in User History
    const progressRef = db
      .collection("userProgress")
      .doc(`${user.uid}_${lessonId}`);
      
    await progressRef.set(
      {
        userId: user.uid,
        lessonId: lessonId,
        score: score,
        status: passed ? "completed" : "requires_review",
        quizAttempts: FieldValue.arrayUnion({
          timestamp: new Date(),
          score,
          answers,
        }),
      },
      { merge: true }
    );

    // 4. Handle PASS: Unlock Next Lesson & Grant XP
    if (passed) {
      let xpAwarded = 0;
      const userProfileRef = db.collection("userProfiles").doc(user.uid);

      await db.runTransaction(async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        const profile = profileDoc.exists
          ? (profileDoc.data() as UserProfile)
          : null;

        // Streak Logic
        const today = new Date().toISOString().split("T")[0];
        const lastActivity = profile?.lastActivityDate;
        let newStreak = 1;

        if (lastActivity) {
           // Simple date diff logic could go here. 
           // For MVP: if last activity is not today, increment streak.
           if (lastActivity === today) {
             newStreak = profile?.currentStreak || 1;
           } else {
             newStreak = (profile?.currentStreak || 0) + 1;
           }
        }

        // XP Logic (only for first completion)
        const isFirstCompletion = !profile?.completedLessons?.includes(lessonId);
        if (isFirstCompletion) {
          xpAwarded = lesson.xp;
        }

        // Database Update
        if (!profile) {
          transaction.set(userProfileRef, {
            userId: user.uid,
            totalXp: xpAwarded,
            completedLessons: [lessonId],
            currentStreak: newStreak,
            lastActivityDate: today,
          });
        } else {
          const updateData: any = {
            totalXp: FieldValue.increment(xpAwarded),
            currentStreak: newStreak,
            lastActivityDate: today,
          };
          if (isFirstCompletion) {
            updateData.completedLessons = FieldValue.arrayUnion(lessonId);
          }
          transaction.update(userProfileRef, updateData);
        }
      });

      // Find Next Lesson ID
      const nextLessonSnapshot = await db
        .collection("lessons")
        .where("topicId", "==", lesson.topicId)
        .where("order", ">", lesson.order) // Get higher order
        .orderBy("order", "asc")
        .limit(1)
        .get();
        
      const nextLessonId = nextLessonSnapshot.empty
        ? null
        : nextLessonSnapshot.docs[0].id;

      return c.json({
        status: "passed",
        score: score,
        xpEarned: xpAwarded,
        nextLessonId: nextLessonId,
      });
    } 
    
    // 5. Handle FAIL: Mandatory AI Remedial Generation
    else {
      let remedialLesson = null;
      
      // If we identified specific weak concepts, ask AI to explain them
      if (weakTags.size > 0) {
        const failedConcepts = Array.from(weakTags).join(", ");
        
        const prompt = `
          The user failed a quiz on these concepts: "${failedConcepts}". 
          Generate ONE short, remedial lesson object.
          Strictly output VALID JSON only. No markdown.
          Schema:
          {
            "id": "remedial-${Date.now()}",
            "title": "Review: ${failedConcepts}",
            "estimatedMinutes": 3,
            "difficulty": "easy",
            "content": [
              { "type": "info", "text": "Clear explanation of the concept." },
              { "type": "scenario", "text": "Real world example." },
              { "type": "info", "text": "Summary tip." }
            ],
            "assessment": {
               "passingScore": 100,
               "questions": [] 
            }
          }
        `;

        try {
          const model = google("gemini-2.5-flash");
          const { text } = await generateText({ model, prompt });
          
          // Robust JSON parsing to handle potential markdown fencing
          const cleanJson = text.replace(/```json|```/g, "").trim();
          remedialLesson = JSON.parse(cleanJson);
          
        } catch (aiError) {
          console.error("AI Generation failed:", aiError);
          // Fallback content if AI service is down
          remedialLesson = {
            title: "Review Required",
            content: [
              { type: "info", text: "You missed questions related to: " + failedConcepts },
              { type: "info", text: "Please review the previous lesson material carefully." }
            ]
          };
        }
      }

      return c.json({
        status: "requires_review",
        score: score,
        remedialLesson: remedialLesson,
      });
    }
  } catch (error) {
    console.error("Error submitting assessment:", error);
    return c.json({ error: "An internal error occurred" }, 500);
  }
});

export default assessmentRoutes;