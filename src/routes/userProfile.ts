import { Hono } from "hono";
import { db } from "../services/firebase";
import { UserProfile } from "../types/models";

const userProfileRoutes = new Hono<{ Variables: { user: any } }>();

userProfileRoutes.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const profileDoc = await db.collection("userProfiles").doc(user.uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};
    
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const fullProfile: UserProfile = {
      userId: user.uid,
      totalXp: profileData?.totalXp || 0,
      completedLessons: profileData?.completedLessons || [],
      currentStreak: profileData?.currentStreak || 0,
      lastActivityDate: profileData?.lastActivityDate || "",
      name: userData?.name || "Learner",
      email: userData?.email,
      interests: userData?.interests || [],
      // FIX: Include isMentor field
      isMentor: userData?.isMentor || false,
      // Optional fields can be undefined if not present
      mentorTopics: userData?.mentorTopics,
      mentorBio: userData?.mentorBio,
      mentorRating: userData?.mentorRating,
      mentorHourlyRate: userData?.mentorHourlyRate
    };

    return c.json(fullProfile);
  } catch (error) {
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

userProfileRoutes.put("/", async (c) => {
  const user = c.get("user");
  const { name, interests } = await c.req.json();

  try {
    const updates: any = {};
    if (name) updates.name = name;
    if (interests) updates.interests = interests;

    await db.collection("users").doc(user.uid).set(updates, { merge: true });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

export default userProfileRoutes;