import { Hono } from "hono";
import { db } from "../services/firebase";

const userProfileRoutes = new Hono<{ Variables: { user: any } }>();

// GET /user-profile
userProfileRoutes.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    // 1. Fetch User Profile Stats
    const profileDoc = await db.collection("userProfiles").doc(user.uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};

    // 2. Fetch User Name/Basic Info from 'users' collection
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // 3. Merge and Return
    return c.json({
      userId: user.uid,
      totalXp: profileData?.totalXp || 0,
      completedLessons: profileData?.completedLessons || [],
      currentStreak: profileData?.currentStreak || 0,
      lastActivityDate: profileData?.lastActivityDate || null,
      name: userData?.name || "Learner", // Backend now provides the name!
      email: userData?.email,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// PUT /user-profile - Update name
userProfileRoutes.put("/", async (c) => {
  const user = c.get("user");
  const { name } = await c.req.json();

  if (!name) return c.json({ error: "Name is required" }, 400);

  try {
    // Update the 'users' collection where name is stored
    await db.collection("users").doc(user.uid).set({ name }, { merge: true });
    return c.json({ success: true, name });
  } catch (error) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

export default userProfileRoutes;