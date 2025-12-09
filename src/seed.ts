import { db } from "./services/firebase";
import { Timestamp } from "firebase-admin/firestore";

// --- Types for Seeding ---
type SeedLesson = {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  xp: number;
  minutes: number;
  content: string; // Simplified content text
  quizQuestion: string;
  quizOptions: string[];
  correctIndex: number; // 0, 1, 2
};

type SeedTopic = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  lessons: SeedLesson[];
};

// --- DATA: 10 Topics with 3-4 Lessons Each ---
const topicsData: SeedTopic[] = [
    {
    id: "lifeskills",
    name: "Life Skills",
    description: "Essential soft skills for personal growth and daily success.",
    tags: ["lifestyle", "self-improvement", "productivity"],
    lessons: [
      { 
        title: "Time Management", 
        difficulty: "easy", 
        xp: 100, 
        minutes: 5, 
        content: "The Pomodoro technique involves working for 25 minutes, then taking a 5-minute break. This keeps your brain fresh and focused.", 
        quizQuestion: "How long is a standard Pomodoro work interval?", 
        quizOptions: ["25 minutes", "60 minutes", "10 minutes"], 
        correctIndex: 0 
      },
      { 
        title: "Active Listening", 
        difficulty: "medium", 
        xp: 150, 
        minutes: 10, 
        content: "Active listening isn't just hearing; it's reflecting back what the other person said to ensure understanding. Don't listen just to reply.", 
        quizQuestion: "What is the goal of active listening?", 
        quizOptions: ["To interrupt", "To understand", "To win the argument"], 
        correctIndex: 1 
      },
      { 
        title: "Conflict Resolution", 
        difficulty: "hard", 
        xp: 300, 
        minutes: 15, 
        content: "Use 'I' statements (e.g., 'I feel hurt when...') instead of 'You' statements ('You always...'). This expresses needs without making the other person defensive.", 
        quizQuestion: "Which statements reduce defensiveness?", 
        quizOptions: ["'You' statements", "'I' statements", "'They' statements"], 
        correctIndex: 1 
      },
    ]
  },
  {
    id: "finance",
    name: "Personal Finance",
    description: "Master budgeting, investing, and wealth management.",
    tags: ["finance", "money", "investing"],
    lessons: [
      { title: "Budgeting 101", difficulty: "easy", xp: 100, minutes: 5, content: "Rule 50/30/20 helps organize income.", quizQuestion: "What is the 50/30/20 rule for?", quizOptions: ["Budgeting", "Cooking", "Driving"], correctIndex: 0 },
      { title: "Intro to Investing", difficulty: "medium", xp: 150, minutes: 10, content: "Compound interest is the 8th wonder of the world.", quizQuestion: "What helps money grow over time?", quizOptions: ["Inflation", "Compound Interest", "Spending"], correctIndex: 1 },
      { title: "Tax Strategies", difficulty: "hard", xp: 300, minutes: 15, content: "Understanding tax brackets saves money.", quizQuestion: "Are tax brackets marginal?", quizOptions: ["Yes", "No", "Maybe"], correctIndex: 0 },
    ]
  },
  {
    id: "coding",
    name: "Web Development",
    description: "Learn HTML, CSS, and JavaScript from scratch.",
    tags: ["coding", "programming", "tech"],
    lessons: [
      { title: "HTML Basics", difficulty: "easy", xp: 100, minutes: 5, content: "HTML provides the structure of a webpage.", quizQuestion: "What does HTML stand for?", quizOptions: ["HyperText Markup Language", "HighText Machine Learning", "HyperTool Multi Language"], correctIndex: 0 },
      { title: "CSS Styling", difficulty: "medium", xp: 150, minutes: 10, content: "CSS controls colors, fonts, and layout.", quizQuestion: "Which property changes text color?", quizOptions: ["font-style", "color", "text-align"], correctIndex: 1 },
      { title: "JavaScript Logic", difficulty: "hard", xp: 300, minutes: 15, content: "JS adds interactivity to pages.", quizQuestion: "Which symbol assigns a value?", quizOptions: ["==", "===", "="], correctIndex: 2 },
      { title: "React Fundamentals", difficulty: "hard", xp: 500, minutes: 20, content: "React uses components to build UI.", quizQuestion: "What is a component?", quizOptions: ["A database", "A UI building block", "A server"], correctIndex: 1 },
    ]
  },
  {
    id: "design",
    name: "Graphic Design",
    description: "Understand color theory, typography, and layout.",
    tags: ["design", "art", "creative"],
    lessons: [
      { title: "Color Theory", difficulty: "easy", xp: 100, minutes: 5, content: "Complementary colors sit opposite on the wheel.", quizQuestion: "Which colors are complementary?", quizOptions: ["Red & Green", "Blue & Blue", "White & Black"], correctIndex: 0 },
      { title: "Typography Basics", difficulty: "medium", xp: 150, minutes: 8, content: "Serif fonts have feet; Sans-serif do not.", quizQuestion: "Which font type has 'feet'?", quizOptions: ["Sans-serif", "Serif", "Mono"], correctIndex: 1 },
      { title: "User Interface (UI)", difficulty: "hard", xp: 300, minutes: 12, content: "Good UI guides the user's eye.", quizQuestion: "What is the goal of UI?", quizOptions: ["Confusion", "Clarity", "Complexity"], correctIndex: 1 },
    ]
  },
  {
    id: "marketing",
    name: "Digital Marketing",
    description: "Grow brands using SEO, social media, and ads.",
    tags: ["marketing", "business", "social"],
    lessons: [
      { title: "What is SEO?", difficulty: "easy", xp: 100, minutes: 5, content: "Search Engine Optimization improves visibility.", quizQuestion: "What does SEO target?", quizOptions: ["Email", "Search Engines", "Billboards"], correctIndex: 1 },
      { title: "Social Media Strategy", difficulty: "medium", xp: 150, minutes: 10, content: "Consistency is key in social growth.", quizQuestion: "What is most important?", quizOptions: ["Posting once a year", "Consistency", "Using no hashtags"], correctIndex: 1 },
      { title: "Paid Ads & ROI", difficulty: "hard", xp: 300, minutes: 15, content: "ROI measures the profit from ads.", quizQuestion: "What does ROI stand for?", quizOptions: ["Return On Investment", "Rate Of Interest", "Risk Of Inflation"], correctIndex: 0 },
    ]
  },
  {
    id: "business",
    name: "Startup Business",
    description: "From idea to IPO. Build a company.",
    tags: ["business", "entrepreneurship", "startup"],
    lessons: [
      { title: "Finding a Niche", difficulty: "easy", xp: 100, minutes: 5, content: "Solve a specific problem for a specific group.", quizQuestion: "A niche should be...", quizOptions: ["Broad", "Specific", "Random"], correctIndex: 1 },
      { title: "MVP Development", difficulty: "medium", xp: 150, minutes: 10, content: "Minimum Viable Product tests your idea fast.", quizQuestion: "What is an MVP?", quizOptions: ["Most Valuable Player", "Minimum Viable Product", "Maximum Visual Polish"], correctIndex: 1 },
      { title: "Pitching Investors", difficulty: "hard", xp: 300, minutes: 15, content: "A pitch deck tells your story.", quizQuestion: "What is a pitch deck?", quizOptions: ["A slide presentation", "A baseball field", "A contract"], correctIndex: 0 },
    ]
  },
  {
    id: "fitness",
    name: "Fitness & Health",
    description: "Training, nutrition, and wellness guides.",
    tags: ["fitness", "health", "lifestyle"],
    lessons: [
      { title: "Importance of Water", difficulty: "easy", xp: 100, minutes: 3, content: "Hydration keeps your body functioning.", quizQuestion: "How much of the body is water?", quizOptions: ["~10%", "~60%", "~90%"], correctIndex: 1 },
      { title: "Strength Training", difficulty: "medium", xp: 150, minutes: 10, content: "Resistance builds muscle density.", quizQuestion: "What builds muscle?", quizOptions: ["Cardio", "Resistance", "Sleeping"], correctIndex: 1 },
      { title: "Macro Nutrition", difficulty: "hard", xp: 300, minutes: 15, content: "Protein, Carbs, and Fats are macros.", quizQuestion: "Which is a macro?", quizOptions: ["Vitamin C", "Protein", "Iron"], correctIndex: 1 },
    ]
  },
  {
    id: "datascience",
    name: "Data Science",
    description: "Analyze data using Python and Statistics.",
    tags: ["data", "coding", "math"],
    lessons: [
      { title: "Data Types", difficulty: "easy", xp: 100, minutes: 5, content: "Integers are whole numbers.", quizQuestion: "What is an Integer?", quizOptions: ["Text", "Whole Number", "Decimal"], correctIndex: 1 },
      { title: "Python for Data", difficulty: "medium", xp: 150, minutes: 12, content: "Pandas is a library for data manipulation.", quizQuestion: "What library handles dataframes?", quizOptions: ["Pandas", "Bears", "Tigers"], correctIndex: 0 },
      { title: "Machine Learning Intro", difficulty: "hard", xp: 300, minutes: 15, content: "ML algorithms learn from data.", quizQuestion: "ML stands for...", quizOptions: ["Machine Learning", "Maker Language", "Main Loop"], correctIndex: 0 },
    ]
  },
  {
    id: "speaking",
    name: "Public Speaking",
    description: "Conquer stage fright and speak with confidence.",
    tags: ["soft skills", "communication", "career"],
    lessons: [
      { title: "Overcoming Fear", difficulty: "easy", xp: 100, minutes: 5, content: "Deep breathing calms nerves.", quizQuestion: "What helps with nerves?", quizOptions: ["Caffeine", "Breathing", "Running away"], correctIndex: 1 },
      { title: "Structuring a Speech", difficulty: "medium", xp: 150, minutes: 10, content: "Start with a hook, body, then conclusion.", quizQuestion: "What comes first?", quizOptions: ["Conclusion", "Body", "Hook"], correctIndex: 2 },
      { title: "Body Language", difficulty: "hard", xp: 300, minutes: 12, content: "Open posture builds trust.", quizQuestion: "Crossed arms usually mean...", quizOptions: ["Openness", "Defensiveness", "Happiness"], correctIndex: 1 },
    ]
  },
  {
    id: "photography",
    name: "Photography",
    description: "Capture the world with better composition.",
    tags: ["art", "creative", "hobby"],
    lessons: [
      { title: "Rule of Thirds", difficulty: "easy", xp: 100, minutes: 5, content: "Place subjects on grid lines.", quizQuestion: "The grid divides the image into...", quizOptions: ["2 parts", "9 parts", "4 parts"], correctIndex: 1 },
      { title: "Lighting Basics", difficulty: "medium", xp: 150, minutes: 8, content: "Golden hour provides soft light.", quizQuestion: "When is Golden Hour?", quizOptions: ["Noon", "Sunrise/Sunset", "Midnight"], correctIndex: 1 },
      { title: "Manual Mode: ISO", difficulty: "hard", xp: 300, minutes: 15, content: "High ISO adds noise.", quizQuestion: "High ISO results in...", quizOptions: ["Grain/Noise", "Blur", "Darkness"], correctIndex: 0 },
    ]
  },
  {
    id: "cyber",
    name: "Cyber Security",
    description: "Protect systems and networks from attacks.",
    tags: ["tech", "coding", "security"],
    lessons: [
      { title: "Password Security", difficulty: "easy", xp: 100, minutes: 5, content: "Use long, complex passwords.", quizQuestion: "A good password is...", quizOptions: ["12345", "password", "Xy9#mP2!qL"], correctIndex: 2 },
      { title: "Phishing Attacks", difficulty: "medium", xp: 150, minutes: 10, content: "Fake emails stealing data.", quizQuestion: "What is Phishing?", quizOptions: ["Fishing sport", "Email scam", "Network speed"], correctIndex: 1 },
      { title: "Encryption", difficulty: "hard", xp: 300, minutes: 15, content: "Scrambling data to hide it.", quizQuestion: "Encryption makes data...", quizOptions: ["Readable", "Unreadable", "Deleted"], correctIndex: 1 },
    ]
  }
];

async function seedDatabase() {
  console.log("🌱 Starting Massive Database Seed...");
  
  const batch = db.batch();
  let opCount = 0;

  for (const topic of topicsData) {
    // 1. Create Topic
    const topicRef = db.collection("topics").doc(topic.id);
    batch.set(topicRef, {
      name: topic.name,
      description: topic.description,
      tags: topic.tags
    });
    opCount++;

    // 2. Create Lessons for Topic
    topic.lessons.forEach((lesson, index) => {
      const lessonId = `${topic.id}-L${index + 1}`; // e.g., finance-L1
      const lessonRef = db.collection("lessons").doc(lessonId);
      
      const lessonData = {
        topicId: topic.id,
        title: lesson.title,
        xp: lesson.xp,
        estimatedMinutes: lesson.minutes,
        difficulty: lesson.difficulty,
        order: index + 1, // 1, 2, 3...
        tags: topic.tags,
        content: [
          { type: "paragraph", text: lesson.content },
          { type: "info", text: "Pro Tip: Review this concept daily." }
        ],
        assessment: {
          passingScore: 50,
          questions: [
            {
              id: `q-${lessonId}`,
              questionText: lesson.quizQuestion,
              quizType: "multiple-choice",
              tags: topic.tags,
              options: lesson.quizOptions.map((text, i) => ({
                id: String.fromCharCode(97 + i), // 'a', 'b', 'c'
                text
              })),
              correctAnswerId: String.fromCharCode(97 + lesson.correctIndex),
              explanation: "Review the lesson content for details."
            }
          ]
        },
        createdAt: Timestamp.now()
      };

      batch.set(lessonRef, lessonData);
      opCount++;
    });
  }

  // 3. Commit
  try {
    console.log(`📦 Committing ${opCount} operations...`);
    await batch.commit();
    console.log("✅ Database Seeded Successfully!");
    console.log("👉 10 Topics and ~33 Lessons created.");
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
  }
}

seedDatabase();