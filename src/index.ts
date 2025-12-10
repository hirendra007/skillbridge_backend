import { Hono } from "hono";
import { auth as adminAuth } from "./services/firebase";
import { type DecodedIdToken } from "firebase-admin/auth";
import { serve } from "bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Route Imports
import topicsRoutes from "./routes/topics";
import lessonsRoutes from "./routes/lessons"; // The List
import lessonRoute from "./routes/lesson";   // The Single Item
import assessmentRoutes from "./routes/assessments";
import userProfileRoutes from "./routes/userProfile";
import leaderboardRoutes from "./routes/leaderboard";
import authRoutes from "./routes/auth";
import communityRoutes from "./routes/community";
import mentorshipRoutes from "./routes/mentorship";
import contentRoutes from "./routes/content";
import chatRoutes from "./routes/chat";
import generateRoutes from "./routes/generateLessons";

const app = new Hono<{ Variables: { user: DecodedIdToken } }>();
app.use("*", logger());
app.use(cors());

// Auth Middleware
app.use("*", async (c, next) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader) return c.json({ error: "unauthorized" }, 401);
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    c.set("user", decoded);
    await next();
  } catch {
    return c.json({ error: "invalid token" }, 401);
  }
});

// Mount Routes
app.route("/topics", topicsRoutes);
app.route("/lessons", lessonsRoutes); // Plural: List
app.route("/lesson", lessonRoute);    // Singular: Detail
app.route("/assessments", assessmentRoutes);
app.route("/user-profile", userProfileRoutes);
app.route("/leaderboard", leaderboardRoutes);
app.route("/auth", authRoutes); // Ensure auth/sync is registered
app.route("/community", communityRoutes);
app.route("/mentorship", mentorshipRoutes);
app.route("/content", contentRoutes);
app.route("/chat", chatRoutes);
app.route("/generate-lessons", generateRoutes);

serve({
  fetch: app.fetch,
  port: process.env.PORT || 3000,
});