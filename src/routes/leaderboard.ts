import { Hono } from "hono";
import { db } from "../services/firebase";
// Import types if you want strict typing, otherwise 'any' works for quick fixes
import { QueryDocumentSnapshot } from "firebase-admin/firestore"; 

const leaderboardRoutes = new Hono();

leaderboardRoutes.get("/", async (c) => {
  try {
    const limit = 20;
    
    // 1. Get Top Profiles
    const profilesSnapshot = await db
      .collection("userProfiles")
      .orderBy("totalXp", "desc")
      .limit(limit)
      .get();

    if (profilesSnapshot.empty) return c.json([]);

    // 2. Get User IDs to fetch names
    // FIX: Add type for 'doc'
    const leaderboardData = profilesSnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      uid: doc.id,
      ...doc.data()
    }));

    // 3. Fetch names for these users (Parallel fetch)
    const enrichedLeaderboard = await Promise.all(
      // FIX: Add type for 'index'
      leaderboardData.map(async (entry: any, index: number) => {
        const userDoc = await db.collection("users").doc(entry.uid).get();
        const userData = userDoc.data();
        return {
          rank: index + 1,
          uid: entry.uid,
          xp: entry.totalXp,
          name: userData?.name || `User ${entry.uid.substring(0, 4)}`
        };
      })
    );

    return c.json(enrichedLeaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default leaderboardRoutes;