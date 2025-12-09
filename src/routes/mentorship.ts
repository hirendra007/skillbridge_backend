import { Hono } from "hono";
import { db } from "../services/firebase";
import { FieldValue } from "firebase-admin/firestore";

const mentorshipRoutes = new Hono<{ Variables: { user: any } }>();

// GET /mentorship/list/:topicId
// Find mentors for a specific topic
mentorshipRoutes.get("/list/:topicId", async (c) => {
  const { topicId } = c.req.param();
  try {
    const snapshot = await db.collection("users") // Or "userProfiles" if merged
      .where("isMentor", "==", true)
      .where("mentorTopics", "array-contains", topicId)
      .get();

    const mentors = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        uid: doc.id,
        name: d.name,
        bio: d.mentorBio || "Passionate educator.",
        rating: d.mentorRating || 5.0,
        hourlyRate: d.mentorHourlyRate || 0
      };
    });

    return c.json(mentors);
  } catch (error) {
    return c.json({ error: "Failed to fetch mentors" }, 500);
  }
});

// POST /mentorship/request
// Student sends a request
mentorshipRoutes.post("/request", async (c) => {
  const user = c.get("user");
  const { mentorId, topicId, topicName, message } = await c.req.json();

  if (!mentorId || !topicId) return c.json({ error: "Missing fields" }, 400);

  try {
    // Ideally fetch user name from DB if not in token, for now assume token or default
    const studentName = user.name || user.email || "Student"; 

    const newRequest = {
      studentId: user.uid,
      studentName,
      mentorId,
      topicId,
      topicName,
      message,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp()
    };

    await db.collection("mentorshipRequests").add(newRequest);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to send request" }, 500);
  }
});

// GET /mentorship/dashboard
// Mentor views their incoming requests
mentorshipRoutes.get("/dashboard", async (c) => {
  const user = c.get("user");
  try {
    const snapshot = await db.collection("mentorshipRequests")
      .where("mentorId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return c.json(requests);
  } catch (error) {
    // Note: You might need a composite index for mentorId + createdAt
    console.error(error); 
    return c.json({ error: "Failed to fetch dashboard" }, 500);
  }
});

// PUT /mentorship/request/:requestId
// Mentor accepts/rejects
mentorshipRoutes.put("/request/:requestId", async (c) => {
  const { requestId } = c.req.param();
  const { status } = await c.req.json(); // 'accepted' or 'rejected'

  try {
    await db.collection("mentorshipRequests").doc(requestId).update({ status });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Update failed" }, 500);
  }
});

// POST /mentorship/apply
// User applies to become a mentor (Path A or Path B)
mentorshipRoutes.post("/apply", async (c) => {
  const user = c.get("user");
  const { bio, topics, method } = await c.req.json(); // method: 'grind' or 'certificate'

  try {
    // In a real app, 'certificate' would go to a moderation queue.
    // For this MVP, we auto-approve 'grind' if logic checks out, or auto-approve all for ease of testing.
    
    await db.collection("users").doc(user.uid).set({
      isMentor: true,
      mentorBio: bio,
      mentorTopics: topics, // e.g. ['finance']
      mentorRating: 5.0,
      mentorHourlyRate: 20 // Default
    }, { merge: true });

    // Also sync to userProfile for easier frontend checks
    await db.collection("userProfiles").doc(user.uid).set({
      isMentor: true
    }, { merge: true });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Application failed" }, 500);
  }
});

// GET /mentorship/requests/sent
// Student views their own outgoing requests
mentorshipRoutes.get("/requests/sent", async (c) => {
  const user = c.get("user");
  try {
    const snapshot = await db.collection("mentorshipRequests")
      .where("studentId", "==", user.uid)
      .get(); // Note: Add .orderBy("createdAt", "desc") if you create the index

    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Manual sort to avoid index errors for now
    requests.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
    });

    return c.json(requests);
  } catch (error) {
    return c.json({ error: "Failed to fetch requests" }, 500);
  }
});

export default mentorshipRoutes;