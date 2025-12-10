// server/src/seed.ts

import { db } from "./services/firebase";
import { Timestamp } from "firebase-admin/firestore";

// --- Simplified type for seeding ONLY topics ---
type SeedTopic = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

// --- DATA: 11 Core Topics (Lessons REMOVED) ---
const topicsData: SeedTopic[] = [
  {
    id: "lifeskills",
    name: "Life Skills",
    description: "Essential soft skills for personal growth and daily success.",
    tags: ["lifestyle", "self-improvement", "productivity"],
  },
  {
    id: "finance",
    name: "Personal Finance",
    description: "Master budgeting, investing, and wealth management.",
    tags: ["finance", "money", "investing"],
  },
  {
    id: "coding",
    name: "Web Development",
    description: "Learn HTML, CSS, and JavaScript from scratch.",
    tags: ["coding", "programming", "tech"],
  },
  {
    id: "design",
    name: "Graphic Design",
    description: "Understand color theory, typography, and layout.",
    tags: ["design", "art", "creative"],
  },
  {
    id: "marketing",
    name: "Digital Marketing",
    description: "Grow brands using SEO, social media, and ads.",
    tags: ["marketing", "business", "social"],
  },
  {
    id: "business",
    name: "Startup Business",
    description: "From idea to IPO. Build a company.",
    tags: ["business", "entrepreneurship", "startup"],
  },
  {
    id: "fitness",
    name: "Fitness & Health",
    description: "Training, nutrition, and wellness guides.",
    tags: ["fitness", "health", "lifestyle"],
  },
  {
    id: "datascience",
    name: "Data Science",
    description: "Analyze data using Python and Statistics.",
    tags: ["data", "coding", "math"],
  },
  {
    id: "speaking",
    name: "Public Speaking",
    description: "Conquer stage fright and speak with confidence.",
    tags: ["soft skills", "communication", "career"],
  },
  {
    id: "photography",
    name: "Photography",
    description: "Capture the world with better composition.",
    tags: ["art", "creative", "hobby"],
  },
  {
    id: "cyber",
    name: "Cyber Security",
    description: "Protect systems and networks from attacks.",
    tags: ["tech", "coding", "security"],
  }
];

async function seedDatabase() {
  console.log("🌱 Starting Core Topics Seed...");
  
  const batch = db.batch();
  let opCount = 0;

  for (const topic of topicsData) {
    // 1. Create Topic document
    const topicRef = db.collection("topics").doc(topic.id);
    batch.set(topicRef, {
      name: topic.name,
      description: topic.description,
      tags: topic.tags,
      createdAt: Timestamp.now()
    });
    opCount++;
  }

  // 2. Commit
  try {
    console.log(`📦 Committing ${opCount} topic operations...`);
    await batch.commit();
    console.log("✅ Core Topics Seeded Successfully! (Lessons will be generated on demand)");
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
  }
}

seedDatabase();