import { Hono } from "hono";
import { db } from "../services/firebase";
import { FieldValue } from "firebase-admin/firestore";

const authRoutes = new Hono<{ Variables: { user: any } }>();

authRoutes.post("/sync", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const { email, displayName, photoURL } = await c.req.json();

  try {
    const userRef = db.collection("users").doc(user.uid);
    
    // Create/Update basic info
    await userRef.set({
      email,
      name: displayName,
      photoURL,
      lastSeenAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Initialize profile defaults if new
    const snapshot = await userRef.get();
    if (!snapshot.exists || !snapshot.data()?.createdAt) {
      await userRef.update({ 
        createdAt: FieldValue.serverTimestamp(),
        interests: [] // Default empty interests
      });
      
      // Also init userProfile stats if missing
      const statsRef = db.collection("userProfiles").doc(user.uid);
      const statsSnap = await statsRef.get();
      if(!statsSnap.exists) {
         await statsRef.set({
            userId: user.uid,
            totalXp: 0,
            completedLessons: [],
            currentStreak: 0,
            lastActivityDate: ""
         });
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Auth sync error:", error);
    return c.json({ error: "Failed to sync user" }, 500);
  }
});

export default authRoutes;