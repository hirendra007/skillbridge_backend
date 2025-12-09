import { Hono } from "hono";
import { db } from "../services/firebase";
import { FieldValue } from "firebase-admin/firestore";

const authRoutes = new Hono<{ Variables: { user: any } }>();

// POST /auth/sync - Called after user logs in on frontend to save/update basic user data
authRoutes.post("/sync", async (c) => {
  const user = c.get("user"); // Verified by middleware
  const { email, displayName, photoURL } = await c.req.json();

  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const userRef = db.collection("users").doc(user.uid);
    await userRef.set({
      email,
      name: displayName,
      photoURL,
      lastSeenAt: FieldValue.serverTimestamp(),
      // We use set with merge, so we don't overwrite existing data like 'createdAt' if it exists
    }, { merge: true });

    // Ensure createdAt exists if it's a new user
    const docSnap = await userRef.get();
    if (!docSnap.data()?.createdAt) {
      await userRef.update({ createdAt: FieldValue.serverTimestamp() });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Sync error:", error);
    return c.json({ error: "Failed to sync user" }, 500);
  }
});

export default authRoutes;